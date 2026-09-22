import { isWithinFinalRetention, leagueConfigMap, pollLookaheadDays, pollMinEagerMs, resolveLeagueLogoUrl, upcomingGamesDaysMax } from './constants';
import { parseClockToSeconds } from './gameClock';
import { gradePostseason } from './postseasonRound';
import {
	EspnSummarySchema,
	parseScoreboard,
	parseTeams,
} from './espnSchemas';
import type {
	EspnCompetition,
	EspnCompetitor,
	EspnEvent,
	EspnProbable,
	EspnOddsProvider,
	EspnScoreboardResponse,
	EspnSituation,
	EspnSituationPlayer,
	EspnVenueAddress,
} from './espnSchemas';
import { logWarn } from './logger';
import type { AtBat, AtBatPlayer, Game, GameCondition, GameOdds, LeagueConfig, LeagueId, LeagueLogoMap, ProbableStarter, TeamLeader, TeamMonoLogoMap, TeamMonoMarks } from './types';

const espnBase = 'https://site.api.espn.com/apis/site/v2/sports';

/* ESPN sheds load on this host by recent request volume from an IP and answers 403 to whatever it
   drops. Measured from one machine against the NBA scoreboard: 16 requests at once all came back
   200, 24 at once lost four of them, and the same size passed cleanly a minute later — so the window
   is recent volume rather than instantaneous concurrency, and a burst that got through once is no
   guarantee.

   Thirty-one leagues fanned out at once is past it on its own. What made that hard to see is that
   every caller below collects with `allSettled` and keeps the fulfilled ones: a shed league
   contributes nothing and says nothing, so the only symptom is a slate that comes back short — or,
   with enough of them shed, the empty-state screen on a day full of sport.

   Six at a time. A league's own days are pooled again inside that — see `espnDayPoolSize`, which is
   what actually sets the worst point now that a window is a request per day rather than one or two
   for the whole span. */
export const espnRequestPoolSize = 6;

const settledInPool = async <T, R>(
	items: T[],
	run: (item: T) => Promise<R>,
	size = espnRequestPoolSize,
): Promise<PromiseSettledResult<R>[]> => {
	const results: PromiseSettledResult<R>[] = [];
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const index = next;
			next += 1;
			const item = items[index] as T;
			try {
				results[index] = { status: 'fulfilled', value: await run(item) };
			} catch (reason) {
				results[index] = { status: 'rejected', reason };
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => worker()));
	return results;
};

/* The pool above bounds one fan-out. This bounds the aggregate, which is what ESPN actually measures
   — it has no idea which of our surfaces asked. The gap it closes is the one the pool cannot see:
   every `tickLeague` runs its own single-league fetch on its own timer, so 31 leagues whose timers
   drift into alignment issue 31 simultaneous requests through 31 separate pools of one. The existing
   jitter spreads those by a couple of seconds; this puts a ceiling under it.

   A bucket rather than flat spacing, because flat spacing taxes every cold start to bound a case
   that only happens occasionally. A burst up to the capacity goes through untouched and only the
   excess waits.

   Both numbers are sized from us rather than from a published limit, because ESPN does not publish
   one: the capacity is the widest simultaneous fan-out this codebase has measured coming back clean,
   and the rate sits well above the extension's own worst case — 31 leagues at the 12s floor plus win
   probability is about 3 requests a second — so nothing waits in steady state and the bucket only
   ever shapes bursts. If a limit is found empirically, this is the one place to say so. */
export const espnBurstCapacity = 16;
export const espnSustainedPerSecond = 10;

let requestTokens = espnBurstCapacity;
let tokensRefilledAt = Date.now();

const takeRequestSlot = async (): Promise<void> => {
	for (;;) {
		const now = Date.now();
		const refill = ((now - tokensRefilledAt) / 1000) * espnSustainedPerSecond;
		requestTokens = Math.min(espnBurstCapacity, requestTokens + Math.max(0, refill));
		tokensRefilledAt = now;
		if (requestTokens >= 1) {
			requestTokens -= 1;
			return;
		}
		const waitMs = Math.ceil(((1 - requestTokens) / espnSustainedPerSecond) * 1000);
		await new Promise(resolve => setTimeout(resolve, waitMs));
	}
};

/* How often ESPN will actually tell us something new, per league, read off the `cache-control` it
   answered with. `Cache-Control` is on the CORS-safelist, so this is readable on a cross-origin
   response without the host exposing anything.

   Polling faster than this buys a cache hit and no information, so it is the floor the eager
   interval scales down to rather than a number we chose. Unasked leagues fall back to the
   assumption in constants. */
const observedScoreboardMaxAgeMs = new Map<LeagueId, number>();

const recordScoreboardMaxAge = (leagueId: LeagueId, cacheControl: string | null): void => {
	const match = /max-age\s*=\s*(\d+)/i.exec(cacheControl ?? '');
	if (!match) return;
	const seconds = Number(match[1]);
	if (!Number.isFinite(seconds) || seconds <= 0) return;
	observedScoreboardMaxAgeMs.set(leagueId, seconds * 1000);
};

export const scoreboardRefreshMs = (leagueId: LeagueId): number => (
	observedScoreboardMaxAgeMs.get(leagueId) ?? pollMinEagerMs
);

// ESPN ships a malformed row often enough that a dropped count is a steady state, not an event, so
// warning on every poll would bury the console at the 6s floor. Only a change in the count is news.
const lastWarnedDroppedCounts = new Map<string, number>();

const warnOnDroppedCountChange = (key: string, dropped: number, buildMessage: () => string): void => {
	if (lastWarnedDroppedCounts.get(key) === dropped) return;
	lastWarnedDroppedCounts.set(key, dropped);
	if (dropped > 0) logWarn(buildMessage());
};


const parseStatus = (state: string): Game['status'] => {
	const normalized = state.trim().toLowerCase();
	if (normalized === 'pre' || normalized === 'scheduled') return 'pre';
	if (normalized === 'in' || normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'live') return 'in';
	return 'post';
};

// ESPN files its scoreboard by US Eastern calendar date, not by UTC: a 2026-09-04T02:10Z first
// pitch comes back under dates=20260903. The popup groups and labels games by the viewer's own
// calendar day, so the window is chosen in local days and translated to Eastern here rather than
// being built in a third zone that agrees with neither.
const espnFilingDateFormat = new Intl.DateTimeFormat('en-US', {
	timeZone: 'America/New_York',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

const toQueryDate = (date: Date): string => {
	const parts = espnFilingDateFormat.formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find(p => p.type === type)?.value ?? '';
	return `${part('year')}${part('month')}${part('day')}`;
};

const localDayStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/* A window is a list of Eastern filing dates now, because ESPN stopped answering for a span.

   Every one of the 31 leagues answers `dates=20260914-20260915` with
   `{"code":400,"message":"Failed to get events endpoint."}`, at any width — including a one-day
   `20260915-20260915` — while a single `dates=20260915` still answers 200 in all 31. Measured across
   every league and 20 consecutive times on one of them, on both `site.api` and `site.web.api`, so it
   is a settled state rather than a service flapping.

   No multi-day form survives it. Comma, encoded comma and encoded hyphen all 400, and a repeated
   `dates=` parameter answers 200 for the first value only, which is worse than failing. `YYYYMM` and
   `YYYY` do still work, but truncation drops the tail — the days furthest ahead — so a month cannot
   stand in for a window that ends in the future.

   The span is still computed exactly as the range was, then enumerated, so the days asked for are
   precisely the days the range covered. `pastDays` is what makes a finished game from last night
   reachable this morning, and what lets a late kickoff filed under yesterday survive Eastern
   midnight. */
const padDatePart = (value: number): string => String(value).padStart(2, '0');

const shiftDayKey = (dayKey: string, byDays: number): string => {
	// Stepped at noon UTC: these are calendar dates rather than instants, and noon is the one hour
	// no DST discontinuity can push onto an adjacent date.
	const at = Date.UTC(
		Number(dayKey.slice(0, 4)),
		Number(dayKey.slice(4, 6)) - 1,
		Number(dayKey.slice(6, 8)),
		12,
	);
	const moved = new Date(at + (byDays * 24 * 60 * 60 * 1000));
	return `${moved.getUTCFullYear()}${padDatePart(moved.getUTCMonth() + 1)}${padDatePart(moved.getUTCDate())}`;
};

export const buildDayWindowKeys = (days: number, now: Date = new Date(), pastDays = 0): string[] => {
	const firstLocalDay = localDayStart(now);
	const windowStart = new Date(
		firstLocalDay.getFullYear(),
		firstLocalDay.getMonth(),
		firstLocalDay.getDate() - pastDays,
	);
	// The popup's cutoff is a rolling `days * 24h` from now, so the last day it can label is the
	// local day that instant falls in. Ending on that day's final millisecond rather than on its
	// midnight keeps the window out of an Eastern date nothing on screen would come from.
	const lastLocalDay = localDayStart(new Date(now.getTime() + (days * 24 * 60 * 60 * 1000)));
	const windowEnd = new Date(new Date(
		lastLocalDay.getFullYear(),
		lastLocalDay.getMonth(),
		lastLocalDay.getDate() + 1,
	).getTime() - 1);

	const lastKey = toQueryDate(windowEnd);
	const keys: string[] = [];
	for (let key = toQueryDate(windowStart); key <= lastKey; key = shiftDayKey(key, 1)) {
		keys.push(key);
	}
	return keys;
};

// The days the live poll asks for. ESPN's undated board is not a full slate in every league —
// college football files by week rather than by day and trims that week to about 25 featured games,
// so a live game can simply be absent from it — and naming the days returns the complete card.
//
// `days: 0` ends the window at the end of today, which is the last day a live game can have started;
// the day back is there because ESPN files a game under its Eastern start date, so an 11pm kickoff
// is still filed under yesterday while it is on screen after Eastern midnight.
export const buildCurrentDayKeys = (now: Date = new Date()): string[] => buildDayWindowKeys(0, now, 1);

const ch = (n: number): number => {
	const c = n / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

// WCAG relative luminance.
const hexLuminance = (hex: string): number => {
	const matched = /^#([\da-fA-F]{6})$/.exec(hex);
	if (!matched) return 0;
	const h = matched[1]!;
	return (0.2126 * ch(parseInt(h.slice(0, 2), 16)))
		+ (0.7152 * ch(parseInt(h.slice(2, 4), 16)))
		+ (0.0722 * ch(parseInt(h.slice(4, 6), 16)));
};

// Colors with luminance below this threshold risk blending into the black app background
const darkOnBlackThreshold = 0.04;

const normalizeOne = (value?: string): string | undefined => {
	if (!value) return undefined;
	const clean = value.trim().replace('#', '');
	if (/^[0-9a-fA-F]{3}$/.test(clean)) {
		const expanded = clean
			.split('')
			.map(char => `${char}${char}`)
			.join('');
		return `#${expanded.toUpperCase()}`;
	}
	if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toUpperCase()}`;
	return undefined;
};

const resolveTeamColors = (primary?: string, alternate?: string): { color?: string; alternateColor?: string } => {
	const p = normalizeOne(primary);
	const a = normalizeOne(alternate);
	if (!p) return { color: a };
	// Primary is too dark for the UI. Keep it as the alternate so the pair-resolver can still
	// lighten it for charts.
	if (hexLuminance(p) < darkOnBlackThreshold && a && hexLuminance(a) > hexLuminance(p)) {
		return { color: a, alternateColor: p };
	}
	return { color: p, alternateColor: a };
};

// The "dark" variant is the light-coloured one, meant for dark UIs.
const pickLeagueLogo = (logos?: { href?: string; rel?: string[] }[]): string | undefined => (
	logos?.find(l => l.rel?.includes('dark') && l.href)?.href ?? logos?.[0]?.href
);

class LeagueFetchError extends Error {
	leagueId: LeagueId;

	status?: number;

	constructor(leagueId: LeagueId, status?: number) {
		super(`ESPN ${leagueId} API returned ${status ?? 'an error'}`);
		this.name = 'LeagueFetchError';
		this.leagueId = leagueId;
		this.status = status;
	}
}

const parseBroadcasts = (competition: EspnCompetition): string[] | undefined => {
	const names = new Set<string>();
	for (const broadcast of competition.broadcasts ?? []) {
		for (const name of broadcast.names ?? []) {
			const trimmed = name.trim();
			if (trimmed) names.add(trimmed);
		}
	}
	for (const geoBroadcast of competition.geoBroadcasts ?? []) {
		const shortName = geoBroadcast.media?.shortName?.trim();
		if (shortName) names.add(shortName);
	}
	const parsed = [...names];
	return parsed.length > 0 ? parsed : undefined;
};

const parseVenueLocation = (address?: EspnVenueAddress): string | undefined => {
	const city = address?.city?.trim();
	const state = address?.state?.trim();
	const country = address?.country?.trim();
	if (!city && !state && !country) return undefined;
	// Country only stands in where ESPN sent no state, so a domestic game reads "Inglewood, CA"
	// rather than "Inglewood, CA, USA".
	if (city && state) return `${city}, ${state}`;
	if (city && country) return `${city}, ${country}`;
	return city || state || country;
};

const pickProviderLogo = (provider?: EspnOddsProvider, rel?: string): string | undefined => {
	if (!provider?.logos?.length) return undefined;
	if (rel) {
		const match = provider.logos.find(logo => logo.rel?.includes(rel) && logo.href);
		if (match?.href) return match.href;
	}
	const light = provider.logos.find(logo => logo.rel?.includes('light') && logo.href);
	if (light?.href) return light.href;
	return provider.logos.find(logo => Boolean(logo.href))?.href;
};

const parseOdds = (competition: EspnCompetition): GameOdds | undefined => {
	const raw = competition.odds?.[0];
	if (!raw) return undefined;
	const providerName = raw.provider?.displayName ?? raw.provider?.name;
	const providerLogoUrl = raw.provider ? pickProviderLogo(raw.provider, 'light') : undefined;
	const providerDarkLogoUrl = raw.provider ? pickProviderLogo(raw.provider, 'dark') : undefined;
	const overUnderValue = typeof raw.overUnder === 'number'
		? raw.overUnder
		: typeof raw.overUnder === 'string'
			? Number.parseFloat(raw.overUnder)
			: undefined;
	const overUnder = Number.isFinite(overUnderValue) ? overUnderValue : undefined;
	const parsed: GameOdds = {
		details: raw.details?.trim() || undefined,
		overUnder,
		provider: providerName
			? { name: providerName, logoUrl: providerLogoUrl, darkLogoUrl: providerDarkLogoUrl }
			: undefined,
	};
	if (!parsed.details && parsed.overUnder === undefined && !parsed.provider) return undefined;
	return parsed;
};

// `type` is not a stable discriminator across leagues. The overall record is `total` in most of
// them, `ytd` in the NHL and `standingsoverall` in the AFL, so a lone `find` on `total` silently
// returns nothing for hockey. Index 0 held the overall record in every league sampled, which is
// all the positional fallback rests on.
const overallRecordTypes = ['total', 'ytd', 'standingsoverall'];

const parseCompetitorRecord = (competitor: EspnCompetitor): string | undefined => {
	const records = competitor.records;
	if (!records || records.length === 0) return undefined;
	const overall = overallRecordTypes
		.map(type => records.find(entry => entry.type === type))
		.find(entry => entry !== undefined)
		?? records[0];
	// `summary` beats `displayValue` because the NHL appends standings points to the latter —
	// "28-28-10, 66 PTS", twice the width of the column it has to sit in.
	return (overall?.summary ?? overall?.displayValue ?? '').trim() || undefined;
};

// Baseball's `probableStartingPitcher` and hockey's `probableStartingGoalie` are the only two
// values ESPN sends. Matching the shared prefix rather than either name means a third sport can
// start shipping a starter without needing a change here.
const starterStat = (probable: EspnProbable, name: string): string | undefined => (
	probable.statistics?.find(stat => stat.name === name)?.displayValue?.trim() || undefined
);

const parseProbableStarter = (competitor: EspnCompetitor): ProbableStarter | undefined => {
	const probable = competitor.probables?.find(entry => entry.name?.startsWith('probableStarting'));
	if (!probable) return undefined;
	const name = probable.athlete?.shortName?.trim() || probable.athlete?.displayName?.trim();
	if (!name) return undefined;
	const status = probable.status?.type?.trim().toLowerCase();
	const wins = starterStat(probable, 'wins');
	const losses = starterStat(probable, 'losses');
	return {
		name,
		headshot: probable.athlete?.headshot?.trim() || undefined,
		winLoss: wins !== undefined && losses !== undefined ? `${wins}-${losses}` : undefined,
		era: starterStat(probable, 'ERA'),
		// Empty for every goalie sampled; a pitcher's arrives assembled as "(7-7, 5.17)".
		line: probable.record?.trim() || undefined,
		status: status === 'expected' || status === 'confirmed' ? status : undefined,
	};
};

// Soccer sends the same stat twice, as `goals` and `goalsLeaders`, so the suffix comes off before
// anything dedupes on the result. `Leaders` is listed before `Leader` because alternation is tried
// left to right.
//
// `PerGame` is deliberately NOT stripped. No league was found sending both a total and a per-game
// variant of the same stat, so collapsing them buys nothing — and it would relabel the WNBA's
// `pointsPerGame` of 19.4 as season points, which is a different number.
const normalizeLeaderCategory = (name: string): string => (
	name.replace(/(Leaders|Leader)$/, '').toLowerCase()
);

// The proprietary composites — MLB's `MLBRating` (552.8) and basketball's `rating`
// ("15 PTS, 9 REB, 8 AST, 3 BLK") — are useless in a column this narrow. A rule about how ESPN
// names things outlives a list of the names themselves.
const isCompositeRating = (name: string): boolean => /rating$/i.test(name);

const maxLeadersPerTeam = 3;

const parseTeamLeaders = (competitor: EspnCompetitor): TeamLeader[] | undefined => {
	const leaders: TeamLeader[] = [];
	const seen = new Set<string>();

	for (const cat of competitor.leaders ?? []) {
		const name = cat.name?.trim();
		if (!name || isCompositeRating(name)) continue;

		const category = normalizeLeaderCategory(name);
		if (seen.has(category)) continue;

		const top = cat.leaders?.[0];
		const player = top?.athlete?.shortName?.trim() || top?.athlete?.displayName?.trim();
		const value = top?.displayValue?.trim();
		if (!player || !value) continue;

		seen.add(category);
		// `value` goes through verbatim. ESPN bakes English into the football ones — "12 CAR, 68 YDS,
		// 1 TD" — and there is no version of that string we could assemble ourselves.
		leaders.push({
			category,
			fallbackLabel: cat.shortDisplayName?.trim() || name,
			player,
			value,
			headshot: top?.athlete?.headshot?.trim() || undefined,
		});
		if (leaders.length === maxLeadersPerTeam) break;
	}

	return leaders.length > 0 ? leaders : undefined;
};

// ESPN's code for "unranked" is 99, and it sends it for every professional league on every game
// rather than omitting the block — so the presence of `curatedRank` says nothing and only the value
// does. The upper bound is the poll's own size; anything at or above 99 is the sentinel.
const unrankedCuratedRank = 99;

const parseCuratedRank = (competitor: EspnCompetitor): number | undefined => {
	const rank = competitor.curatedRank?.current;
	if (typeof rank !== 'number' || !Number.isInteger(rank)) return undefined;
	return rank >= 1 && rank < unrankedCuratedRank ? rank : undefined;
};

// Spread into both team literals below, the way resolveTeamColors already is. Records and rank ride
// every status; the other two are pre-game only.
const parseTeamContext = (competitor: EspnCompetitor, state: Game['status']) => ({
	record: parseCompetitorRecord(competitor),
	rank: parseCuratedRank(competitor),
	probableStarter: state === 'pre' ? parseProbableStarter(competitor) : undefined,
	leaders: state === 'pre' ? parseTeamLeaders(competitor) : undefined,
});

// The reading is the stadium postcode's outdoor AccuWeather forecast, sent for domes too: on one
// payload U.S. Bank Stadium reads Thunderstorms and loanDepot park reads Partly cloudy, both
// flagged `indoor`. ESPN publishes no roof position, and a retractable roof is `indoor` open or
// shut, so the flag alone decides it — an indoor venue has no conditions we can honestly report.
const parseWeather = (event: EspnEvent, indoor: boolean | undefined): GameCondition | undefined => {
	if (indoor) return undefined;
	const w = event.weather;
	if (!w || typeof w.temperature !== 'number') return undefined;
	// ESPN inconsistently puts the text label in either displayValue or conditionId
	const label = [w.displayValue, w.conditionId].find(v => v?.trim() && !/^\d+$/.test(v.trim()));
	if (!label) return undefined;
	return { temperatureF: Math.round(w.temperature), conditionLabel: label.trim() };
};

const downOrdinals = ['', '1st', '2nd', '3rd', '4th'] as const;

// ESPN's own label is the primary signal; the `distance <= 0` fallback mirrors buildDownDistance.
// Returns false rather than undefined when neither applies, so an unknown situation costs the
// boost its bonus rather than misreporting goal-to-go.
const parseGoalToGo = (situation: EspnSituation): boolean => {
	if (/goal/i.test(situation.shortDownDistanceText ?? '')) return true;
	return typeof situation.down === 'number' && (typeof situation.distance !== 'number' || situation.distance <= 0);
};

/* ESPN's play text arrives dirty in two ways that both matter on a 320px screen. Most football
   plays carry a leading space, and a penalty is two sentences joined by a newline —
   " A.Jeanty up the middle to LAC 49 for 1 yard (D.Phillips).\nPENALTY on LV-S.Burford, Offensive
   Holding, 10 yards, enforced at 50 - No Play." Both halves are worth reading, so the newline is
   kept and each line is trimmed around it, rather than flattening the pair into one run-on. */
const parseLastPlay = (situation: EspnSituation): string | undefined => {
	const lines = (situation.lastPlay?.text ?? '')
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);
	return lines.length > 0 ? lines.join('\n') : undefined;
};

// Whoever ESPN hangs the play on. Deliberately not parsePossession's fallback chain: that answers
// "who has the ball now", which survives a dead ball, while this answers "who just did something"
// and should go quiet rather than guess when ESPN names a team we cannot match.
const parseLastPlayTeam = (situation: EspnSituation, homeId: string, awayId: string): string | undefined => {
	const candidate = situation.lastPlay?.team?.id;
	return candidate === homeId || candidate === awayId ? candidate : undefined;
};

const parseAtBatPlayer = (player: EspnSituationPlayer | undefined): AtBatPlayer | undefined => {
	const athlete = player?.athlete;
	const name = athlete?.displayName?.trim() || athlete?.shortName?.trim();
	if (!name) return undefined;
	return {
		name,
		headshot: athlete?.headshot?.trim() || undefined,
		jersey: athlete?.jersey?.trim() || undefined,
		position: athlete?.position?.trim() || undefined,
		summary: player?.summary?.trim() || undefined,
	};
};

// Both sides or neither. ESPN drops the pair between innings while the rest of the situation
// survives, and a panel captioned "pitching" with nobody opposite it reads as a failure rather
// than as a gap.
const parseAtBat = (situation: EspnSituation): AtBat | undefined => {
	const pitcher = parseAtBatPlayer(situation.pitcher);
	const batter = parseAtBatPlayer(situation.batter);
	return pitcher && batter ? { pitcher, batter } : undefined;
};

// `possession` disappears at every dead ball while the rest of the situation survives, so a
// timeout or the end of a quarter would otherwise take the field diagram's direction of travel
// with it. `lastPlay.team` holds the offense through those states: at the end of the 2nd quarter
// of FRES at USC it read 278 for a Fresno State drive ESPN scored at -1 yard, which only balances
// if Fresno State — the away side — was driving toward 0.
const parsePossession = (situation: EspnSituation, homeId: string, awayId: string): string | undefined => {
	const candidate = situation.possession ?? situation.lastPlay?.team?.id;
	return candidate === homeId || candidate === awayId ? candidate : undefined;
};

const buildDownDistance = (situation: EspnSituation): string | undefined => {
	if (situation.shortDownDistanceText) return situation.shortDownDistanceText;
	const { down, distance } = situation;
	if (typeof down !== 'number' || down < 1 || down > 4) return undefined;
	const ordinal = downOrdinals[down] ?? `${down}th`;
	if (typeof distance !== 'number' || distance <= 0) return `${ordinal} & Goal`;
	return `${ordinal} & ${distance}`;
};

// ESPN encodes "this is a knockout game" three mutually incompatible ways, and all three are
// needed:
//  1. `season.type === 3` — the US pro/college leagues, plus the WBC's second round by coincidence.
//  2. `season.slug` — international soccer, Liga MX, MLS, NWSL and the rest of the WBC, whose
//     `season.type` is a per-tournament id that is never 3 (2022 World Cup final: 10948).
//  3. `competition.notes[0].headline` — the Olympics, where even the Gold Medal Game reports
//     `type: 2, slug: 'regular-season'` and the round survives only in display copy.
const postseasonSlugs = new Set([
	'knockout-round-playoffs', // UCL/UEL 2024-25 format onward
	'round-of-16',
	// The 48-team 2026 World Cup added a first knockout round of 32 matches. It matches none of
	// the patterns below, so without this the whole round scored as regular-season football.
	'round-of-32',
	'quarterfinals',
	'semifinals',
	'semi-finals', // WBC hyphenates
	'final',
	'finals', // WBC pluralizes
	'3rd-place', // FIFA Women's World Cup
	'3rd-place-match', // FIFA (men's) World Cup
	'gold-medal-match',
	'bronze-medal-match',
	'mls-cup',
]);

// Liga MX, MLS and NWSL generate a slug per tournament instance (`apertura-2023---finals`), so
// the round can only be matched as a substring. Verified safe against their regular-season slugs
// and against the domestic leagues' season-long ones.
const postseasonSlugPatterns = [/quarterfinals?$/, /semi-?finals?$/, /finals?$/, /playoffs/, /liguilla/];

// Scoped to the Olympic leagues because headline is free-text editorial copy: matching it
// everywhere would sweep in regular-season bracket events like November invitationals.
const olympicHeadlineLeagues = new Set<LeagueId>(['olybkm', 'olybkw', 'olymih', 'olywih', 'olybb']);
const postseasonHeadlinePattern = /quarterfinal|semifinal|medal game/i;

// NCAA baseball and softball run a stage per season type rather than one `post-season`: 3 is the
// Regionals, 4 the Super Regionals, 5 the College World Series and 6 the Championship Series. A
// bare `type === 3` check caught only the opening weekend, so the tournament's first games counted
// as postseason and its championship final did not.
const collegeBaseballPostseasonTypes = new Set([3, 4, 5, 6]);
const collegeBaseballLeagues = new Set<LeagueId>(['cbase', 'csoft']);

const resolvePostseason = (event: EspnEvent, comp: EspnCompetition, league: LeagueId): boolean => {
	if (event.season?.type === 3) return true;

	if (collegeBaseballLeagues.has(league) && event.season?.type !== undefined
		&& collegeBaseballPostseasonTypes.has(event.season.type)) return true;

	const slug = event.season?.slug?.trim().toLowerCase();
	if (slug && (postseasonSlugs.has(slug) || postseasonSlugPatterns.some(p => p.test(slug)))) return true;

	if (olympicHeadlineLeagues.has(league)) {
		const headline = comp.notes?.[0]?.headline;
		if (headline && postseasonHeadlinePattern.test(headline)) return true;
	}

	return false;
};

// ESPN's own suffix, not ours. `Final/SO` for a shootout and `Final/3OT` for a triple overtime are
// broadcast conventions this project would otherwise have to reproduce per sport from the period
// number, and the shootout one it could not reproduce at all.
const parseFinalPeriodSuffix = (state: Game['status'], shortDetail?: string): string | undefined => {
	if (state !== 'post' || !shortDetail) return undefined;
	const suffix = shortDetail.split('/')[1]?.trim();
	return suffix ? suffix : undefined;
};

const parseTopOfInning = (shortDetail?: string): boolean | undefined => {
	if (!shortDetail) return undefined;
	if (shortDetail.startsWith('Top')) return true;
	if (shortDetail.startsWith('Bot') || shortDetail.startsWith('Mid')) return false;
	return undefined;
};

const parseEvent = (event: EspnEvent, league: LeagueId): Game | null => {
	const comp = event.competitions[0];
	if (!comp) return null;
	const home = comp.competitors.find(c => c.homeAway === 'home');
	const away = comp.competitors.find(c => c.homeAway === 'away');
	if (!home || !away) return null;
	const status = comp.status;
	const state = parseStatus(status.type?.state ?? 'post');
	const isDelayed = /delay|suspend/i.test(status.type?.name ?? '');
	const delayDescription = isDelayed ? (status.type?.description?.trim() || undefined) : undefined;
	const leagueConfig = leagueConfigMap[league];
	const isInningSport = leagueConfig.periodFormat === 'innings';
	const situation = comp.situation;
	const isGridironSituation = leagueConfig.sportType === 'football' && state === 'in' && situation !== undefined;
	// The sport-agnostic half of the same gate. ESPN only sends a situation on a live game, but
	// saying so here is what lets the type narrow for the readers below.
	const liveSituation = state === 'in' && situation !== undefined;
	const postseason = resolvePostseason(event, comp, league);
	const grade = postseason
		? gradePostseason({ league, seasonType: event.season?.type, seasonSlug: event.season?.slug, notes: comp.notes })
		: undefined;

	return {
		id: event.id,
		league,
		sportType: leagueConfig.sportType,
		homeTeam: {
			id: home.id,
			name: home.team.displayName,
			nickname: home.team.name,
			abbreviation: home.team.abbreviation || home.team.displayName?.slice(0, 3).toUpperCase() || '?',
			score: parseInt(home.score ?? '0', 10) || 0,
			shootoutScore: home.shootoutScore,
			logo: home.team.logo ?? undefined,
			...resolveTeamColors(home.team.color, home.team.alternateColor),
			...parseTeamContext(home, state),
			timeouts: liveSituation ? situation.homeTimeouts : undefined,
		},
		awayTeam: {
			id: away.id,
			name: away.team.displayName,
			nickname: away.team.name,
			abbreviation: away.team.abbreviation || away.team.displayName?.slice(0, 3).toUpperCase() || '?',
			score: parseInt(away.score ?? '0', 10) || 0,
			shootoutScore: away.shootoutScore,
			logo: away.team.logo ?? undefined,
			...resolveTeamColors(away.team.color, away.team.alternateColor),
			...parseTeamContext(away, state),
			timeouts: liveSituation ? situation.awayTimeouts : undefined,
		},
		venueName: comp.venue?.fullName ?? comp.venue?.name ?? undefined,
		venueLocation: parseVenueLocation(comp.venue?.address),
		// 0 on every scheduled and in-progress game, so a falsy figure is "not announced yet"
		// rather than an empty stadium.
		attendance: comp.attendance && comp.attendance > 0 ? comp.attendance : undefined,
		finalPeriodSuffix: parseFinalPeriodSuffix(state, status.type?.shortDetail),
		period: status.period ?? 1,
		clockSeconds: parseClockToSeconds(status.displayClock ?? '0:00'),
		status: state,
		// Every state, not just `pre`. A game's start is a fact about the game rather than about
		// how far through it is, and the retention window for finished games has nothing else to
		// anchor on — ESPN publishes no completion timestamp. Every reader that displays this field
		// is behind a pre-game check, so nothing that used to see undefined now shows a date it
		// would misread. The one reader that is not is the tab matcher's tiebreak, which used to
		// read MAX_SAFE_INTEGER for every live game and now sorts two equally-scored ones by
		// kickoff — a better answer than the id comparison it used to fall through to.
		startTime: event.date,
		broadcasts: parseBroadcasts(comp),
		odds: parseOdds(comp),
		intermission: /HALFTIME|END_PERIOD|INTERMISSION/i.test(status.type?.name ?? ''),
		topOfInning: isInningSport ? parseTopOfInning(status.type?.shortDetail) : undefined,
		baseRunners: isInningSport && situation ? {
			first: situation.onFirst ?? false,
			second: situation.onSecond ?? false,
			third: situation.onThird ?? false,
		} : undefined,
		bso: isInningSport && state === 'in' && situation && typeof situation.balls === 'number'
			? { balls: situation.balls, strikes: situation.strikes ?? 0, outs: situation.outs ?? 0 }
			: undefined,
		downDistance: leagueConfig.sportType === 'football' && state === 'in' && situation
			? buildDownDistance(situation)
			: undefined,
		fieldPosition: isGridironSituation ? situation.possessionText?.trim() || undefined : undefined,
		isRedZone: leagueConfig.sportType === 'football' && state === 'in' && situation
			? (situation.isRedZone ?? false)
			: undefined,
		down: isGridironSituation ? situation.down : undefined,
		distance: isGridironSituation ? situation.distance : undefined,
		isGoalToGo: isGridironSituation ? parseGoalToGo(situation) : undefined,
		yardLine: isGridironSituation ? situation.yardLine : undefined,
		possessionTeamId: isGridironSituation ? parsePossession(situation, home.id, away.id) : undefined,
		driveStartYardLine: isGridironSituation ? situation.lastPlay?.drive?.start?.yardLine : undefined,
		atBat: isInningSport && liveSituation ? parseAtBat(situation) : undefined,
		// No sport gate: baseball and hockey describe their last play as readily as football does.
		lastPlay: liveSituation ? parseLastPlay(situation) : undefined,
		lastPlayTeamId: liveSituation ? parseLastPlayTeam(situation, home.id, away.id) : undefined,
		lastPlayDrive: isGridironSituation ? situation.lastPlay?.drive?.description?.trim() || undefined : undefined,
		weather: parseWeather(event, comp.venue?.indoor),
		isPostseason: postseason,
		// Only graded when the game is actually postseason: the headline is display copy, and a
		// regular-season oddity like an NFL London game carries a typed note too.
		postseasonRound: grade?.round,
		postseasonLabel: grade?.label,
		delayed: isDelayed || undefined,
		delayDescription,
	};
};

export interface LeagueFetchOptions {
	includeUpcoming?: boolean;
	upcomingDays?: number;
	// Off by default, so every consumer of this package that does not ask for finished games keeps
	// getting exactly what it got before.
	includeFinal?: boolean;
}

interface LeagueGamesResult {
	leagueId: LeagueId;
	games: Game[];
	logoUrl: string;
}

const fetchScoreboard = async (url: string, leagueId: LeagueId, warnKey: string = leagueId): Promise<EspnScoreboardResponse> => {
	await takeRequestSlot();
	const res = await fetch(url, {
		headers: {
			'Accept': 'application/json',
		},
	});
	recordScoreboardMaxAge(leagueId, res.headers.get('cache-control'));
	if (!res.ok) throw new LeagueFetchError(leagueId, res.status);
	const parsed = parseScoreboard(await res.json());
	warnOnDroppedCountChange(
		`scoreboard:${warnKey}`,
		parsed.droppedEvents,
		() => `Skipped ${parsed.droppedEvents} unparseable ${leagueId} event(s); kept ${parsed.events.length}.`,
	);
	return parsed;
};

/* `groups` is required for reliable coverage in the two NCAA basketball leagues.

   `limit` lifts a server-side cap we had been eating silently. The published reference says to pass
   a high limit alongside `groups` to get a full NCAA slate, and measured, an MLB month query
   answered 100 events without it and 369 with it. 500 rather than higher because `limit=1000`
   answered a dated college football Saturday with 25 events — the undated curated week, meaning the
   `dates` filter had quietly stopped being applied — and 1500 did the same. Verified against all 31
   leagues on a single-date query: identical answers, so it only ever lifts a cap. */
const scoreboardEventLimit = 500;

const scoreboardParams = (config: LeagueConfig): URLSearchParams => {
	const params = new URLSearchParams();
	if (config.id === 'ncaab') params.set('groups', '50');
	if (config.id === 'ncaaw') params.set('groups', '49');
	params.set('limit', String(scoreboardEventLimit));
	return params;
};

/* One ESPN answer per league and Eastern day. A window costs a request per day now rather than one
   for the whole span, and this is what keeps that affordable: the days either side of today barely
   move, so most of a window is answered from here after the first time it is asked for.

   The TTL is read off what came back rather than chosen per call site. A past day whose every game
   is final cannot change again. A future day is a schedule, which moves but not quickly. Today is
   what the live poll is for and is never served from here — ESPN's own `max-age` already collapses
   two polls inside its window into one cache hit. And a past day still carrying an unfinished game
   is treated as today, which is what keeps a game that kicked off before Eastern midnight arriving
   at the live cadence while it is still being played.

   In this worker's memory rather than in `storage.local`, deliberately: MV3 ends a worker about
   thirty seconds after the last event, but a worker with games on has a timer pending the whole
   time, so the lifetime this has to cover is exactly the one where the saving matters. */
const settledDayTtlMs = 30 * 60 * 1000;
const futureDayTtlMs = 10 * 60 * 1000;

/* Held either side of today, so an entry no window can ask for again stops being kept. Sized off the
   widest window the product can build rather than picked: Up Next reaches `upcomingGamesDaysMax`
   ahead and finals two days back, and one more each way covers the Eastern date a local day
   straddles. In a busy league in season this is the difference between holding a fortnight of games
   and holding three weeks of them for nothing. */
const dayCachePastDays = 3;
const dayCacheFutureDays = upcomingGamesDaysMax + 1;

/* The days of one league, three at a time. The league fan-out runs six at a time, so the widest
   point is eighteen requests in flight, which the token bucket then shapes to its own rate. Three
   rather than all of them because a ten-day window in 31 leagues is 310 requests, and the bucket
   holding that back is the difference between a slow cold start and the 403s that started all of
   this. */
export const espnDayPoolSize = 3;

interface CachedDay {
	games: Game[];
	espnLogo?: string;
	fetchedAt: number;
	ttlMs: number;
}

const dayCache = new Map<string, CachedDay>();
const dayRequests = new Map<string, Promise<CachedDay>>();

/* The one seam the tests need. Two readings of the same league and day in one spec file otherwise
   inherit each other's games, which is as likely to make an assertion pass for the wrong reason as
   to fail one — `holidayDecorations` hit exactly that and had to reset the module registry. */
export const clearDayCache = (): void => {
	dayCache.clear();
	dayRequests.clear();
};

/* A past day is settled only once every game on it is final, and a day with anything in progress is
   never settled at all — that is what carries a game which kicked off before Eastern midnight, so it
   stays on the live cadence.

   Between those sits the past day holding a game ESPN still calls scheduled. Waiting for it to reach
   `post` would keep that day uncacheable for as long as the league is polled, because a postponed
   game never will; calling it settled would hide a rain-delayed start that crosses midnight for half
   an hour. So it takes the future day's ten minutes: six requests an hour for the postponed case, and
   a blind spot of ten minutes rather than thirty for the delayed one. */
const dayTtlMs = (dayKey: string, todayKey: string, games: Game[]): number => {
	if (dayKey === todayKey) return 0;
	if (dayKey > todayKey) return futureDayTtlMs;
	if (games.some(game => game.status === 'in')) return 0;
	return games.every(game => game.status === 'post') ? settledDayTtlMs : futureDayTtlMs;
};

const pruneDayCache = (todayKey: string): void => {
	const first = shiftDayKey(todayKey, -dayCachePastDays);
	const last = shiftDayKey(todayKey, dayCacheFutureDays);
	// Deleting the entry the iterator is standing on is safe: a Map iterator visits what is still
	// there rather than a snapshot taken up front.
	for (const key of dayCache.keys()) {
		const dayKey = key.slice(key.lastIndexOf(':') + 1);
		if (dayKey < first || dayKey > last) dayCache.delete(key);
	}
};

/* One day of one league, answered from the cache when it can be.

   A failed refetch falls back to the last good answer for that day, for every day but today. Without
   that a single shed day would punch a hole in a window its caller only rebuilds at startup and on a
   preference change, so one 403 on day five would cost a league its whole week until the next time
   the user changed a setting. Today is the exception because today is the live signal: `tickLeague`
   reads a successful tick with nothing live as a quiet league and walks it towards dormant, so
   today's failure has to reach it rather than be papered over. */
const fetchDayFromEspn = async (
	config: LeagueConfig,
	dayKey: string,
	todayKey: string,
	cached: CachedDay | undefined,
): Promise<CachedDay> => {
	const cacheKey = `${config.id}:${dayKey}`;
	const params = scoreboardParams(config);
	params.set('dates', dayKey);
	const url = `${espnBase}/${config.espnPath}/scoreboard?${params.toString()}`;

	try {
		const response = await fetchScoreboard(url, config.id, cacheKey);
		const games = (response.events ?? [])
			.map(event => parseEvent(event, config.id))
			.filter((game): game is Game => game !== null);
		const entry: CachedDay = {
			games,
			espnLogo: pickLeagueLogo(response.leagues?.[0]?.logos),
			fetchedAt: Date.now(),
			ttlMs: dayTtlMs(dayKey, todayKey, games),
		};
		dayCache.set(cacheKey, entry);
		pruneDayCache(todayKey);
		return entry;
	} catch (err) {
		if (!cached || dayKey === todayKey) throw err;
		logWarn(`ESPN would not answer for ${config.id} on ${dayKey}; keeping the last answer for that day.`);
		return cached;
	}
};

const fetchDayGames = async (config: LeagueConfig, dayKey: string, todayKey: string): Promise<CachedDay> => {
	const cacheKey = `${config.id}:${dayKey}`;
	const cached = dayCache.get(cacheKey);
	/* `dayKey !== todayKey` is the half that matters, and it has to be asked here rather than
	   inferred from the TTL written when the entry was made. A calendar day moves future → today →
	   past underneath a cached entry: a day fetched as tomorrow carries ten minutes, and ten minutes
	   later it is today and still fresh by its own clock. That served a stale tomorrow as today
	   across Eastern midnight, so a game live in the first ten minutes of the new day read as
	   scheduled at 0-0 — which for a Pacific viewer is an ordinary 21:00 tip-off. */
	if (cached && dayKey !== todayKey && cached.ttlMs > 0 && Date.now() - cached.fetchedAt < cached.ttlMs) {
		return cached;
	}

	// One request per league and day even when two surfaces ask at once. A worker start runs the
	// slate while a guide open or a lookahead can be in flight for the same day, and both would
	// otherwise miss the cache and fetch — the same trap the team marks got in-flight dedup for.
	const running = dayRequests.get(cacheKey);
	if (running) return await running;

	const pending = fetchDayFromEspn(config, dayKey, todayKey, cached);
	dayRequests.set(cacheKey, pending);
	try {
		return await pending;
	} finally {
		dayRequests.delete(cacheKey);
	}
};

const fetchLeagueGames = async (config: LeagueConfig, options: LeagueFetchOptions = {}): Promise<LeagueGamesResult> => {
	const { includeUpcoming = true, upcomingDays = 7, includeFinal = false } = options;
	// Declared once so nothing below can disagree about which games survive. A final game is kept
	// only while it is inside the retention window, so an ageing one falls off on its own rather
	// than needing a sweep.
	const keepGame = (game: Game): boolean => {
		if (game.status !== 'post') return true;
		return includeFinal && isWithinFinalRetention(game);
	};

	const now = new Date();
	const todayKey = toQueryDate(now);
	/* One list of days rather than a current leg and an upcoming leg. Those were two requests with
	   their own failure handling because each named a range; now that a window is days, the live
	   window is simply the near end of the wider one, and the day back a late kickoff needs after
	   Eastern midnight is the same day yesterday's finals come from.

	   Two days back when finals are wanted, because retention runs 24 hours past an estimated wrap:
	   a final still inside the window can have kicked off 27.5 hours ago, and 27.5 hours before
	   00:30 local is 21:00 the day before yesterday. */
	const dayKeys = buildDayWindowKeys(
		includeUpcoming ? upcomingDays : 0,
		now,
		includeUpcoming && includeFinal ? 2 : 1,
	);

	const results = await settledInPool(
		dayKeys,
		dayKey => fetchDayGames(config, dayKey, todayKey),
		espnDayPoolSize,
	);
	/* On the live window, today's own answer is the whole point and its failure sinks the league.
	   `tickLeague` reads a successful tick with nothing live as a quiet league and walks it towards
	   dormant, so a window that lost today while the days either side answered from cache would let a
	   league fall asleep with its games being played. Every window contains today by construction —
	   the span opens no later than now and closes no earlier — so a missing entry is the same failure
	   and takes the same exit.

	   On a wide window it is one missing day among several. The slate and the guide ask for those, and
	   they want the roster of games rather than a live score; their live signal comes from the
	   per-league polls either way. Throwing the other nine days away over today would also be a
	   regression against the two-leg version this replaced, where a failed live leg still returned
	   everything the range leg found. */
	if (!includeUpcoming) {
		const todayResult = results[dayKeys.indexOf(todayKey)];
		if (todayResult?.status !== 'fulfilled') {
			throw todayResult?.reason ?? new LeagueFetchError(config.id);
		}
	}
	const answered = results
		.filter((result): result is PromiseFulfilledResult<CachedDay> => result.status === 'fulfilled')
		.map(result => result.value);
	// No day at all answered, so this league is unknown rather than empty — which is what
	// `shedLeagues` upstream exists to say.
	if (answered.length === 0) {
		const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
		throw rejected?.reason ?? new LeagueFetchError(config.id);
	}

	/* Today's copy of a duplicated event wins. The days run chronologically, so without this a copy
	   served out of a settled day's half-hour cache would beat today's fresh one — and the case that
	   produces the same event on two days is precisely the one where ESPN has stopped applying the
	   `dates` filter and every day answers with the same board. The two-leg version got this for free
	   by concatenating the live leg first. Insertion order is kept either way: re-setting an existing
	   key does not move it. */
	const byId = new Map<string, Game>();
	results.forEach((result, index) => {
		if (result.status !== 'fulfilled') return;
		const isToday = dayKeys[index] === todayKey;
		for (const game of result.value.games) {
			if (isToday || !byId.has(game.id)) byId.set(game.id, game);
		}
	});
	const games = [...byId.values()].filter(keepGame);

	const espnLogo = answered.find(day => day.espnLogo)?.espnLogo;
	return { leagueId: config.id, games, logoUrl: resolveLeagueLogoUrl(config.id, espnLogo) };
};

const getEnabledLeagueConfigs = (enabledLeagues: LeagueId[]): LeagueConfig[] => (
	enabledLeagues
		.map(league => leagueConfigMap[league])
		.filter((config): config is LeagueConfig => Boolean(config))
);

/* `shedLeagues` is the point of this shape. Collecting with `allSettled` and keeping the fulfilled
   ones means a league ESPN refused contributes no games and says nothing, so every caller read a
   403 as "this league has nothing on" — the popup drew the no-games slate on a full Saturday, and
   the per-league poll recorded a successful tick with nothing live and walked a league down into
   dormant while its games were being played. The games still come back best-effort; what changed is
   that the caller can now tell an empty answer from an unanswered one. */
export const fetchGamesWithLeagueLogos = async (enabledLeagues: LeagueId[], options: LeagueFetchOptions = {}): Promise<{ games: Game[]; leagueLogos: LeagueLogoMap; shedLeagues: LeagueId[] }> => {
	if (enabledLeagues.length === 0) return { games: [], leagueLogos: {}, shedLeagues: [] };
	const leagueConfigs = getEnabledLeagueConfigs(enabledLeagues);
	if (leagueConfigs.length === 0) return { games: [], leagueLogos: {}, shedLeagues: [] };

	const results = await settledInPool(leagueConfigs, config => fetchLeagueGames(config, options));

	const fulfilled = results
		.filter((r): r is PromiseFulfilledResult<LeagueGamesResult> => r.status === 'fulfilled')
		.map(r => r.value);
	const shedLeagues = leagueConfigs
		.filter((_, index) => results[index]?.status === 'rejected')
		.map(config => config.id);
	const games = fulfilled.flatMap(result => result.games);
	const leagueLogos = fulfilled.reduce<LeagueLogoMap>((acc, result) => {
		acc[result.leagueId] = result.logoUrl;
		return acc;
	}, {});
	return { games, leagueLogos, shedLeagues };
};

/* When the next kickoff a league carries is asked for and the answer matters more than the games
   themselves.

   Walked a day at a time and stopped at the first kickoff found, rather than fanned out: this exists
   to buy the right to sleep, so it has to stay cheaper than the polling it replaces. A league with a
   game tomorrow costs two requests; only a league with genuinely nothing in the whole window pays
   for the whole span, and that is precisely the league that then sleeps half an hour at a time
   instead of polling 576 times a day. It also shares the day cache with the slate, so a lookahead
   that follows a slate fetch usually costs nothing at all.

   It parses each day rather than reading `date` off the envelope, which the ranged version did to
   avoid building games it had no use for. Sharing the cache is worth more than skipping the parse.

   `null` is a real answer — nothing scheduled inside the window — and is what puts a league to
   sleep, so a failure throws rather than returning it. */
export const fetchNextScheduledStart = async (
	leagueId: LeagueId,
	options: { days?: number; now?: Date } = {},
): Promise<number | null> => {
	const config = leagueConfigMap[leagueId];
	if (!config) return null;
	const { days = pollLookaheadDays, now = new Date() } = options;
	const todayKey = toQueryDate(now);
	const nowMs = now.getTime();

	for (const dayKey of buildDayWindowKeys(days, now)) {
		const { games } = await fetchDayGames(config, dayKey, todayKey);
		let earliest: number | null = null;
		for (const game of games) {
			if (!game.startTime) continue;
			const startMs = new Date(game.startTime).getTime();
			if (!Number.isFinite(startMs) || startMs <= nowMs) continue;
			if (earliest === null || startMs < earliest) earliest = startMs;
		}
		if (earliest !== null) return earliest;
	}
	return null;
};

export const fetchGames = async (enabledLeagues: LeagueId[]): Promise<Game[]> => {
	if (enabledLeagues.length === 0) return [];
	const { games } = await fetchGamesWithLeagueLogos(enabledLeagues);
	return games;
};

export const fetchLiveGames = async (enabledLeagues: LeagueId[]): Promise<Game[]> => {
	const games = await fetchGames(enabledLeagues);
	return games.filter(g => g.status === 'in');
};

export const fetchLeagueLogos = async (enabledLeagues: LeagueId[], options: { includeUpcoming?: boolean; upcomingDays?: number } = {}): Promise<LeagueLogoMap> => {
	const { leagueLogos } = await fetchGamesWithLeagueLogos(enabledLeagues, options);
	return leagueLogos;
};

// Home-win fractions in [0, 1], oldest first. Lives on the summary endpoint, so it costs one
// request per game — call it on a slower cadence than the scoreboard poll. Empty whenever ESPN
// has nothing, which the scorer reads as "no signal" rather than a neutral zero.
export const fetchWinProbability = async (game: Pick<Game, 'id' | 'league'>, init?: { signal?: AbortSignal }): Promise<number[]> => {
	const config = leagueConfigMap[game.league];
	if (!config) return [];

	const url = `${espnBase}/${config.espnPath}/summary?event=${encodeURIComponent(game.id)}`;
	await takeRequestSlot();
	const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: init?.signal });
	if (!res.ok) throw new Error(`Failed to fetch win probability for ${game.id}: HTTP ${res.status}`);

	const parsed = EspnSummarySchema.safeParse(await res.json());
	if (!parsed.success) return [];

	return (parsed.data.winprobability ?? [])
		.map(entry => entry.homeWinPercentage)
		.filter((p): p is number => typeof p === 'number' && Number.isFinite(p))
		.map(p => Math.min(Math.max(p, 0), 1));
};

// ESPN sends `gameInfo.gameDuration` as "3:14" — hours and minutes, not a clock time. It is
// baseball-only among the leagues sampled, which is why the row it feeds is absent rather than
// blank everywhere else. Anything that is not h:mm is ignored rather than guessed at.
export const parseGameDurationMins = (data: unknown): number | null => {
	const raw = (data as { gameInfo?: { gameDuration?: unknown } })?.gameInfo?.gameDuration;
	if (typeof raw !== 'string') return null;
	const matched = /^(\d{1,2}):([0-5]\d)$/.exec(raw.trim());
	if (!matched) return null;
	return (Number(matched[1]) * 60) + Number(matched[2]);
};

// A whole summary payload for one short string, so worth asking only where the league sends it —
// MLB did and the NFL and MLS did not, when sampled in September 2026.
export const fetchGameDurationMins = async (game: Pick<Game, 'id' | 'league'>): Promise<number | null> => {
	const config = leagueConfigMap[game.league];
	if (!config) return null;

	const url = `${espnBase}/${config.espnPath}/summary?event=${encodeURIComponent(game.id)}`;
	await takeRequestSlot();
	const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
	if (!res.ok) throw new Error(`Failed to fetch the duration of ${game.id}: HTTP ${res.status}`);
	return parseGameDurationMins(await res.json());
};

export interface EspnTeamEntry {
	leagueId: LeagueId;
	id: string;
	name: string;
	abbreviation: string;
	logo?: string;
}


const espnImageHost = 'https://a.espncdn.com';

// ESPN draws the mono marks at 4096x4096 — 225KB apiece for something that renders at 15px in a
// guide bar. The combiner is their own resizer and hands the same transparent PNG back at about 6KB.
export const monoLogoUrl = (href: string | undefined, size: number): string | undefined => {
	if (!href || !href.startsWith(`${espnImageHost}/`)) return undefined;
	return `${espnImageHost}/combiner/i?img=${href.slice(espnImageHost.length)}&w=${size}&h=${size}`;
};

// The white and black marks out of a team's logo list, whichever of them ESPN has drawn. Shared
// with the popup's `/summary` parse, which reads the same `rel` names off a different payload —
// two copies is how a renamed `rel` gets fixed in one of the places that reads it.
export const monoMarksFromLogos = (
	logos: { href?: string; rel?: string[] }[] | undefined,
	size = 120,
): TeamMonoMarks | null => {
	const of = (rel: string) => monoLogoUrl(logos?.find(logo => logo.rel?.includes(rel))?.href, size);
	const white = of('primary_logo_white');
	const black = of('primary_logo_black');
	if (!white && !black) return null;
	const marks: TeamMonoMarks = {};
	if (white) marks.white = white;
	if (black) marks.black = black;
	return marks;
};

// A league's teams keyed by id to ESPN's all-white mark. The scoreboard carries a single logo per
// competitor and no variants at all, so a surface that wants the white one has to ask `/teams` —
// which is one request per league and, gzipped, 7KB for the NFL and about 100KB for the whole of
// college football. Cached by the caller; team artwork does not change on the scale of a session.
export const fetchTeamMonoLogos = async (leagueIds: LeagueId[], size = 120): Promise<TeamMonoLogoMap> => {
	const configs = getEnabledLeagueConfigs(leagueIds);
	if (configs.length === 0) return {};

	const results = await settledInPool(configs, async (config) => {
		const url = `${espnBase}/${config.espnPath}/teams?limit=1000`;
		await takeRequestSlot();
		const res = await fetch(url, { headers: { Accept: 'application/json' } });
		if (!res.ok) throw new Error(`Failed to fetch team logos for ${config.id}: HTTP ${res.status}`);
		const parsed = parseTeams(await res.json());
		const entries = parsed.teams.reduce<Record<string, TeamMonoMarks>>((acc, { team }) => {
			const marks = monoMarksFromLogos(team.logos, size);
			if (team.id && marks) acc[team.id] = marks;
			return acc;
		}, {});
		return [config.id, entries] as const;
	});

	// A league that fails contributes nothing and the rest still land: a missing mark falls back to
	// the tinted disc, which is the state every team outside North America is in anyway.
	return results.reduce<TeamMonoLogoMap>((acc, result) => {
		if (result.status === 'fulfilled' && Object.keys(result.value[1]).length > 0) {
			acc[result.value[0]] = result.value[1];
		}
		return acc;
	}, {});
};

export const fetchTeamsForLeagues = async (leagueIds: LeagueId[]): Promise<EspnTeamEntry[]> => {
	if (leagueIds.length === 0) return [];

	const leagueConfigs = getEnabledLeagueConfigs(leagueIds);
	if (leagueConfigs.length === 0) return [];

	const results = await settledInPool(leagueConfigs, async (config): Promise<EspnTeamEntry[]> => {
		const params = new URLSearchParams({ limit: '200' });
		if (config.id === 'ncaab') params.set('groups', '50');
		if (config.id === 'ncaaw') params.set('groups', '49');
		const url = `${espnBase}/${config.espnPath}/teams?${params.toString()}`;
		await takeRequestSlot();
		const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
		if (!res.ok) throw new Error(`Failed to fetch teams for ${config.id}: HTTP ${res.status}`);
		const parsed = parseTeams(await res.json());
		warnOnDroppedCountChange(
			`teams:${config.id}`,
			parsed.droppedTeams,
			() => `Skipped ${parsed.droppedTeams} unparseable ${config.id} team(s); kept ${parsed.teams.length}.`,
		);
		return parsed.teams
			.filter(({ team }) => team.id && team.displayName)
			.map(({ team }) => ({
				leagueId: config.id,
				id: team.id,
				name: team.displayName,
				abbreviation: team.abbreviation || team.displayName.slice(0, 3).toUpperCase(),
				logo: team.logos?.[0]?.href,
			}));
	});

	const fulfilled = results
		.filter((result): result is PromiseFulfilledResult<EspnTeamEntry[]> => result.status === 'fulfilled')
		.flatMap(result => result.value);
	if (fulfilled.length > 0) return fulfilled;

	const firstError = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
	throw (firstError?.reason instanceof Error
		? firstError.reason
		: new Error('Failed to fetch teams for selected leagues'));
};

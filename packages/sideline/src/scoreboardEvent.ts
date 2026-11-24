import { leagueConfigMap, logWarn } from '@arenaswap/core';
import type { AtBat, AtBatPlayer, Game, GameCondition, RedCardEvent, SeriesState, GameOdds, LeagueId, ProbableStarter, TeamLeader } from '@arenaswap/core';
import { deriveBasketballPossession } from './basketballPossession';
import { readCollegeBracket } from './collegeBracket';
import { parseClockTenths, parseClockToSeconds, parseStoppageMinutes } from './gameClock';
import { collegeBaseballLeagues, gradePostseason, readEventHeadline } from './postseasonRound';
import { isAbandonedStatus, isCanceledStatus, readDelayKind, readDisruption, readDoubleheader, readForfeitWinner, readMakeupDate, readPostponedReason } from './disruption';
import { detailClock, parseBroadcastLogos, parseConference, parseGoalEvents } from './scoreboardExtras';
import { parseScoreboard } from './espnSchemas';
import type {
	EspnCompetition,
	EspnCompetitor,
	EspnEvent,
	EspnProbable,
	EspnOddsProvider,
	EspnSituation,
	EspnSituationPlayer,
	EspnVenueAddress,
} from './espnSchemas';

const warnedUnknownStates = new Set<string>();

// A state ESPN has never sent before is read from the rest of the status, so the game stays on the
// slate: scheduled games arrive with period 0, and `completed` is the feed's own word on a final.
const parseStatus = (status: EspnEvent['competitions'][number]['status']): Game['status'] | undefined => {
	const state = status.type?.state;
	if (!state?.trim()) return undefined;
	const normalized = state.trim().toLowerCase();
	if (normalized === 'pre' || normalized === 'scheduled') return 'pre';
	if (normalized === 'in' || normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'live') return 'in';
	if (normalized === 'post') return 'post';
	if (!warnedUnknownStates.has(state)) {
		warnedUnknownStates.add(state);
		logWarn(`Unrecognised game state "${state}" (${status.type?.name ?? 'no name'}); reading it from the period and completed flag.`);
	}
	if (status.type?.completed === true) return 'post';
	return (status.period ?? 0) > 0 ? 'in' : 'pre';
};

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
	return { color: p, alternateColor: a };
};

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

const homeRecordTypes = new Set(['home', 'homerecord']);

const parseCompetitorHomeRecord = (competitor: EspnCompetitor): string | undefined => {
	const home = competitor.records?.find(entry => entry.type !== undefined && homeRecordTypes.has(entry.type));
	return (home?.summary ?? home?.displayValue ?? '').trim() || undefined;
};

// Baseball's `probableStartingPitcher` and hockey's `probableStartingGoalie` are the only two
// values ESPN sends.
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
// anything dedupes on the result.
const normalizeLeaderCategory = (name: string): string => (
	name.replace(/(Leaders|Leader)$/, '').toLowerCase()
);

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

const parseTeamContext = (competitor: EspnCompetitor, state: Game['status']) => ({
	record: parseCompetitorRecord(competitor),
	homeRecord: parseCompetitorHomeRecord(competitor),
	rank: parseCuratedRank(competitor),
	conferenceId: competitor.team.conferenceId || undefined,
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
	// ESPN inconsistently puts the text label in either displayValue or conditionId, and the
	// AccuWeather icon number in whichever one is left.
	const fields = [w.displayValue, w.conditionId].map(v => v?.trim() ?? '');
	const label = fields.find(v => v && !/^\d+$/.test(v));
	if (!label) return undefined;
	const code = fields.find(v => /^\d+$/.test(v));
	return { temperatureF: Math.round(w.temperature), conditionLabel: label, conditionCode: code ? Number(code) : undefined };
};

const readHomeWinProbability = (situation: EspnSituation): number | undefined => {
	const value = situation.lastPlay?.probability?.homeWinPercentage;
	return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : undefined;
};

const downOrdinals = ['', '1st', '2nd', '3rd', '4th'] as const;

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

const parseLastPlayTeam = (situation: EspnSituation, homeId: string, awayId: string): string | undefined => {
	const candidate = situation.lastPlay?.team?.id;
	return candidate === homeId || candidate === awayId ? candidate : undefined;
};

const parseAtBatPlayer = (player: EspnSituationPlayer | undefined): AtBatPlayer | undefined => {
	const athlete = player?.athlete;
	const name = athlete?.displayName?.trim() || athlete?.shortName?.trim();
	if (!name) return undefined;
	return {
		id: player?.playerId,
		name,
		headshot: athlete?.headshot?.trim() || undefined,
		jersey: athlete?.jersey?.trim() || undefined,
		position: athlete?.position?.trim() || undefined,
		summary: player?.summary?.trim() || undefined,
	};
};

// ESPN drops the pitcher and batter pair between innings while the rest of the situation survives.
const parseAtBat = (situation: EspnSituation): AtBat | undefined => {
	const pitcher = parseAtBatPlayer(situation.pitcher);
	const batter = parseAtBatPlayer(situation.batter);
	return pitcher && batter ? { pitcher, batter } : undefined;
};

const dueUpLimit = 3;

const parseDueUp = (situation: EspnSituation): AtBatPlayer[] | undefined => {
	const hitters = (situation.dueUp ?? [])
		.map(parseAtBatPlayer)
		.filter((player): player is AtBatPlayer => player !== undefined)
		.slice(0, dueUpLimit);
	return hitters.length > 0 ? hitters : undefined;
};

// `possession` disappears at every dead ball while the rest of the situation survives, so a
// timeout or the end of a quarter would otherwise take the field diagram's direction of travel
// with it. `lastPlay.team` holds the offense through those states.
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

const olympicHeadlineLeagues = new Set<LeagueId>(['olybkm', 'olybkw', 'olymih', 'olywih', 'olybb']);
const postseasonHeadlinePattern = /quarterfinal|semifinal|medal game/i;

// NCAA baseball and softball run a stage per season type rather than one `post-season`: 3 is the
// Regionals, 4 the Super Regionals, 5 the College World Series and 6 the Championship Series.
const collegeBaseballPostseasonTypes = new Set([3, 4, 5, 6]);

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

// The slug rather than `type === 1`: soccer's `season.type` is a per-competition id (the NWSL's
// regular season is 14024), so a number could collide where the slug cannot.
const resolvePreseason = (event: EspnEvent): boolean => event.season?.slug?.trim().toLowerCase() === 'preseason';

const soccerFinishSuffixes: Record<string, string> = {
	STATUS_FINAL_AET: 'AET',
	STATUS_FINAL_PEN: 'Pens',
};

const parseFinalPeriodSuffix = (state: Game['status'], statusName?: string, shortDetail?: string): string | undefined => {
	if (state !== 'post') return undefined;
	const soccerSuffix = statusName ? soccerFinishSuffixes[statusName] : undefined;
	if (soccerSuffix) return soccerSuffix;
	if (!shortDetail) return undefined;
	const suffix = shortDetail.split('/')[1]?.trim();
	return suffix ? suffix : undefined;
};

const parseTopOfInning = (shortDetail?: string): boolean | undefined => {
	if (!shortDetail) return undefined;
	if (shortDetail.startsWith('Top')) return true;
	if (shortDetail.startsWith('Bot') || shortDetail.startsWith('Mid')) return false;
	return undefined;
};

const parseSeries = (comp: EspnCompetition, homeId: string, awayId: string): SeriesState | undefined => {
	const series = comp.series;
	if (!series?.totalCompetitions || !series.competitors) return undefined;
	const winsOf = (id: string) => series.competitors!.find(entry => entry.id === id)?.wins;
	const homeWins = winsOf(homeId);
	const awayWins = winsOf(awayId);
	if (homeWins === undefined || awayWins === undefined) return undefined;
	return { kind: series.type === 'playoff' ? 'playoff' : 'season', homeWins, awayWins, bestOf: series.totalCompetitions };
};

const parseRedCards = (comp: EspnCompetition): RedCardEvent[] | undefined => {
	const cards = (comp.details ?? [])
		.filter(detail => detail.redCard === true && detail.team?.id !== undefined && typeof detail.clock?.value === 'number')
		.map((detail): RedCardEvent => ({
			teamId: detail.team!.id!,
			...detailClock(detail)!,
			...(detail.athletesInvolved?.[0]?.displayName ? { player: detail.athletesInvolved[0].displayName } : {}),
		}));
	return cards.length > 0 ? cards : undefined;
};

export const parseEvent = (event: EspnEvent, league: LeagueId): Game | null => {
	const comp = event.competitions[0];
	if (!comp) return null;
	const home = comp.competitors.find(c => c.homeAway === 'home');
	const away = comp.competitors.find(c => c.homeAway === 'away');
	if (!home || !away) return null;
	const status = comp.status;
	if (isCanceledStatus(status.type?.name) && comp.series?.completed === true) return null;
	const isDelayed = /delay|suspend/i.test(status.type?.name ?? '');
	const delayDescription = isDelayed ? (status.type?.description?.trim() || undefined) : undefined;
	const leagueConfig = leagueConfigMap[league];
	const isInningSport = leagueConfig.periodFormat === 'innings';
	// A suspended match arrives as `post` with `completed: false` and usually resumes within the
	// hour, so it stays live and delayed. Baseball is the exception: a suspended game resumes on a
	// later day, and reading it as finished is the closer answer until then.
	const parsedState = parseStatus(status);
	if (!parsedState) return null;
	const isSuspendedMidGame = parsedState === 'post' && status.type?.completed === false && isDelayed && !isInningSport;
	const calledOff = isCanceledStatus(status.type?.name) || isAbandonedStatus(status.type?.name);
	const state = calledOff ? 'post' : isSuspendedMidGame ? 'in' : parsedState;
	const disruption = readDisruption(status.type?.name, state);
	const headline = readEventHeadline(comp.notes);
	const situation = comp.situation;
	const isGridironSituation = leagueConfig.sportType === 'football' && state === 'in' && situation !== undefined;
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
			shortName: home.team.shortDisplayName,
			abbreviation: home.team.abbreviation || home.team.displayName?.slice(0, 3).toUpperCase() || '?',
			score: parseInt(home.score ?? '0', 10) || 0,
			shootoutScore: home.shootoutScore,
			logo: home.team.logo ?? undefined,
			...resolveTeamColors(home.team.color, home.team.alternateColor),
			...parseTeamContext(home, state),
			timeouts: liveSituation ? situation.homeTimeouts : undefined,
			...(isInningSport && home.hits !== undefined ? { hits: home.hits, errors: home.errors } : {}),
		},
		awayTeam: {
			id: away.id,
			name: away.team.displayName,
			nickname: away.team.name,
			shortName: away.team.shortDisplayName,
			abbreviation: away.team.abbreviation || away.team.displayName?.slice(0, 3).toUpperCase() || '?',
			score: parseInt(away.score ?? '0', 10) || 0,
			shootoutScore: away.shootoutScore,
			logo: away.team.logo ?? undefined,
			...resolveTeamColors(away.team.color, away.team.alternateColor),
			...parseTeamContext(away, state),
			timeouts: liveSituation ? situation.awayTimeouts : undefined,
			...(isInningSport && away.hits !== undefined ? { hits: away.hits, errors: away.errors } : {}),
		},
		venueName: comp.venue?.fullName ?? comp.venue?.name ?? undefined,
		venueLocation: parseVenueLocation(comp.venue?.address),
		// 0 on every scheduled and in-progress game, so a falsy figure is "not announced yet"
		// rather than an empty stadium.
		attendance: comp.attendance && comp.attendance > 0 ? comp.attendance : undefined,
		finalPeriodSuffix: parseFinalPeriodSuffix(state, status.type?.name, status.type?.shortDetail),
		period: status.period ?? 1,
		clockSeconds: parseClockToSeconds(status.displayClock ?? '0:00'),
		clockStoppageMinutes: leagueConfig.sportType === 'soccer' ? parseStoppageMinutes(status.displayClock ?? '') : undefined,
		clockTenths: parseClockTenths(status.displayClock ?? ''),
		status: state,
		startTime: event.date,
		broadcasts: parseBroadcasts(comp),
		odds: parseOdds(comp),
		intermission: /HALFTIME|END_PERIOD|INTERMISSION/i.test(status.type?.name ?? ''),
		topOfInning: isInningSport ? parseTopOfInning(status.type?.shortDetail) : undefined,
		inningEnded: isInningSport && status.type?.shortDetail?.startsWith('End') ? true : undefined,
		inningBreak: isInningSport && state === 'in' ? /^(Mid|End)\b/.test(status.type?.shortDetail ?? '') : undefined,
		baseRunners: isInningSport && situation ? {
			first: situation.onFirst ?? false,
			second: situation.onSecond ?? false,
			third: situation.onThird ?? false,
		} : undefined,
		// At "Mid" the bottom half has not started, but the feed sometimes still reports the top's three
		// outs, which would credit the road staff with a half-inning it has not pitched yet.
		bso: isInningSport && state === 'in' && situation && typeof situation.balls === 'number'
			? { balls: situation.balls, strikes: situation.strikes ?? 0, outs: status.type?.shortDetail?.startsWith('Mid') ? 0 : situation.outs ?? 0 }
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
		possessionSide: leagueConfig.sportType === 'basketball' && liveSituation
			? deriveBasketballPossession(situation.lastPlay, home.id, away.id)
			: undefined,
		driveStartYardLine: isGridironSituation ? situation.lastPlay?.drive?.start?.yardLine : undefined,
		atBat: isInningSport && liveSituation ? parseAtBat(situation) : undefined,
		dueUp: isInningSport && liveSituation ? parseDueUp(situation) : undefined,
		lastPlay: liveSituation ? parseLastPlay(situation) : undefined,
		lastPlayTeamId: liveSituation ? parseLastPlayTeam(situation, home.id, away.id) : undefined,
		homeWinProbability: liveSituation ? readHomeWinProbability(situation) : undefined,
		lastPlayId: liveSituation ? situation.lastPlay?.id : undefined,
		lastPlayType: liveSituation ? situation.lastPlay?.type?.text?.trim() || undefined : undefined,
		lastPlayDrive: isGridironSituation ? situation.lastPlay?.drive?.description?.trim() || undefined : undefined,
		weather: parseWeather(event, comp.venue?.indoor),
		isPostseason: postseason,
		postseasonRound: grade?.round,
		postseasonLabel: grade?.label,
		isPreseason: resolvePreseason(event),
		...(postseason ? readCollegeBracket(league, readEventHeadline(comp.notes)) : {}),
		delayed: isDelayed || undefined,
		delayDescription,
		delayKind: isDelayed ? readDelayKind(status.type?.name, status.type?.description) : undefined,
		disruption,
		...(disruption === 'postponed' ? {
			postponedReason: readPostponedReason(headline),
			makeupDate: readMakeupDate(headline, event.date),
		} : {}),
		forfeitWinnerId: disruption === 'forfeit' ? readForfeitWinner(headline, comp.competitors) : undefined,
		...(disruption === 'postponed' ? {} : readDoubleheader(headline)),
		series: parseSeries(comp, home.id, away.id),
		redCardEvents: leagueConfig.sportType === 'soccer' ? parseRedCards(comp) : undefined,
		goalEvents: leagueConfig.sportType === 'soccer' ? parseGoalEvents(comp) : undefined,
		broadcastLogos: parseBroadcastLogos(comp),
		neutralSite: comp.neutralSite || undefined,
		conference: parseConference(comp, league),
	};
};

export const parseScoreboardEvents = (raw: unknown, league: LeagueId): Game[] => (
	parseScoreboard(raw).events
		.map(event => parseEvent(event, league))
		.filter((game): game is Game => game !== null)
);

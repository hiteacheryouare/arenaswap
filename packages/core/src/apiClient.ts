import { leagueConfigMap, resolveLeagueLogoUrl } from './constants';
import {
	EspnSummarySchema,
	parseScoreboard,
	parseTeams,
} from './espnSchemas';
import type {
	EspnCompetition,
	EspnCompetitor,
	EspnEvent,
	EspnOddsProvider,
	EspnScoreboardResponse,
	EspnSituation,
} from './espnSchemas';
import { logWarn } from './logger';
import type { Game, GameCondition, GameOdds, LeagueConfig, LeagueId, LeagueLogoMap, ProbableStarter, TeamLeader } from './types';

const espnBase = 'https://site.api.espn.com/apis/site/v2/sports';

// ESPN ships a malformed row often enough that a dropped count is a steady state, not an event, so
// warning on every poll would bury the console at the 6s floor. Only a change in the count is news.
const lastWarnedDroppedCounts = new Map<string, number>();

const warnOnDroppedCountChange = (key: string, dropped: number, buildMessage: () => string): void => {
	if (lastWarnedDroppedCounts.get(key) === dropped) return;
	lastWarnedDroppedCounts.set(key, dropped);
	if (dropped > 0) logWarn(buildMessage());
};

const parseClockToSeconds = (clock: string): number => {
	// Soccer prime notation: "85'" or "90'+8'" (base minutes + optional stoppage)
	if (clock.includes("'")) {
		const primeMatch = /^(\d+)'\+(\d+)'$/.exec(clock) ?? /^(\d+)'$/.exec(clock);
		if (primeMatch) {
			const base = parseInt(primeMatch[1]!, 10);
			const stoppage = primeMatch[2] ? parseInt(primeMatch[2], 10) : 0;
			return (base + stoppage) * 60;
		}
		return 0;
	}
	const parts = clock.split(':');
	if (parts.length === 1) {
		const n = Number(parts[0]);
		if (!n || isNaN(n)) return 0;
		// Values in (0,1) are decimal minutes (e.g. ESPN pre-game "0.0", live "0.75" = 45s)
		if (n < 1) return Math.round(n * 60);
		return Math.floor(n);
	}
	if (parts.length !== 2) return 0;
	const [min, sec] = parts.map(Number);
	return ((min ?? 0) * 60) + Math.floor(sec ?? 0);
};

const parseStatus = (state: string): Game['status'] => {
	const normalized = state.trim().toLowerCase();
	if (normalized === 'pre' || normalized === 'scheduled') return 'pre';
	if (normalized === 'in' || normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'live') return 'in';
	return 'post';
};

const toQueryDate = (date: Date): string => (
	`${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`
);

const buildUpcomingDatesRangeQuery = (days: number): string => {
	// ESPN's default no-dates scoreboard only reliably surfaces active and recent games; the
	// explicit range returns every scheduled event, including this morning's pre-game ones.
	const start = new Date();
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + days);
	return `${toQueryDate(start)}-${toQueryDate(end)}`;
};

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
const parseProbableStarter = (competitor: EspnCompetitor): ProbableStarter | undefined => {
	const probable = competitor.probables?.find(entry => entry.name?.startsWith('probableStarting'));
	if (!probable) return undefined;
	const name = probable.athlete?.shortName?.trim() || probable.athlete?.displayName?.trim();
	if (!name) return undefined;
	const status = probable.status?.type?.trim().toLowerCase();
	return {
		name,
		// Empty for every goalie sampled; a pitcher's arrives assembled as "(7-7, 5.17)".
		line: probable.record?.trim() || undefined,
		status: status === 'expected' || status === 'confirmed' ? status : undefined,
	};
};

// ESPN sends the same stat under more than one name — WNBA has both `points` and `pointsPerGame`,
// soccer both `goals` and `goalsLeaders` — so the suffix comes off before anything dedupes on the
// result. `Leaders` is listed before `Leader` because alternation is tried left to right.
const normalizeLeaderCategory = (name: string): string => (
	name.replace(/(PerGame|Leaders|Leader)$/, '').toLowerCase()
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
		leaders.push({ category, fallbackLabel: cat.shortDisplayName?.trim() || name, player, value });
		if (leaders.length === maxLeadersPerTeam) break;
	}

	return leaders.length > 0 ? leaders : undefined;
};

// Spread into both team literals below, the way resolveTeamColors already is. Records ride every
// status; the other two are pre-game only.
const parseTeamContext = (competitor: EspnCompetitor, state: Game['status']) => ({
	record: parseCompetitorRecord(competitor),
	probableStarter: state === 'pre' ? parseProbableStarter(competitor) : undefined,
	leaders: state === 'pre' ? parseTeamLeaders(competitor) : undefined,
});

const parseWeather = (event: EspnEvent): GameCondition | undefined => {
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

const resolvePostseason = (event: EspnEvent, comp: EspnCompetition, league: LeagueId): boolean => {
	if (event.season?.type === 3) return true;

	const slug = event.season?.slug?.trim().toLowerCase();
	if (slug && (postseasonSlugs.has(slug) || postseasonSlugPatterns.some(p => p.test(slug)))) return true;

	if (olympicHeadlineLeagues.has(league)) {
		const headline = comp.notes?.[0]?.headline;
		if (headline && postseasonHeadlinePattern.test(headline)) return true;
	}

	return false;
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

	return {
		id: event.id,
		league,
		sportType: leagueConfig.sportType,
		homeTeam: {
			id: home.id,
			name: home.team.displayName,
			abbreviation: home.team.abbreviation || home.team.displayName?.slice(0, 3).toUpperCase() || '?',
			score: parseInt(home.score ?? '0', 10) || 0,
			shootoutScore: home.shootoutScore,
			logo: home.team.logo ?? undefined,
			...resolveTeamColors(home.team.color, home.team.alternateColor),
			...parseTeamContext(home, state),
		},
		awayTeam: {
			id: away.id,
			name: away.team.displayName,
			abbreviation: away.team.abbreviation || away.team.displayName?.slice(0, 3).toUpperCase() || '?',
			score: parseInt(away.score ?? '0', 10) || 0,
			shootoutScore: away.shootoutScore,
			logo: away.team.logo ?? undefined,
			...resolveTeamColors(away.team.color, away.team.alternateColor),
			...parseTeamContext(away, state),
		},
		venueName: comp.venue?.fullName ?? comp.venue?.name ?? undefined,
		period: status.period ?? 1,
		clockSeconds: parseClockToSeconds(status.displayClock ?? '0:00'),
		status: state,
		startTime: state === 'pre' ? event.date : undefined,
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
		weather: parseWeather(event),
		isPostseason: resolvePostseason(event, comp, league),
		delayed: isDelayed || undefined,
		delayDescription,
	};
};

interface LeagueGamesResult {
	leagueId: LeagueId;
	games: Game[];
	logoUrl: string;
}

const fetchScoreboard = async (url: string, leagueId: LeagueId): Promise<EspnScoreboardResponse> => {
	const res = await fetch(url, {
		headers: {
			'Accept': 'application/json',
		},
	});
	if (!res.ok) throw new LeagueFetchError(leagueId, res.status);
	const parsed = parseScoreboard(await res.json());
	warnOnDroppedCountChange(
		`scoreboard:${leagueId}`,
		parsed.droppedEvents,
		() => `Skipped ${parsed.droppedEvents} unparseable ${leagueId} event(s); kept ${parsed.events.length}.`,
	);
	return parsed;
};

const fetchLeagueGames = async (config: LeagueConfig, options: { includeUpcoming?: boolean; upcomingDays?: number } = {}): Promise<LeagueGamesResult> => {
	const { includeUpcoming = true, upcomingDays = 7 } = options;
	const baseParams = new URLSearchParams();
	// Required for reliable coverage and to avoid 404s on date-range queries.
	if (config.id === 'ncaab') baseParams.set('groups', '50');
	if (config.id === 'ncaaw') baseParams.set('groups', '49');

	const scoreboardUrl = `${espnBase}/${config.espnPath}/scoreboard`;
	const baseQuery = baseParams.toString();
	const baseUrl = baseQuery ? `${scoreboardUrl}?${baseQuery}` : scoreboardUrl;

	if (!includeUpcoming) {
		const todayResult = await fetchScoreboard(baseUrl, config.id);
		const espnLogo = pickLeagueLogo(todayResult?.leagues?.[0]?.logos);
		const logoUrl = resolveLeagueLogoUrl(config.id, espnLogo);
		const parsedGames = (todayResult?.events ?? [])
			.map(event => parseEvent(event, config.id))
			.filter((game): game is Game => game !== null && game.status !== 'post');
		return { leagueId: config.id, games: parsedGames, logoUrl };
	}

	const upcomingDates = buildUpcomingDatesRangeQuery(upcomingDays);
	const upcomingParams = new URLSearchParams(baseParams);
	upcomingParams.set('dates', upcomingDates);
	const upcomingUrl = `${scoreboardUrl}?${upcomingParams.toString()}`;
	const [todayResult, upcomingResult] = await Promise.allSettled([
		fetchScoreboard(baseUrl, config.id),
		fetchScoreboard(upcomingUrl, config.id),
	]);
	if (todayResult.status === 'rejected' && upcomingResult.status === 'rejected') {
		const error = todayResult.reason instanceof Error
			? todayResult.reason
			: upcomingResult.reason;
		throw error;
	}

	const todayData = todayResult.status === 'fulfilled' ? todayResult.value : undefined;
	const upcomingData = upcomingResult.status === 'fulfilled' ? upcomingResult.value : undefined;
	const espnLogo = pickLeagueLogo(todayData?.leagues?.[0]?.logos)
		?? pickLeagueLogo(upcomingData?.leagues?.[0]?.logos);
	const logoUrl = resolveLeagueLogoUrl(config.id, espnLogo);

	const seenIds = new Set<string>();
	const parsedGames = [...(todayData?.events ?? []), ...(upcomingData?.events ?? [])]
		.filter(event => {
			if (seenIds.has(event.id)) return false;
			seenIds.add(event.id);
			return true;
		})
		.map(event => parseEvent(event, config.id))
		.filter((game): game is Game => game !== null && game.status !== 'post');

	return { leagueId: config.id, games: parsedGames, logoUrl };
};

const getEnabledLeagueConfigs = (enabledLeagues: LeagueId[]): LeagueConfig[] => (
	enabledLeagues
		.map(league => leagueConfigMap[league])
		.filter((config): config is LeagueConfig => Boolean(config))
);

export const fetchGamesWithLeagueLogos = async (enabledLeagues: LeagueId[], options: { includeUpcoming?: boolean; upcomingDays?: number } = {}): Promise<{ games: Game[]; leagueLogos: LeagueLogoMap }> => {
	if (enabledLeagues.length === 0) return { games: [], leagueLogos: {} };
	const leagueConfigs = getEnabledLeagueConfigs(enabledLeagues);
	if (leagueConfigs.length === 0) return { games: [], leagueLogos: {} };

	const results = await Promise.allSettled(leagueConfigs.map(config => fetchLeagueGames(config, options)));

	const fulfilled = results
		.filter((r): r is PromiseFulfilledResult<LeagueGamesResult> => r.status === 'fulfilled')
		.map(r => r.value);
	const games = fulfilled.flatMap(result => result.games);
	const leagueLogos = fulfilled.reduce<LeagueLogoMap>((acc, result) => {
		acc[result.leagueId] = result.logoUrl;
		return acc;
	}, {});
	return { games, leagueLogos };
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
	const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: init?.signal });
	if (!res.ok) throw new Error(`Failed to fetch win probability for ${game.id}: HTTP ${res.status}`);

	const parsed = EspnSummarySchema.safeParse(await res.json());
	if (!parsed.success) return [];

	return (parsed.data.winprobability ?? [])
		.map(entry => entry.homeWinPercentage)
		.filter((p): p is number => typeof p === 'number' && Number.isFinite(p))
		.map(p => Math.min(Math.max(p, 0), 1));
};

export interface EspnTeamEntry {
	leagueId: LeagueId;
	id: string;
	name: string;
	abbreviation: string;
	logo?: string;
}


export const fetchTeamsForLeagues = async (leagueIds: LeagueId[]): Promise<EspnTeamEntry[]> => {
	if (leagueIds.length === 0) return [];

	const leagueConfigs = getEnabledLeagueConfigs(leagueIds);
	if (leagueConfigs.length === 0) return [];

	const results = await Promise.allSettled(
		leagueConfigs.map(async (config): Promise<EspnTeamEntry[]> => {
			const params = new URLSearchParams({ limit: '200' });
			if (config.id === 'ncaab') params.set('groups', '50');
			if (config.id === 'ncaaw') params.set('groups', '49');
			const url = `${espnBase}/${config.espnPath}/teams?${params.toString()}`;
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
		})
	);

	const fulfilled = results
		.filter((result): result is PromiseFulfilledResult<EspnTeamEntry[]> => result.status === 'fulfilled')
		.flatMap(result => result.value);
	if (fulfilled.length > 0) return fulfilled;

	const firstError = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
	throw (firstError?.reason instanceof Error
		? firstError.reason
		: new Error('Failed to fetch teams for selected leagues'));
};

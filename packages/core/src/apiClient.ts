import { leagueConfigMap, resolveLeagueLogoUrl } from './constants';
import {
	EspnScoreboardSchema,
	EspnTeamsResponseSchema,
} from './espnSchemas';
import type {
	EspnCompetition,
	EspnEvent,
	EspnOddsProvider,
	EspnScoreboardResponse,
} from './espnSchemas';
import type { Game, GameOdds, LeagueConfig, LeagueId, LeagueLogoMap } from './types';

const espnBase = 'https://site.api.espn.com/apis/site/v2/sports';
const upcomingDateWindowDays = 4;

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

const buildUpcomingDatesRangeQuery = (): string => {
	// Start from today so morning pre-game events aren't missed.
	// ESPN's default (no-dates) scoreboard only reliably surfaces active/recent games;
	// the explicit dates query returns all scheduled events for the requested range.
	const start = new Date();
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + upcomingDateWindowDays);
	return `${toQueryDate(start)}-${toQueryDate(end)}`;
};

// WCAG relative luminance — used to detect colors that would vanish on the app's black background
const hexLuminance = (hex: string): number => {
	const matched = /^#([\da-fA-F]{6})$/.exec(hex);
	if (!matched) return 0;
	const h = matched[1]!;
	const ch = (n: number) => {
		const c = n / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return (0.2126 * ch(parseInt(h.slice(0, 2), 16)))
		+ (0.7152 * ch(parseInt(h.slice(2, 4), 16)))
		+ (0.0722 * ch(parseInt(h.slice(4, 6), 16)));
};

// Colors with luminance below this threshold risk blending into the black app background
const darkOnBlackThreshold = 0.04;

const normalizeTeamColor = (primary?: string, alternate?: string): string | undefined => {
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

	const normalizedPrimary = normalizeOne(primary);
	const normalizedAlternate = normalizeOne(alternate);

	if (!normalizedPrimary) return normalizedAlternate;

	// If the primary color is too dark for the black background, prefer alternate when it's brighter
	if (hexLuminance(normalizedPrimary) < darkOnBlackThreshold) {
		if (normalizedAlternate && hexLuminance(normalizedAlternate) > hexLuminance(normalizedPrimary)) {
			return normalizedAlternate;
		}
	}

	return normalizedPrimary;
};

// ESPN returns multiple logo variants; prefer the "dark" one (light-colored, for dark UIs).
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
	const providerLogoUrl = pickProviderLogo(raw.provider, 'light');
	const providerDarkLogoUrl = pickProviderLogo(raw.provider, 'dark');
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
			? {
				name: providerName,
				logoUrl: providerLogoUrl,
				darkLogoUrl: providerDarkLogoUrl,
			}
			: undefined,
	};

	if (!parsed.details && parsed.overUnder === undefined && !parsed.provider) return undefined;
	return parsed;
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
	const leagueConfig = leagueConfigMap[league];
	const isBaseball = leagueConfig.sportType === 'baseball';
	const situation = comp.situation;

	return {
		id: event.id,
		league,
		sportType: leagueConfig.sportType,
		homeTeam: {
			id: home.id,
			name: home.team.displayName,
			abbreviation: home.team.abbreviation || home.team.displayName?.slice(0, 3).toUpperCase() || '?',
			score: parseInt(home.score ?? '0', 10) || 0,
			logo: home.team.logo ?? undefined,
			color: normalizeTeamColor(home.team.color, home.team.alternateColor),
		},
		awayTeam: {
			id: away.id,
			name: away.team.displayName,
			abbreviation: away.team.abbreviation || away.team.displayName?.slice(0, 3).toUpperCase() || '?',
			score: parseInt(away.score ?? '0', 10) || 0,
			logo: away.team.logo ?? undefined,
			color: normalizeTeamColor(away.team.color, away.team.alternateColor),
		},
		venueName: comp.venue?.fullName ?? comp.venue?.name ?? undefined,
		period: status.period ?? 1,
		clockSeconds: parseClockToSeconds(status.displayClock ?? '0:00'),
		status: state,
		startTime: state === 'pre' ? event.date : undefined,
		broadcasts: parseBroadcasts(comp),
		odds: parseOdds(comp),
		intermission: /HALFTIME|END_PERIOD|INTERMISSION/i.test(status.type?.name ?? ''),
		topOfInning: isBaseball ? parseTopOfInning(status.type?.shortDetail) : undefined,
		baseRunners: isBaseball && situation ? {
			first: situation.onFirst ?? false,
			second: situation.onSecond ?? false,
			third: situation.onThird ?? false,
		} : undefined,
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
	const parsed = EspnScoreboardSchema.safeParse(await res.json());
	if (!parsed.success) return { events: [], leagues: [] };
	return parsed.data;
};

const fetchLeagueGames = async (config: LeagueConfig, options: { includeUpcoming?: boolean } = {}): Promise<LeagueGamesResult> => {
	const { includeUpcoming = true } = options;
	const baseParams = new URLSearchParams();
	// ESPN requires `groups=50` for reliable NCAA men's basketball scoreboard coverage
	// and to avoid 404 responses on date-range queries.
	if (config.id === 'ncaab') baseParams.set('groups', '50');
	// ESPN requires `groups=49` for reliable NCAA women's basketball scoreboard coverage.
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

	const upcomingDates = buildUpcomingDatesRangeQuery();
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

export const fetchGamesWithLeagueLogos = async (enabledLeagues: LeagueId[], options: { includeUpcoming?: boolean } = {}): Promise<{ games: Game[]; leagueLogos: LeagueLogoMap }> => {
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

// Returns all live + upcoming games for enabled leagues (excludes finished games)
export const fetchGames = async (enabledLeagues: LeagueId[]): Promise<Game[]> => {
	if (enabledLeagues.length === 0) return [];
	const { games } = await fetchGamesWithLeagueLogos(enabledLeagues);
	return games;
};

// Convenience: only live games (for switching logic)
export const fetchLiveGames = async (enabledLeagues: LeagueId[]): Promise<Game[]> => {
	const games = await fetchGames(enabledLeagues);
	return games.filter(g => g.status === 'in');
};

export const fetchLeagueLogos = async (enabledLeagues: LeagueId[], options: { includeUpcoming?: boolean } = {}): Promise<LeagueLogoMap> => {
	const { leagueLogos } = await fetchGamesWithLeagueLogos(enabledLeagues, options);
	return leagueLogos;
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
			const parsed = EspnTeamsResponseSchema.safeParse(await res.json());
			const rawTeams = parsed.success ? (parsed.data?.sports?.[0]?.leagues?.[0]?.teams ?? []) : [];
			return rawTeams
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

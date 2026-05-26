import { leagueConfigMap, resolveLeagueLogoUrl } from './constants';
import type { Game, GameOdds, LeagueConfig, LeagueId, LeagueLogoMap } from './types';

const espnBase = 'https://site.api.espn.com/apis/site/v2/sports';
const upcomingDateWindowDays = 4;

const parseClockToSeconds = (clock: string): number => {
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
	const start = new Date();
	start.setUTCDate(start.getUTCDate() + 1);
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + (upcomingDateWindowDays - 1));
	return `${toQueryDate(start)}-${toQueryDate(end)}`;
};

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

	return normalizeOne(primary) ?? normalizeOne(alternate);
};

interface EspnLeagueLogo {
	href?: string;
}

interface EspnLeague {
	id?: string;
	logos?: EspnLeagueLogo[];
}

interface EspnTeam {
	displayName: string;
	abbreviation?: string;
	logo?: string;
	/** Primary team color as a hex string without '#' (e.g. "002B5C") */
	color?: string;
	/** Secondary team color as a hex string without '#' */
	alternateColor?: string;
}

interface EspnCompetitor {
	id: string;
	homeAway: 'home' | 'away' | string;
	score?: string;
	team: EspnTeam;
}

interface EspnCompetitionStatus {
	period?: number;
	displayClock?: string;
	type?: {
		state?: string;
		name?: string;
		shortDetail?: string;
	};
}

interface EspnSituation {
	onFirst?: boolean;
	onSecond?: boolean;
	onThird?: boolean;
}

interface EspnCompetitionVenue {
	fullName?: string;
	name?: string;
}

interface EspnCompetitionBroadcast {
	names?: string[];
}

interface EspnCompetitionGeoBroadcast {
	media?: {
		shortName?: string;
	};
}

interface EspnOddsProviderLogo {
	href?: string;
	rel?: string[];
}

interface EspnOddsProvider {
	name?: string;
	displayName?: string;
	logos?: EspnOddsProviderLogo[];
}

interface EspnCompetitionOdds {
	details?: string;
	overUnder?: number | string;
	provider?: EspnOddsProvider;
}

interface EspnCompetition {
	competitors: EspnCompetitor[];
	status: EspnCompetitionStatus;
	situation?: EspnSituation;
	venue?: EspnCompetitionVenue;
	broadcasts?: EspnCompetitionBroadcast[];
	geoBroadcasts?: EspnCompetitionGeoBroadcast[];
	odds?: EspnCompetitionOdds[];
}

interface EspnEvent {
	id: string;
	date?: string;
	status?: {
		type?: {
			state?: string;
		};
	};
	competitions: EspnCompetition[];
}

interface EspnScoreboardResponse {
	events?: EspnEvent[];
	leagues?: EspnLeague[];
}

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
	return res.json() as Promise<EspnScoreboardResponse>;
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
		const espnLogo = todayResult?.leagues?.[0]?.logos?.[0]?.href;
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
	const espnLogo = todayData?.leagues?.[0]?.logos?.[0]?.href
		?? upcomingData?.leagues?.[0]?.logos?.[0]?.href;
	const logoUrl = resolveLeagueLogoUrl(config.id, espnLogo);

	const parsedGames = [...(todayData?.events ?? []), ...(upcomingData?.events ?? [])]
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

export const fetchLeagueLogos = async (enabledLeagues: LeagueId[]): Promise<LeagueLogoMap> => {
	const { leagueLogos } = await fetchGamesWithLeagueLogos(enabledLeagues);
	return leagueLogos;
};

export interface EspnTeamEntry {
	leagueId: LeagueId;
	id: string;
	name: string;
	abbreviation: string;
	logo?: string;
}

interface EspnTeamsResponse {
	sports?: Array<{
		leagues?: Array<{
			teams?: Array<{
				team: {
					id: string;
					displayName: string;
					abbreviation?: string;
					logos?: Array<{ href: string }>;
				};
			}>;
		}>;
	}>;
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
			const json = await res.json() as EspnTeamsResponse;
			const rawTeams = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
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

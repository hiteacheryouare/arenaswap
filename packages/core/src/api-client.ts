import { LEAGUE_CONFIG_MAP, resolveLeagueLogoUrl } from './constants';
import type { LeagueConfig } from './constants';
import type { Game, GameOdds, LeagueId, LeagueLogoMap } from './types';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const UPCOMING_DATE_WINDOW_DAYS = 4;
const SESSION_DISABLE_ON_FAILURE_LEAGUES = new Set<LeagueId>(['pwhl']);
const sessionDisabledLeagues = new Set<LeagueId>();

const parseClockToSeconds = (clock: string): number => {
	const parts = clock.split(':');
	if (parts.length !== 2) return 0;
	const [min, sec] = parts.map(Number);
	return (min * 60) + sec;
};

const parseStatus = (state: string): Game['status'] => {
	if (state === 'pre') return 'pre';
	if (state === 'in') return 'in';
	return 'post';
};

const toQueryDate = (date: Date): string => (
	`${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`
);

const buildDatesRangeQuery = (): string => {
	const start = new Date();
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + UPCOMING_DATE_WINDOW_DAYS);
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
	abbreviation: string;
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
	};
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

const pickProviderLogo = (provider?: EspnOddsProvider): string | undefined => {
	if (!provider?.logos?.length) return undefined;
	const light = provider.logos.find(logo => logo.rel?.includes('light') && logo.href);
	if (light?.href) return light.href;
	return provider.logos.find(logo => Boolean(logo.href))?.href;
};

const parseOdds = (competition: EspnCompetition): GameOdds | undefined => {
	const raw = competition.odds?.[0];
	if (!raw) return undefined;
	const providerName = raw.provider?.displayName ?? raw.provider?.name;
	const providerLogoUrl = pickProviderLogo(raw.provider);
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
			}
			: undefined,
	};

	if (!parsed.details && parsed.overUnder === undefined && !parsed.provider) return undefined;
	return parsed;
};

const parseEvent = (event: EspnEvent, league: LeagueId): Game | null => {
	const comp = event.competitions[0];
	if (!comp) return null;
	const home = comp.competitors.find(c => c.homeAway === 'home');
	const away = comp.competitors.find(c => c.homeAway === 'away');
	if (!home || !away) return null;
	const status = comp.status;
	const state = parseStatus(status.type?.state ?? 'post');
	const leagueConfig = LEAGUE_CONFIG_MAP[league];

	return {
		id: event.id,
		league,
		sportType: leagueConfig.sportType,
		homeTeam: {
			id: home.id,
			name: home.team.displayName,
			abbreviation: home.team.abbreviation,
			score: parseInt(home.score ?? '0', 10) || 0,
			logo: home.team.logo ?? undefined,
			color: normalizeTeamColor(home.team.color, home.team.alternateColor),
		},
		awayTeam: {
			id: away.id,
			name: away.team.displayName,
			abbreviation: away.team.abbreviation,
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
	};
};

interface LeagueGamesResult {
	leagueId: LeagueId;
	games: Game[];
	logoUrl: string;
}

const fetchLeagueGames = async (config: LeagueConfig): Promise<LeagueGamesResult> => {
	const dates = buildDatesRangeQuery();
	const url = `${ESPN_BASE}/${config.espnPath}/scoreboard?dates=${dates}`;
	const res = await fetch(url, {
		headers: {
			'Accept': 'application/json',
		},
	});
	if (!res.ok) throw new LeagueFetchError(config.id, res.status);
	const data = await res.json() as EspnScoreboardResponse;
	const espnLogo = data.leagues?.[0]?.logos?.[0]?.href;
	const logoUrl = resolveLeagueLogoUrl(config.id, espnLogo);

	const games = (data.events ?? [])
		.filter(event => event.status?.type?.state !== 'post')
		.map(event => parseEvent(event, config.id))
		.filter((game): game is Game => Boolean(game));

	return { leagueId: config.id, games, logoUrl };
};

const getEnabledLeagueConfigs = (enabledLeagues: LeagueId[]): LeagueConfig[] => (
	enabledLeagues
		.map(league => LEAGUE_CONFIG_MAP[league])
		.filter((config): config is LeagueConfig => Boolean(config))
		.filter(config => !sessionDisabledLeagues.has(config.id))
);

const shouldSessionDisableLeague = (error: LeagueFetchError): boolean => (
	SESSION_DISABLE_ON_FAILURE_LEAGUES.has(error.leagueId)
	&& error.status !== undefined
	&& error.status >= 400
	&& error.status < 500
);

export const fetchGamesWithLeagueLogos = async (enabledLeagues: LeagueId[]): Promise<{ games: Game[]; leagueLogos: LeagueLogoMap }> => {
	if (enabledLeagues.length === 0) return { games: [], leagueLogos: {} };
	const leagueConfigs = getEnabledLeagueConfigs(enabledLeagues);
	if (leagueConfigs.length === 0) return { games: [], leagueLogos: {} };

	const results = await Promise.allSettled(leagueConfigs.map(fetchLeagueGames));
	for (const result of results) {
		if (result.status !== 'rejected') continue;
		const reason = result.reason;
		if (reason instanceof LeagueFetchError && shouldSessionDisableLeague(reason)) {
			sessionDisabledLeagues.add(reason.leagueId);
		}
	}

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

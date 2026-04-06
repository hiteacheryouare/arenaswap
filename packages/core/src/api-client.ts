import { LEAGUE_CONFIG_MAP, resolveLeagueLogoUrl } from './constants';
import type { LeagueConfig } from './constants';
import type { Game, LeagueId, LeagueLogoMap } from './types';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

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

interface EspnCompetition {
	competitors: EspnCompetitor[];
	status: EspnCompetitionStatus;
	venue?: EspnCompetitionVenue;
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
			color: home.team.color ? `#${home.team.color}` : undefined,
		},
		awayTeam: {
			id: away.id,
			name: away.team.displayName,
			abbreviation: away.team.abbreviation,
			score: parseInt(away.score ?? '0', 10) || 0,
			logo: away.team.logo ?? undefined,
			color: away.team.color ? `#${away.team.color}` : undefined,
		},
		venueName: comp.venue?.fullName ?? comp.venue?.name ?? undefined,
		period: status.period ?? 1,
		clockSeconds: parseClockToSeconds(status.displayClock ?? '0:00'),
		status: state,
		startTime: state === 'pre' ? event.date : undefined,
		intermission: /HALFTIME|END_PERIOD|INTERMISSION/i.test(status.type?.name ?? ''),
	};
};

interface LeagueGamesResult {
	leagueId: LeagueId;
	games: Game[];
	logoUrl: string;
}

const fetchLeagueGames = async (config: LeagueConfig): Promise<LeagueGamesResult> => {
	const url = `${ESPN_BASE}/${config.espnPath}/scoreboard`;
	const res = await fetch(url, {
		headers: {
			'Accept': 'application/json',
		},
	});
	if (!res.ok) throw new Error(`ESPN ${config.id} API returned ${res.status}`);
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
);

export const fetchGamesWithLeagueLogos = async (enabledLeagues: LeagueId[]): Promise<{ games: Game[]; leagueLogos: LeagueLogoMap }> => {
	if (enabledLeagues.length === 0) return { games: [], leagueLogos: {} };
	const leagueConfigs = getEnabledLeagueConfigs(enabledLeagues);
	const results = await Promise.allSettled(leagueConfigs.map(fetchLeagueGames));
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

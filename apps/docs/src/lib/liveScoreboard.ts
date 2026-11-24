import { leagueConfigMap } from 'powerscore';
import type { Game, LeagueId } from 'powerscore';
import { parseClockToSeconds } from '@arenaswap/sideline/gameClock';

interface EspnCompetitor {
	id: string;
	homeAway: 'home' | 'away' | string;
	score?: string;
	team: {
		displayName: string;
		abbreviation?: string;
		name?: string;
		shortDisplayName?: string;
	};
}

interface EspnCompetition {
	competitors: EspnCompetitor[];
	status: {
		period?: number;
		displayClock?: string;
		type?: {
			state?: string;
			name?: string;
		};
	};
}

interface EspnEvent {
	id: string;
	competitions: EspnCompetition[];
}

interface EspnScoreboardResponse {
	events?: EspnEvent[];
}

const nicknameOf = (team: EspnCompetitor['team'], sportType: Game['sportType']): string | undefined => (
	sportType === 'soccer' ? team.shortDisplayName ?? team.name : team.name ?? team.shortDisplayName
);

const espnBase = 'https://site.api.espn.com/apis/site/v2/sports';
const requestPoolSize = 6;

const parseLiveState = (state?: string): boolean => {
	const normalized = (state ?? '').trim().toLowerCase();
	return normalized === 'in' || normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'live';
};

const buildScoreboardUrl = (leagueId: LeagueId): string => {
	const config = leagueConfigMap[leagueId];
	const params = new URLSearchParams();
	if (leagueId === 'ncaab' || leagueId === 'ncaaw') params.set('groups', '50');
	const query = params.toString();
	const url = `${espnBase}/${config.espnPath}/scoreboard`;
	return query ? `${url}?${query}` : url;
};

const parseLiveGames = (leagueId: LeagueId, payload: EspnScoreboardResponse): Game[] => {
	const config = leagueConfigMap[leagueId];
	return (payload.events ?? []).flatMap(event => {
		const competition = event.competitions?.[0];
		if (!competition) return [];
		const state = competition.status?.type?.state;
		if (!parseLiveState(state)) return [];
		const home = competition.competitors.find(team => team.homeAway === 'home');
		const away = competition.competitors.find(team => team.homeAway === 'away');
		if (!home || !away) return [];

		return [{
			id: event.id,
			league: config.id,
			sportType: config.sportType,
			homeTeam: {
				abbreviation: home.team.abbreviation || home.team.displayName?.slice(0, 3).toUpperCase() || 'HOME',
				nickname: nicknameOf(home.team, config.sportType),
				score: Number.parseInt(home.score ?? '0', 10) || 0,
			},
			awayTeam: {
				abbreviation: away.team.abbreviation || away.team.displayName?.slice(0, 3).toUpperCase() || 'AWAY',
				nickname: nicknameOf(away.team, config.sportType),
				score: Number.parseInt(away.score ?? '0', 10) || 0,
			},
			period: competition.status?.period ?? 1,
			clockSeconds: parseClockToSeconds(competition.status?.displayClock ?? '0:00'),
			intermission: /HALFTIME|END_PERIOD|INTERMISSION/i.test(competition.status?.type?.name ?? ''),
		}];
	});
};

const mapInPool = async <T, R>(items: T[], run: (item: T) => Promise<R>, size = requestPoolSize): Promise<R[]> => {
	const results: R[] = [];
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const index = next;
			next += 1;
			results[index] = await run(items[index] as T);
		}
	};
	await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => worker()));
	return results;
};

interface leagueSweep {
	games: Game[];
	shed: number;
}

const fetchLiveGames = async (leagueIds: LeagueId[]): Promise<leagueSweep> => {
	const perLeague = await mapInPool(leagueIds, async (leagueId): Promise<Game[] | null> => {
		try {
			const res = await fetch(buildScoreboardUrl(leagueId));
			if (!res.ok) return null;
			return parseLiveGames(leagueId, await res.json() as EspnScoreboardResponse);
		} catch {
			return null;
		}
	});

	return {
		games: perLeague.flatMap(games => games ?? []),
		shed: perLeague.filter(games => games === null).length,
	};
};

export default fetchLiveGames;

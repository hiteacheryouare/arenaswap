import { SPORT_CONFIGS } from './constants';
import type { SportConfig } from './constants';
import type { Game, SportId } from './types';

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

const parseEvent = (event: any, sport: SportId): Game => {
	const comp = event.competitions[0];
	const home = comp.competitors.find((c: any) => c.homeAway === 'home');
	const away = comp.competitors.find((c: any) => c.homeAway === 'away');
	const status = comp.status;
	const state = parseStatus(status.type?.state ?? 'post');

	return {
		id: event.id,
		sport,
		homeTeam: {
			id: home.id,
			name: home.team.displayName,
			abbreviation: home.team.abbreviation,
			score: parseInt(home.score, 10) || 0,
			logo: home.team.logo ?? undefined,
		},
		awayTeam: {
			id: away.id,
			name: away.team.displayName,
			abbreviation: away.team.abbreviation,
			score: parseInt(away.score, 10) || 0,
			logo: away.team.logo ?? undefined,
		},
		venueName: comp.venue?.fullName ?? comp.venue?.name ?? undefined,
		period: status.period ?? 1,
		clockSeconds: parseClockToSeconds(status.displayClock ?? '0:00'),
		status: state,
		startTime: state === 'pre' ? event.date : undefined,
	};
};

const fetchSportGames = async (config: SportConfig): Promise<Game[]> => {
	const url = `${ESPN_BASE}/${config.espnPath}/scoreboard`;
	const res = await fetch(url, {
		headers: {
			'User-Agent': navigator.userAgent,
			'Accept': 'application/json',
		},
	});
	if (!res.ok) throw new Error(`ESPN ${config.id} API returned ${res.status}`);
	const data = await res.json();

	return (data.events ?? [])
		.filter((e: any) => e.status?.type?.state !== 'post')
		.map((e: any) => parseEvent(e, config.id));
};

// Returns all live + upcoming games across all supported sports (excludes finished games)
export const fetchGames = async (): Promise<Game[]> => {
	const results = await Promise.allSettled(SPORT_CONFIGS.map(fetchSportGames));
	return results
		.filter((r): r is PromiseFulfilledResult<Game[]> => r.status === 'fulfilled')
		.flatMap(r => r.value);
};

// Convenience: only live games (for switching logic)
export const fetchLiveGames = async (): Promise<Game[]> => {
	const games = await fetchGames();
	return games.filter(g => g.status === 'in');
};

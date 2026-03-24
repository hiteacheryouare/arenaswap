import { ESPN_SCOREBOARD_URL } from './constants';
import type { Game } from './types';

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

const parseEvent = (event: any): Game => {
	const comp = event.competitions[0];
	const home = comp.competitors.find((c: any) => c.homeAway === 'home');
	const away = comp.competitors.find((c: any) => c.homeAway === 'away');
	const status = comp.status;
	const state = parseStatus(status.type?.state ?? 'post');

	return {
		id: event.id,
		homeTeam: {
			id: home.id,
			name: home.team.displayName,
			abbreviation: home.team.abbreviation,
			score: parseInt(home.score, 10) || 0,
		},
		awayTeam: {
			id: away.id,
			name: away.team.displayName,
			abbreviation: away.team.abbreviation,
			score: parseInt(away.score, 10) || 0,
		},
		period: status.period ?? 1,
		clockSeconds: parseClockToSeconds(status.displayClock ?? '20:00'),
		status: state,
		startTime: state === 'pre' ? event.date : undefined,
	};
};

// Returns all live + upcoming games (excludes finished games)
export const fetchGames = async (): Promise<Game[]> => {
	const res = await fetch(ESPN_SCOREBOARD_URL, {
		headers: {
			'User-Agent': navigator.userAgent,
			'Accept': 'application/json',
		},
	});
	if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);
	const data = await res.json();

	return (data.events ?? [])
		.filter((e: any) => e.status?.type?.state !== 'post')
		.map(parseEvent);
};

// Convenience: only live games (for switching logic)
export const fetchLiveGames = async (): Promise<Game[]> => {
	const games = await fetchGames();
	return games.filter(g => g.status === 'in');
};

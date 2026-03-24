import { ESPN_SCOREBOARD_URL } from './constants';
import type { Game } from './types';

const parseClockToSeconds = (clock: string): number => {
	const parts = clock.split(':');
	if (parts.length !== 2) return 0;
	const [min, sec] = parts.map(Number);
	return (min * 60) + sec;
};

const parseEvent = (event: any): Game => {
	const comp = event.competitions[0];
	const home = comp.competitors.find((c: any) => c.homeAway === 'home');
	const away = comp.competitors.find((c: any) => c.homeAway === 'away');
	const status = comp.status;

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
		status: 'in',
	};
};

export const fetchLiveGames = async (): Promise<Game[]> => {
	const res = await fetch(ESPN_SCOREBOARD_URL);
	if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);
	const data = await res.json();

	return (data.events ?? [])
		.filter((e: any) => e.status?.type?.state === 'in')
		.map(parseEvent);
};

import type { SeriesEvent, TeamRecords } from '@arenaswap/ui/src/components/detailSummary';

const lcgNext = (s: number): number => (s * 1664525 + 1013904223) & 0x7fffffff;

const seedFromStr = (str: string): number => {
	let seed = 7;
	for (const c of str) seed = (seed * 31 + c.charCodeAt(0)) & 0x7fffffff;
	return seed;
};

export const generateMockWinProbs = (gameId: string, homeScore: number, awayScore: number): number[] => {
	let s = seedFromStr(gameId);
	const total = homeScore + awayScore;
	const target = total > 0 ? homeScore / total : 0.5;
	let v = 0.5;
	return Array.from({ length: 50 }, (_, i) => {
		s = lcgNext(s);
		const noise = (s / 0x7fffffff - 0.5) * 0.12;
		v += noise + (target - v) * 0.06 * (i / 50);
		return Math.max(0.05, Math.min(0.95, v));
	});
};

const won = (id: string): SeriesEvent => ({
	statusType: { completed: true },
	competitors: [{ homeAway: 'home', winner: true, team: { id } }],
});
const pending = (): SeriesEvent => ({ statusType: { completed: false } });

interface MockSeriesEntry {
	type: 'playoff';
	summary: string;
	totalCompetitions: number;
	events: SeriesEvent[];
}

export const mockSeriesMap: Record<string, MockSeriesEntry> = {
	'mock-4': {
		type: 'playoff',
		summary: 'PHI leads series 2-1',
		totalCompetitions: 7,
		events: [won('22'), won('21'), won('22'), pending(), pending(), pending(), pending()],
	},
	'mock-14': {
		type: 'playoff',
		summary: 'BOS leads series 3-2',
		totalCompetitions: 7,
		events: [won('1'), won('3'), won('1'), won('1'), won('3'), pending(), pending()],
	},
	'mock-16': {
		type: 'playoff',
		summary: 'Series tied 2-2',
		totalCompetitions: 7,
		events: [won('28'), won('10'), won('28'), won('10'), pending(), pending(), pending()],
	},
};

export const mockGameDurationMins: Record<string, number> = {
	'mock-20': 202,
};

export const mockRecordsMap: Record<string, TeamRecords> = {
	'mock-1': { home: '18-9', away: '15-12' },
	'mock-2': { home: '41-30', away: '33-38' },
	'mock-3': { home: '28-28-10', away: '30-28-9' },
	'mock-4': { home: '59-53', away: '55-58' },
	'mock-5': { home: '11-4', away: '8-7' },
	'mock-6': { home: '4-7', away: '9-2' },
	'mock-9': { home: '12-6-8', away: '10-9-7' },
	'mock-10': { home: '16-12-4', away: '13-15-3' },
	'mock-11': { home: '20-8', away: '17-11' },
	'mock-12': { home: '18-9-5', away: '17-10-5' },
	'mock-13': { home: '1-1-0', away: '0-1-1' },
	'mock-14': { home: '38-24-6', away: '36-26-7' },
	'mock-15': { home: '45-26', away: '40-31' },
	'mock-16': { home: '90-72', away: '98-64' },
	'mock-17': { home: '28-16', away: '24-20' },
	'mock-20': { home: '81-63', away: '74-70' },
};

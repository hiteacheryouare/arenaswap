import { shouldFetchSummary } from '../entrypoints/popup/components/useSummaryData';
import type { Game, SportType } from '@arenaswap/core/types';

const makeGame = (over: {
	status?: Game['status'];
	sportType?: SportType;
	homeRecord?: string;
	awayRecord?: string;
	isPostseason?: boolean;
} = {}) => ({
	id: '401891781',
	league: 'mlb' as const,
	status: over.status ?? ('pre' as const),
	sportType: over.sportType ?? ('baseball' as SportType),
	homeTeam: { id: '22', score: 0, record: over.homeRecord ?? '76-58' },
	awayTeam: { id: '20', score: 0, record: over.awayRecord ?? '70-64' },
	isPostseason: over.isPostseason,
});

describe('shouldFetchSummary', () => {
	test('skips the request for a regular-season pre-game game with both records in hand', () => {
		expect(shouldFetchSummary(makeGame())).toBe(false);
	});

	test('skips it for the sports that never draw series dots at all', () => {
		expect(shouldFetchSummary(makeGame({ sportType: 'soccer' }))).toBe(false);
		expect(shouldFetchSummary(makeGame({ sportType: 'football', isPostseason: true }))).toBe(false);
	});

	// The dots are the one thing on a pre-game screen the scoreboard cannot supply.
	test('still fetches for a postseason game in a series sport', () => {
		expect(shouldFetchSummary(makeGame({ isPostseason: true }))).toBe(true);
		expect(shouldFetchSummary(makeGame({ sportType: 'hockey', isPostseason: true }))).toBe(true);
	});

	// This is what keeps hockey and basketball working: they ship no scoreboard record until their
	// season is underway, so the gate falls through to the summary endpoint on its own.
	test('fetches when either record is missing from the scoreboard', () => {
		expect(shouldFetchSummary(makeGame({ sportType: 'hockey', homeRecord: '' }))).toBe(true);
		expect(shouldFetchSummary(makeGame({ sportType: 'hockey', awayRecord: '' }))).toBe(true);
	});

	test('always fetches once a game is live or finished, for the win probability line', () => {
		expect(shouldFetchSummary(makeGame({ status: 'in' }))).toBe(true);
		expect(shouldFetchSummary(makeGame({ status: 'post' }))).toBe(true);
		expect(shouldFetchSummary(makeGame({ status: 'in', sportType: 'soccer' }))).toBe(true);
	});
});

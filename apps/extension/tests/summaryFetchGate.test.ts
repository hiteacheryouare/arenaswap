import { shouldFetchSummary } from '../entrypoints/popup/components/useSummaryData';
import type { Game, SportType } from '@arenaswap/core/types';

const makeGame = (over: {
	status?: Game['status'];
	sportType?: SportType;
	homeRecord?: string;
	awayRecord?: string;
} = {}) => ({
	id: '401891781',
	league: 'mlb' as const,
	status: over.status ?? ('pre' as const),
	sportType: over.sportType ?? ('baseball' as SportType),
	homeTeam: { id: '22', score: 0, record: over.homeRecord ?? '76-58' },
	awayTeam: { id: '20', score: 0, record: over.awayRecord ?? '70-64' },
});

describe('shouldFetchSummary', () => {
	test('skips it for the sports that never draw series dots at all', () => {
		expect(shouldFetchSummary(makeGame({ sportType: 'soccer' }))).toBe(false);
		expect(shouldFetchSummary(makeGame({ sportType: 'football' }))).toBe(false);
	});

	// The dots are the one thing on a pre-game screen the scoreboard cannot supply, and a
	// regular-season series draws them just as a playoff series does — gating on the postseason is
	// what stripped the dots off every summer pre-game card.
	test('fetches for a pre-game game in a series sport, postseason or not', () => {
		expect(shouldFetchSummary(makeGame())).toBe(true);
		expect(shouldFetchSummary(makeGame({ sportType: 'hockey' }))).toBe(true);
		expect(shouldFetchSummary(makeGame({ sportType: 'softball' }))).toBe(true);
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

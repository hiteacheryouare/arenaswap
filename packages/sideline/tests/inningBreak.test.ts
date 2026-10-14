import { parseScoreboardEvents } from '../src/apiClient';

const mlbAt = (shortDetail: string, outs: number) => parseScoreboardEvents({
	events: [{
		id: '401700001',
		date: '2026-10-11T00:00Z',
		competitions: [{
			competitors: [
				{ id: '1', homeAway: 'home', score: '0', hits: 0, errors: 0, team: { displayName: 'Home', abbreviation: 'HOM' } },
				{ id: '2', homeAway: 'away', score: '1', hits: 4, errors: 0, team: { displayName: 'Away', abbreviation: 'AWY' } },
			],
			status: { period: 7, displayClock: '0:00', type: { state: 'in', name: 'STATUS_IN_PROGRESS', shortDetail } },
			situation: { balls: 0, strikes: 0, outs },
		}],
	}],
}, 'mlb')[0]!;

// Three of 306 recorded "Mid" readings still carried the top half's three outs.
test('the break between halves starts the bottom half with no outs', () => {
	const game = mlbAt('Mid 7th', 3);
	expect(game.topOfInning).toBe(false);
	expect(game.bso?.outs).toBe(0);
});

// Both arrive while the game is still marked in progress, which is why nothing else flags them.
test('Mid and End are the teams changing sides; Top and Bot are play', () => {
	expect(mlbAt('Mid 7th', 3).inningBreak).toBe(true);
	expect(mlbAt('End 7th', 3).inningBreak).toBe(true);
	expect(mlbAt('Top 7th', 1).inningBreak).toBe(false);
	expect(mlbAt('Bot 7th', 2).inningBreak).toBe(false);
});

test('outs inside a half are read as sent', () => {
	expect(mlbAt('Bot 7th', 2).bso?.outs).toBe(2);
	expect(mlbAt('Top 7th', 1).bso?.outs).toBe(1);
});

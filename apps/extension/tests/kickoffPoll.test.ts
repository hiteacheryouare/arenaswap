import { pollMaxEagerMs } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import kickoffDelayMs, { lateStartGraceMs } from '../utils/kickoffPoll';

const now = 1_800_000_000_000;

const game = (status: Game['status'], startMs?: number): Game => ({
	id: `g-${status}-${startMs}`,
	league: 'nba',
	sportType: 'basketball',
	status,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
	...(startMs === undefined ? {} : { startTime: new Date(startMs).toISOString() }),
});

describe('kickoffDelayMs', () => {
	test('waits until the soonest listed start', () => {
		expect(kickoffDelayMs([game('pre', now + 90_000), game('pre', now + 40_000)], now)).toBe(40_000);
	});

	test('polls at the live beat once a start has passed without the game going live', () => {
		expect(kickoffDelayMs([game('pre', now - 60_000)], now)).toBe(pollMaxEagerMs);
	});

	test('stops waiting on a game that is well past its start', () => {
		expect(kickoffDelayMs([game('pre', now - lateStartGraceMs - 1)], now)).toBeNull();
	});

	test('has nothing to say about live, finished or unscheduled games', () => {
		expect(kickoffDelayMs([game('in', now + 10_000), game('post', now + 10_000), game('pre')], now)).toBeNull();
	});
});

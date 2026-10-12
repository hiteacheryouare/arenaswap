import type { LeagueId } from '@arenaswap/core';
import { parseScoreboardEvents } from '../src/apiClient';

// The shape our sources send while play is halted: state `post`, but `completed: false`. Taken from
// a recorded La Liga match that was suspended at 31' and resumed fifteen minutes later.
const suspendedScoreboard = (displayClock: string) => ({
	events: [{
		id: '401882849',
		date: '2026-10-10T12:00Z',
		competitions: [{
			competitors: [
				{ id: '1', homeAway: 'home', score: '1', team: { displayName: 'Rayo Vallecano', abbreviation: 'RAY' } },
				{ id: '2', homeAway: 'away', score: '0', team: { displayName: 'Athletic Club', abbreviation: 'ATH' } },
			],
			status: {
				period: 1,
				displayClock,
				type: { state: 'post', name: 'STATUS_SUSPENDED', description: 'Suspended', completed: false, shortDetail: 'Suspended' },
			},
		}],
	}],
});

const parse = (league: LeagueId, displayClock: string) => parseScoreboardEvents(suspendedScoreboard(displayClock), league)[0]!;

describe('a suspended game', () => {
	test('stays live and delayed in soccer, so its tab is not settled as finished', () => {
		const game = parse('laliga', "31'");
		expect(game.status).toBe('in');
		expect(game.delayed).toBe(true);
		expect(game.delayDescription).toBe('Suspended');
		expect(game.finalPeriodSuffix).toBeUndefined();
	});

	test('reads as finished in baseball, which resumes a suspended game on a later day', () => {
		const game = parse('mlb', '0:00');
		expect(game.status).toBe('post');
		expect(game.delayed).toBe(true);
	});

	test('a completed final is still final', () => {
		const raw = suspendedScoreboard("90'");
		raw.events[0]!.competitions[0]!.status.type = { state: 'post', name: 'STATUS_FULL_TIME', description: 'Full Time', completed: true, shortDetail: 'FT' };
		expect(parseScoreboardEvents(raw, 'laliga')[0]!.status).toBe('post');
	});
});

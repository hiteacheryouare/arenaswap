import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import { basketballTimeoutAllotment, bonusKind, describeRedCard, formatMatchMinute, resolveStatus } from '../entrypoints/popup/components/gameSituation';

const t = i18n.t;

const makeGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'g1',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period: 3,
	clockSeconds: 400,
	homeTeam: { id: 'h', name: 'Home Team', abbreviation: 'HOM', score: 80 },
	awayTeam: { id: 'a', name: 'Away Team', abbreviation: 'AWY', score: 75 },
	...overrides,
});

describe('resolveStatus', () => {
	test('shows period and clock for a live clock sport', () => {
		expect(resolveStatus(makeGame(), false, t).text).toBe('Q3 • 6:40');
	});

	test('shows the inning without a clock for inning sports', () => {
		const game = makeGame({ league: 'mlb', sportType: 'baseball', period: 7 });
		expect(resolveStatus(game, true, t).text).toBe('Inn 7');
	});

	test('formats overtime', () => {
		expect(resolveStatus(makeGame({ period: 5 }), false, t).text).toBe('OT • 6:40');
	});

	test('says halftime rather than showing a frozen clock', () => {
		expect(resolveStatus(makeGame({ intermission: true, period: 2 }), false, t).text).toBe('Halftime');
	});

	test('says intermission outside the midpoint break', () => {
		expect(resolveStatus(makeGame({ intermission: true, period: 3 }), false, t).text).toBe('Intermission');
	});

	test('a delay outranks the clock and keeps ESPN\'s description', () => {
		const game = makeGame({ delayed: true, delayDescription: 'Rain Delay', intermission: true });
		expect(resolveStatus(game, false, t).text).toBe('Rain Delay');
	});

	test('falls back to the shared delay label when ESPN gives no description', () => {
		expect(resolveStatus(makeGame({ delayed: true }), false, t).text).toBe('Delay');
	});

	test('reads Final once the game is over', () => {
		expect(resolveStatus(makeGame({ status: 'post' }), false, t).text).toBe('Final');
		expect(resolveStatus(makeGame({ status: 'post', finalPeriodSuffix: 'OT' }), false, t).text).toBe('Final/OT');
	});

	test('is empty before tip-off', () => {
		expect(resolveStatus(makeGame({ status: 'pre' }), false, t).text).toBe('');
	});

	// The caller picks the face off this, and only a running clock gets the monospaced one.
	test('marks only a running clock as ticking', () => {
		expect(resolveStatus(makeGame(), false, t).ticking).toBe(true);
		expect(resolveStatus(makeGame({ league: 'mlb', sportType: 'baseball' }), true, t).ticking).toBe(false);
		expect(resolveStatus(makeGame({ intermission: true, period: 2 }), false, t).ticking).toBe(false);
		expect(resolveStatus(makeGame({ intermission: true, period: 3 }), false, t).ticking).toBe(false);
		expect(resolveStatus(makeGame({ status: 'post' }), false, t).ticking).toBe(false);
		expect(resolveStatus(makeGame({ delayed: true }), false, t).ticking).toBe(false);
	});
});

// Our sources send DOUBLE for every league once a team is past the limit. Only the men's college
// game has a one-and-one, so only there is DOUBLE a different thing from the bonus.
describe('bonusKind', () => {
	test('reads DOUBLE as the bonus everywhere but men\'s college basketball', () => {
		expect(bonusKind({ bonus: 'double' }, 'nba')).toBe('bonus');
		expect(bonusKind({ bonus: 'double' }, 'ncaaw')).toBe('bonus');
		expect(bonusKind({ bonus: 'double' }, 'ncaab')).toBe('double');
		expect(bonusKind({ bonus: 'bonus' }, 'ncaab')).toBe('bonus');
	});

	test('is nothing for a team that is not in it', () => {
		expect(bonusKind({ foulsToGive: 2, timeoutsLeft: 3 }, 'nba')).toBeUndefined();
	});
});

describe('basketballTimeoutAllotment', () => {
	test('the NBA carries seven, everyone else four', () => {
		expect(basketballTimeoutAllotment('nba')).toBe(7);
		expect(basketballTimeoutAllotment('wnba')).toBe(4);
		expect(basketballTimeoutAllotment('ncaab')).toBe(4);
	});
});

describe('red card lines', () => {
	const soccer = makeGame({
		league: 'mls',
		sportType: 'soccer',
		homeTeam: { id: '183', name: 'Atlanta United FC', abbreviation: 'ATL', score: 1 },
		awayTeam: { id: '20232', name: 'Inter Miami CF', abbreviation: 'MIA', score: 1 },
	});

	// Our sources print 1580 seconds as 27' and 5400 as 90', with stoppage time on the end.
	test('prints the minute a match clock would', () => {
		expect(formatMatchMinute({ teamId: '183', minute: 1580 / 60 }, t)).toBe('27\'');
		expect(formatMatchMinute({ teamId: '183', minute: 1620 / 60 }, t)).toBe('27\'');
		expect(formatMatchMinute({ teamId: '183', minute: 0 }, t)).toBe('1\'');
		expect(formatMatchMinute({ teamId: '183', minute: 90, addedMinutes: 6 }, t)).toBe('90+6\'');
	});

	test('names the player and the team the card was shown to', () => {
		expect(describeRedCard({ teamId: '20232', minute: 90, addedMinutes: 6, player: 'Santiago Morales' }, soccer, t)).toBe('90+6\' Santiago Morales, Inter Miami CF');
	});

	test('leaves out whatever our sources did not send', () => {
		expect(describeRedCard({ teamId: '183', minute: 64.5 }, soccer, t)).toBe('65\' Atlanta United FC');
		expect(describeRedCard({ teamId: '999', minute: 64.5, player: 'Somebody' }, soccer, t)).toBe('65\' Somebody');
	});
});

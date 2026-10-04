import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import type { BasketballSituation } from '@arenaswap/core';
import { basketballTimeoutAllotment, describeBasketballFouls, describeRedCard, formatMatchMinute, resolveStatus } from '../entrypoints/popup/components/gameSituation';

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

const situation = (away: BasketballSituation['away'], home: BasketballSituation['home']): BasketballSituation => ({ away, home });

describe('describeBasketballFouls', () => {
	const game = makeGame();

	test('says how many each side can still give before the other is in the bonus', () => {
		expect(describeBasketballFouls(situation({ foulsToGive: 2 }, { foulsToGive: 4 }), game, t)).toBe('AWY has 2 fouls to give, HOM has 4');
		expect(describeBasketballFouls(situation({ foulsToGive: 1 }, { foulsToGive: 3 }), game, t)).toBe('AWY has 1 foul to give, HOM has 3');
	});

	test('says it once when both sides have the same number to give', () => {
		expect(describeBasketballFouls(situation({ foulsToGive: 4 }, { foulsToGive: 4 }), game, t)).toBe('Both teams have 4 fouls to give');
		expect(describeBasketballFouls(situation({ foulsToGive: 1 }, { foulsToGive: 1 }), game, t)).toBe('Both teams have 1 foul to give');
	});

	// Home in the bonus is away out of fouls, so "AWY has 0 to give" would say the same thing twice.
	test('names the team in the bonus and what that team can still give', () => {
		expect(describeBasketballFouls(situation({ foulsToGive: 0 }, { bonus: 'double', foulsToGive: 1 }), game, t)).toBe('HOM in the bonus with 1 foul to give');
		expect(describeBasketballFouls(situation({ bonus: 'double', foulsToGive: 3 }, { foulsToGive: 0 }), game, t)).toBe('AWY in the bonus with 3 fouls to give');
		expect(describeBasketballFouls(situation({ foulsToGive: 0 }, { bonus: 'double', foulsToGive: 0 }), game, t)).toBe('HOM in the bonus');
	});

	test('says both teams once when both are in it', () => {
		expect(describeBasketballFouls(situation({ bonus: 'double', foulsToGive: 0 }, { bonus: 'double', foulsToGive: 0 }), game, t)).toBe('Both teams in the bonus');
	});

	// Only the men's college game has a one-and-one, so only there is DOUBLE a different thing.
	test('keeps the double bonus for men\'s college basketball', () => {
		const college = makeGame({ league: 'ncaab' });
		expect(describeBasketballFouls(situation({ bonus: 'bonus' }, { bonus: 'double' }), college, t)).toBe('HOM in the double bonus, AWY in the bonus');
		expect(describeBasketballFouls(situation({ bonus: 'double' }, { bonus: 'double' }), college, t)).toBe('Both teams in the double bonus');
		expect(describeBasketballFouls(situation({ foulsToGive: 0 }, { bonus: 'double', foulsToGive: 2 }), college, t)).toBe('HOM in the double bonus with 2 fouls to give');
		expect(describeBasketballFouls(situation({ bonus: 'bonus' }, { foulsToGive: 0 }), college, t)).toBe('AWY in the bonus');
		expect(describeBasketballFouls(situation({ bonus: 'double' }, { bonus: 'bonus' }), makeGame({ league: 'ncaaw' }), t)).toBe('Both teams in the bonus');
	});

	test('says what it knows when only one side reports fouls, and nothing when neither does', () => {
		expect(describeBasketballFouls(situation({}, { foulsToGive: 2 }), game, t)).toBe('HOM has 2 fouls to give');
		expect(describeBasketballFouls(situation({ timeoutsLeft: 3 }, { timeoutsLeft: 2 }), game, t)).toBeUndefined();
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

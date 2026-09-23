import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import { resolveStatus } from '../entrypoints/popup/components/gameSituation';

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
		expect(resolveStatus(makeGame({ period: 5 }), false, t).text).toBe('OT1 • 6:40');
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
	});

	test('is empty before tip-off', () => {
		expect(resolveStatus(makeGame({ status: 'pre' }), false, t).text).toBe('');
	});

	// The caller picks the face off this, so a state that says a word has to admit it is not a figure.
	test('marks the clock and the inning as tabular and the words as not', () => {
		expect(resolveStatus(makeGame(), false, t).tabular).toBe(true);
		expect(resolveStatus(makeGame({ league: 'mlb', sportType: 'baseball' }), true, t).tabular).toBe(true);
		expect(resolveStatus(makeGame({ intermission: true, period: 2 }), false, t).tabular).toBe(false);
		expect(resolveStatus(makeGame({ intermission: true, period: 3 }), false, t).tabular).toBe(false);
		expect(resolveStatus(makeGame({ status: 'post' }), false, t).tabular).toBe(false);
		expect(resolveStatus(makeGame({ delayed: true }), false, t).tabular).toBe(false);
	});
});

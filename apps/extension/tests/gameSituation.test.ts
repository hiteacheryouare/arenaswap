import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import { resolveStatusText } from '../entrypoints/popup/components/gameSituation';

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

describe('resolveStatusText', () => {
	test('shows period and clock for a live clock sport', () => {
		expect(resolveStatusText(makeGame(), false, t)).toBe('Q3 • 6:40');
	});

	test('shows the inning without a clock for inning sports', () => {
		const game = makeGame({ league: 'mlb', sportType: 'baseball', period: 7 });
		expect(resolveStatusText(game, true, t)).toBe('Inn 7');
	});

	test('formats overtime', () => {
		expect(resolveStatusText(makeGame({ period: 5 }), false, t)).toBe('OT1 • 6:40');
	});

	test('says halftime rather than showing a frozen clock', () => {
		expect(resolveStatusText(makeGame({ intermission: true, period: 2 }), false, t)).toBe('Halftime');
	});

	test('says intermission outside the midpoint break', () => {
		expect(resolveStatusText(makeGame({ intermission: true, period: 3 }), false, t)).toBe('Intermission');
	});

	test('a delay outranks the clock and keeps ESPN\'s description', () => {
		const game = makeGame({ delayed: true, delayDescription: 'Rain Delay', intermission: true });
		expect(resolveStatusText(game, false, t)).toBe('Rain Delay');
	});

	test('falls back to the shared delay label when ESPN gives no description', () => {
		expect(resolveStatusText(makeGame({ delayed: true }), false, t)).toBe('Delay');
	});

	test('reads Final once the game is over', () => {
		expect(resolveStatusText(makeGame({ status: 'post' }), false, t)).toBe('Final');
	});

	test('is empty before tip-off', () => {
		expect(resolveStatusText(makeGame({ status: 'pre' }), false, t)).toBe('');
	});
});

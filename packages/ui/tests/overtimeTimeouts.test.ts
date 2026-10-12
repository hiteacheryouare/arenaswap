import { leagueMarkOnColor } from '../src/components/gameCardShared';
import { gridironTimeoutAllotment } from '../src/components/timeoutDots';
import type { Game, LeagueId } from '@arenaswap/core/types';

const makeGame = (league: LeagueId, overrides: Partial<Game> = {}): Game => ({
	id: 'g1',
	league,
	sportType: 'football',
	status: 'in',
	period: 1,
	clockSeconds: 0,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
	...overrides,
});

describe('gridiron timeout allotment', () => {
	test('three a half in regulation, everywhere', () => {
		for (const league of ['nfl', 'ncaaf', 'ufl'] as LeagueId[]) {
			expect(gridironTimeoutAllotment(makeGame(league, { period: 4 }))).toBe(3);
		}
	});

	test('two in NFL regular-season overtime, three in a playoff overtime', () => {
		expect(gridironTimeoutAllotment(makeGame('nfl', { period: 5 }))).toBe(2);
		expect(gridironTimeoutAllotment(makeGame('nfl', { period: 5, isPostseason: true }))).toBe(3);
	});

	test('one per college overtime period', () => {
		expect(gridironTimeoutAllotment(makeGame('ncaaf', { period: 6 }))).toBe(1);
	});
});

// A rain-delayed start still paints the scheduled card's normal shade, so its league mark has to
// read its ink off that shade too.
test('a delayed game that has not started takes the league-mark ink of its normal card', () => {
	const colors = ['#13274F', '#FDB927', '#7BAFD4', '#FF6B00', '#E31837', '#00843D', '#FFFFFF', '#000000', '#C4CED4', '#4B92DB'];
	for (const away of colors) {
		for (const home of colors) {
			const scheduled = makeGame('mlb', { status: 'pre', sportType: 'baseball', awayTeam: { id: 'a', name: 'A', abbreviation: 'A', score: 0, color: away }, homeTeam: { id: 'h', name: 'H', abbreviation: 'H', score: 0, color: home } });
			expect(leagueMarkOnColor({ ...scheduled, delayed: true })).toBe(leagueMarkOnColor(scheduled));
		}
	}
});

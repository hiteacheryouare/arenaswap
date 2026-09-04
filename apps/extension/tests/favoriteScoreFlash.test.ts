import type { Game } from '@arenaswap/core/types';
import { favoriteScoreFlashColors, scorelineOf } from '../utils/favoriteScoreFlash';

const game = (over: Partial<Game> = {}): Game => ({
	id: 'g',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period: 2,
	clockSeconds: 400,
	homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 14, color: '004C54', alternateColor: 'A5ACAF' },
	awayTeam: { id: '6', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 10, color: '#003594' },
	...over,
});

const eaglesFan = new Set(['nfl:21']);

describe('favoriteScoreFlashColors', () => {
	test('says nothing on the first pass, since there is no previous score to compare', () => {
		expect(favoriteScoreFlashColors(null, game(), eaglesFan)).toBe(null);
	});

	test('flashes when a followed home side scores', () => {
		const before = scorelineOf(game());
		const after = game({ homeTeam: { ...game().homeTeam, score: 21 } });
		expect(favoriteScoreFlashColors(before, after, eaglesFan)).toEqual(['#004C54', '#A5ACAF']);
	});

	test('flashes when a followed away side scores', () => {
		const before = scorelineOf(game());
		const after = game({ awayTeam: { ...game().awayTeam, score: 17 } });
		expect(favoriteScoreFlashColors(before, after, new Set(['nfl:6']))).toEqual(['#003594']);
	});

	test('stays quiet when the team that scored is not one of yours', () => {
		const before = scorelineOf(game());
		const after = game({ awayTeam: { ...game().awayTeam, score: 17 } });
		expect(favoriteScoreFlashColors(before, after, eaglesFan)).toBe(null);
	});

	test('stays quiet when nothing scored', () => {
		const before = scorelineOf(game());
		expect(favoriteScoreFlashColors(before, game({ clockSeconds: 380 }), eaglesFan)).toBe(null);
	});

	test('does not fire on a correction that takes points off', () => {
		const before = scorelineOf(game());
		const after = game({ homeTeam: { ...game().homeTeam, score: 7 } });
		expect(favoriteScoreFlashColors(before, after, eaglesFan)).toBe(null);
	});

	test('takes ESPN colours with or without the leading hash', () => {
		const before = scorelineOf(game());
		const bare = game({ homeTeam: { id: '21', name: 'E', abbreviation: 'E', score: 21, color: '004C54' } });
		expect(favoriteScoreFlashColors(before, bare, eaglesFan)).toEqual(['#004C54']);
	});

	test('falls back to white for a team with no usable colour', () => {
		const before = scorelineOf(game());
		const colourless = game({ homeTeam: { id: '21', name: 'E', abbreviation: 'E', score: 21, color: 'not-a-colour' } });
		expect(favoriteScoreFlashColors(before, colourless, eaglesFan)).toEqual(['#ffffff']);
	});

	test('keys the favourite off the league, so the same team id elsewhere does not count', () => {
		const before = scorelineOf(game());
		const after = game({ homeTeam: { ...game().homeTeam, score: 21 } });
		expect(favoriteScoreFlashColors(before, after, new Set(['nba:21']))).toBe(null);
	});
});

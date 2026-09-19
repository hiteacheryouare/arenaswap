import { BackgroundStateSchema } from '../src/backgroundSchema';

const empty = {
	games: [],
	scores: [],
	leagueLogos: {},
	scoreHistory: {},
	powerScoreHistory: {},
	gameBoosts: {},
	onStandbyStream: false,
	standbyStreamTabId: null,
	slateShedLeagues: [],
};

describe('BackgroundStateSchema', () => {
	it('fills every missing field in', () => {
		expect(BackgroundStateSchema.parse({})).toEqual(empty);
	});

	it('falls back to an empty state for a value that is not an object', () => {
		for (const raw of [undefined, null, 0, '', 'nope', []]) {
			expect(BackgroundStateSchema.parse(raw)).toEqual(empty);
		}
	});

	it('normalizes each field rather than rejecting the whole state', () => {
		expect(BackgroundStateSchema.parse({
			games: 'not an array',
			leagueLogos: 7,
			onStandbyStream: 'true',
			standbyStreamTabId: '4',
			slateShedLeagues: ['nba', 3, 'nfl'],
		})).toEqual({ ...empty, slateShedLeagues: ['nba', 'nfl'] });
	});

	it('keeps the values it is given and drops undeclared keys', () => {
		const games = [{ id: '1' }];
		expect(BackgroundStateSchema.parse({
			games,
			onStandbyStream: true,
			standbyStreamTabId: 12,
			stray: 'dropped',
		})).toEqual({ ...empty, games, onStandbyStream: true, standbyStreamTabId: 12 });
	});
});

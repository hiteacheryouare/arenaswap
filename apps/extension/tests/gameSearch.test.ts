import type { Game, Team } from '@arenaswap/core/types';
import { matchesGameQuery } from '../utils/gameSearch';

const team = (name: string, abbreviation: string, extra: Partial<Team> = {}): Team => (
	{ id: abbreviation, name, abbreviation, score: 0, ...extra }
);

const game = (extra: Partial<Game> = {}): Game => ({
	id: 'g',
	league: 'nba',
	sportType: 'basketball',
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	awayTeam: team('Boston Celtics', 'BOS', { nickname: 'Celtics', shortName: 'Celtics' }),
	homeTeam: team('Philadelphia 76ers', 'PHI', { nickname: '76ers', shortName: '76ers' }),
	...extra,
});

describe('matchesGameQuery', () => {
	test('matches every game on an empty or blank query', () => {
		expect(matchesGameQuery(game(), '')).toBe(true);
		expect(matchesGameQuery(game(), '   ')).toBe(true);
	});

	test('finds either team by name, city, nickname or abbreviation, in any case', () => {
		expect(matchesGameQuery(game(), 'celtics')).toBe(true);
		expect(matchesGameQuery(game(), 'PHILADELPHIA')).toBe(true);
		expect(matchesGameQuery(game(), 'phi')).toBe(true);
		expect(matchesGameQuery(game(), 'knicks')).toBe(false);
	});

	test('folds accents out of both sides', () => {
		const match = game({
			league: 'laliga',
			sportType: 'soccer',
			homeTeam: team('Atlético Madrid', 'ATM'),
			awayTeam: team('Real Madrid', 'RMA'),
		});
		expect(matchesGameQuery(match, 'atletico')).toBe(true);
		expect(matchesGameQuery(game({ venueLocation: 'Montréal, QC' }), 'montreal')).toBe(true);
	});

	test('finds a league by its full or short label, and college leagues by "college"', () => {
		expect(matchesGameQuery(game(), 'nba')).toBe(true);
		const cfb = game({ league: 'ncaaf', sportType: 'football' });
		expect(matchesGameQuery(cfb, 'ncaa football')).toBe(true);
		expect(matchesGameQuery(cfb, 'cfb')).toBe(true);
		expect(matchesGameQuery(cfb, 'college football')).toBe(true);
		expect(matchesGameQuery(game(), 'college')).toBe(false);
	});

	test('finds the networks carrying the game', () => {
		expect(matchesGameQuery(game({ broadcasts: ['TNT', 'truTV'] }), 'tru')).toBe(true);
		expect(matchesGameQuery(game({ broadcasts: ['TNT'] }), 'peacock')).toBe(false);
		expect(matchesGameQuery(game(), 'tnt')).toBe(false);
	});

	test('finds the venue by name or place', () => {
		const atTheLinc = game({ venueName: 'Lincoln Financial Field', venueLocation: 'Philadelphia, PA' });
		expect(matchesGameQuery(atTheLinc, 'lincoln financial')).toBe(true);
		expect(matchesGameQuery(atTheLinc, 'pa')).toBe(true);
	});

	test('needs every word to land somewhere', () => {
		const onTnt = game({ broadcasts: ['TNT'] });
		expect(matchesGameQuery(onTnt, 'boston tnt')).toBe(true);
		expect(matchesGameQuery(onTnt, 'boston peacock')).toBe(false);
	});
});

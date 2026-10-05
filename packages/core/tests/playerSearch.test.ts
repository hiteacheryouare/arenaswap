import { foldName, nameMatchScore, parsePlayerSearch, toFantasyPosition } from '../src/playerSearch';

const searchPayload = {
	results: [
		{ type: 'team', contents: [{ uid: 's:20~l:28~t:12', displayName: 'Kansas City Chiefs' }] },
		{
			type: 'player',
			contents: [
				{ uid: 's:1~l:10~a:2650', displayName: 'Pat Mahomes', subtitle: 'Pittsburgh Pirates', image: null },
				{ uid: 's:20~l:28~a:3139477', displayName: 'Patrick Mahomes', subtitle: 'Kansas City Chiefs', image: { default: 'https://example.test/3139477.png' } },
				{ uid: 's:40~l:3~a:99', displayName: 'Patrick Somebody', subtitle: 'A league Fantasy does not cover' },
			],
		},
	],
};

describe('player search', () => {
	test('keeps players from fantasy leagues, with their league and athlete id from the uid', () => {
		const results = parsePlayerSearch(searchPayload, 'patrick mahomes');
		expect(results.map(result => [result.league, result.athleteId])).toEqual([['nfl', '3139477'], ['mlb', '2650']]);
		expect(results[0]).toMatchObject({ name: 'Patrick Mahomes', teamName: 'Kansas City Chiefs', headshot: 'https://example.test/3139477.png' });
	});

	test('forgives accents, word order, a surname prefix and one typo in a long word', () => {
		expect(nameMatchScore('jokic', 'Nikola Jokić')).toBeGreaterThan(0);
		expect(nameMatchScore('mahomes patrick', 'Patrick Mahomes')).toBeGreaterThan(0);
		expect(nameMatchScore('mah', 'Patrick Mahomes')).toBeGreaterThan(0);
		expect(nameMatchScore('mahomse', 'Patrick Mahomes')).toBeGreaterThan(0);
		expect(nameMatchScore('ohtnai', 'Shohei Ohtani')).toBeGreaterThan(0);
	});

	test('does not match a different name, or a typo in a short word', () => {
		expect(nameMatchScore('allen', 'Patrick Mahomes')).toBe(0);
		expect(nameMatchScore('kel', 'Travis Kelce')).toBeGreaterThan(0);
		expect(nameMatchScore('klce', 'Travis Kelce')).toBe(0);
	});

	test('an exact name ranks above a prefix of it', () => {
		expect(nameMatchScore('josh allen', 'Josh Allen')).toBeGreaterThan(nameMatchScore('josh al', 'Josh Allen'));
	});

	test('folds case, accents and punctuation', () => {
		expect(foldName("D'Andre Swift")).toBe('d andre swift');
		expect(foldName('Luka Dončić')).toBe('luka doncic');
	});

	test('maps positions onto what Fantasy scores', () => {
		expect(toFantasyPosition('nfl', 'QB')).toBe('QB');
		expect(toFantasyPosition('nfl', 'PK')).toBe('K');
		expect(toFantasyPosition('nfl', 'FB')).toBe('RB');
		expect(toFantasyPosition('nfl', 'LB')).toBe('player');
		expect(toFantasyPosition('mlb', 'SP')).toBe('P');
		expect(toFantasyPosition('mlb', 'CF')).toBe('H');
		expect(toFantasyPosition('nba', 'C')).toBe('player');
	});
});

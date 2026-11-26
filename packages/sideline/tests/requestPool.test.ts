import { settledInPool } from '../src/requestPool';

describe('settledInPool progress', () => {
	test('reports every settled item against the total, failures included', async () => {
		const reports: [number, number][] = [];
		const results = await settledInPool(
			['nba', 'nfl', 'nhl', 'mlb'],
			async league => {
				if (league === 'nhl') throw new Error('shed');
				return league;
			},
			2,
			(settled, total) => reports.push([settled, total]),
		);

		expect(results.map(result => result.status)).toEqual(['fulfilled', 'fulfilled', 'rejected', 'fulfilled']);
		expect(reports).toEqual([[1, 4], [2, 4], [3, 4], [4, 4]]);
	});

	test('counts in the order items finish, not the order they started', async () => {
		const finished: string[] = [];
		const reports: number[] = [];
		await settledInPool(
			[30, 10, 20],
			delay => new Promise<string>(resolve => setTimeout(() => {
				finished.push(String(delay));
				resolve(String(delay));
			}, delay)),
			3,
			settled => reports.push(settled),
		);

		expect(finished).toEqual(['10', '20', '30']);
		expect(reports).toEqual([1, 2, 3]);
	});
});

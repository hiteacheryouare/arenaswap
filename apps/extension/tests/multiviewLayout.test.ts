import { multiviewGridFor, placeBoxes } from '../entrypoints/multiview/multiviewLayout';

const ids = (count: number) => Array.from({ length: count }, (_, index) => `g${index}`);

const span = (value: string): [number, number] => {
	const spanned = /^(\d+) \/ span (\d+)$/.exec(value);
	return spanned ? [Number(spanned[1]), Number(spanned[2])] : [Number(value), 1];
};

// Every cell a placement covers, so overlaps and gaps can be counted.
const cellsOf = ({ column, row }: { column: string; row: string }): string[] => {
	const [column0, columns] = span(column);
	const [row0, rows] = span(row);
	const cells: string[] = [];
	for (let c = column0; c < column0 + columns; c++) for (let r = row0; r < row0 + rows; r++) cells.push(`${c},${r}`);
	return cells;
};

describe('multiview layout', () => {
	test.each([1, 2, 3, 4, 5, 6, 7, 8])('%i boxes never overlap and never fall outside the grid', count => {
		const grid = multiviewGridFor(count);
		const placements = placeBoxes(ids(count), 'g0');
		expect(placements.size).toBe(count);
		const covered = [...placements.values()].flatMap(cellsOf);
		expect(new Set(covered).size).toBe(covered.length);
		for (const cell of covered) {
			const [column, row] = cell.split(',').map(Number);
			expect(column).toBeLessThanOrEqual(grid.columns);
			expect(row).toBeLessThanOrEqual(grid.rows);
		}
	});

	test.each([1, 2, 3, 4, 6, 8])('%i boxes fill the grid with nothing left over', count => {
		const grid = multiviewGridFor(count);
		const covered = [...placeBoxes(ids(count), 'g0').values()].flatMap(cellsOf);
		expect(covered).toHaveLength(grid.columns * grid.rows);
	});

	test('puts the featured game in the big box, wherever it sits in the list', () => {
		const placements = placeBoxes(['a', 'b', 'c'], 'c');
		expect(placements.get('c')).toEqual({ column: '1 / span 2', row: '1 / span 2' });
		expect(placements.get('a')).toEqual({ column: '3', row: '1' });
		expect(placements.get('b')).toEqual({ column: '3', row: '2' });
	});

	test('features the first box when the featured game is not showing yet', () => {
		expect(placeBoxes(['a', 'b', 'c'], 'missing').get('a')).toEqual({ column: '1 / span 2', row: '1 / span 2' });
	});

	test('puts two games side by side at the same size', () => {
		expect([...placeBoxes(['a', 'b'], 'a').values()]).toEqual([
			{ column: '1 / span 1', row: '1 / span 1' },
			{ column: '2', row: '1' },
		]);
	});

	test('stacks three beside the big box when there are four games', () => {
		const placements = placeBoxes(ids(4), 'g0');
		expect(placements.get('g0')).toEqual({ column: '1 / span 3', row: '1 / span 3' });
		expect([...placements.values()].slice(1).map(cell => cell.column)).toEqual(['4', '4', '4']);
	});

	test('fills the right column before the bottom row', () => {
		const placements = placeBoxes(ids(6), 'g0');
		expect([...placements.values()].slice(1)).toEqual([
			{ column: '3', row: '1' },
			{ column: '3', row: '2' },
			{ column: '1', row: '3' },
			{ column: '2', row: '3' },
			{ column: '3', row: '3' },
		]);
	});
});

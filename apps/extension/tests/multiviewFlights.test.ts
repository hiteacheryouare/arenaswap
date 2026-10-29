import planFlight, { angularPath, crossing, marginRun, openBands, type flightArea, type flightPoint } from '../entrypoints/multiview/multiviewFlights';

const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const page: flightArea = { x: 0, y: 0, width: 1440, height: 900 };
// Where the grid sits at 1440×900 for two boxes, four boxes, and five (which fills the height).
const twoBoxes: flightArea = { x: 0, y: 228, width: 1440, height: 444 };
const fourBoxes: flightArea = { x: 0, y: 85, width: 1440, height: 730 };
const fiveBoxes: flightArea = { x: 30, y: 0, width: 1380, height: 900 };

const offPage = ({ x, y }: flightPoint) => x < 0 || y < 0 || x > page.width || y > page.height;

const pathEnds = (path: string) => {
	const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
	return { start: { x: numbers[0], y: numbers[1] }, end: { x: numbers.at(-2)!, y: numbers.at(-1)! } };
};

describe('multiview flights', () => {
	test('the margins two boxes leave are the strips above and below them', () => {
		const bands = openBands(page, twoBoxes);
		expect(bands.map(band => band.outer)).toEqual(['top', 'bottom']);
		expect(bands[0].height).toBe(228);
	});

	test('a grid that fills the window leaves no margin wide enough to fly along', () => {
		expect(openBands(page, fiveBoxes)).toEqual([]);
	});

	test('with no boxes, the whole window is open', () => {
		expect(openBands(page, null).map(band => band.outer)).toEqual(['top', 'bottom', 'left', 'right']);
	});

	test.each([['two', twoBoxes], ['four', fourBoxes]])('every run along the margins %s boxes leave starts and ends out of sight and turns where it can be seen', (_, grid) => {
		const random = seeded(3);
		for (let run = 0; run < 200; run++) {
			for (const band of openBands(page, grid)) {
				const points = marginRun(band, page, random);
				expect(offPage(points[0])).toBe(true);
				expect(offPage(points.at(-1)!)).toBe(true);
				for (const turn of points.slice(1, -1)) {
					expect(turn.x).toBeGreaterThanOrEqual(band.x);
					expect(turn.x).toBeLessThanOrEqual(band.x + band.width);
					expect(turn.y).toBeGreaterThanOrEqual(band.y);
					expect(turn.y).toBeLessThanOrEqual(band.y + band.height);
				}
			}
		}
	});

	test('a crossing enters and leaves through different sides and turns inside the window', () => {
		const random = seeded(11);
		const sideOf = ({ x, y }: flightPoint) => x < 0 ? 'left' : x > page.width ? 'right' : y < 0 ? 'top' : 'bottom';
		for (let run = 0; run < 200; run++) {
			const points = crossing(page, random);
			expect(sideOf(points[0])).not.toBe(sideOf(points.at(-1)!));
			expect(points.length).toBeGreaterThanOrEqual(4);
			for (const turn of points.slice(1, -1)) expect(offPage(turn)).toBe(false);
		}
	});

	test('corners are cut by no more than their rounding, so the line runs straight between turns', () => {
		const path = angularPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
		expect(path).toBe('M 0.0 0.0 L 92.0 0.0 Q 100.0 0.0 100.0 8.0 L 100.0 100.0');
	});

	test('a turn too close to the next one is rounded by half the gap rather than overshooting it', () => {
		const path = angularPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
		expect(path).toBe('M 0.0 0.0 L 5.0 0.0 Q 10.0 0.0 10.0 5.0 L 10.0 10.0');
	});

	test('when the boxes fill the window, every flight still comes in and goes out of sight', () => {
		const random = seeded(5);
		for (let id = 0; id < 100; id++) {
			const { start, end } = pathEnds(planFlight(id, page, fiveBoxes, random).path);
			expect(offPage(start)).toBe(true);
			expect(offPage(end)).toBe(true);
		}
	});
});

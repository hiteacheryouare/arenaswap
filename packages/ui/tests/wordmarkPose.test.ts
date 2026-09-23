import { ringPath } from '../src/components/wordmarkPose';
import { chevronFrom, chevronTo, headFrom, headTo, ringPoints } from '../src/components/wordmarkShapes';

// The two arrows in the wordmark are not scaled into the favicon's — the icon draws a wider head and
// a lighter chevron — so each travels as a pair of matched point rings that `ringPath` walks one
// onto the other. `wordmarkShapes.ts` is generated, and the failure mode of a bad regeneration is
// silent: a ring pair of unequal length produces `NaN` coordinates, the browser rejects the whole
// path, and the arrow simply is not drawn.

const pointsOf = (d: string): [number, number][] => {
	expect(d.endsWith('Z')).toBe(true);
	return d.slice(0, -1).split(/[ML]/).filter(Boolean).map(pair => {
		const [x, y] = pair.split(',').map(Number);
		return [x!, y!];
	});
};

// `ringPath` rounds every coordinate to a tenth of a unit, which is 0.008px at the size this
// renders, so half a step is as close as any assertion here can ask for.
const roundingStep = 0.05 + 1e-9;
const expectWithinRounding = (actual: number, expected: number): void => {
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(roundingStep);
};

const rings: [string, number[], number[]][] = [
	['the chevron', chevronFrom, chevronTo],
	['the arrowhead', headFrom, headTo],
];

describe.each(rings)('%s', (_label, from, to) => {
	test('is stored as a matched pair of the declared length', () => {
		expect(from).toHaveLength(ringPoints * 2);
		expect(to).toHaveLength(ringPoints * 2);
	});

	test('draws a closed outline with one vertex per stored point', () => {
		for (const k of [0, 0.5, 1]) {
			expect(pointsOf(ringPath(from, to, k))).toHaveLength(ringPoints);
		}
	});

	test('starts with a move and continues with lines, so the outline is one contour', () => {
		const d = ringPath(from, to, 0.5);
		expect(d.indexOf('M')).toBe(0);
		expect(d.slice(1).includes('M')).toBe(false);
	});

	test('rests on the wordmark outline at 0 and on the icon outline at 1', () => {
		const atRest = pointsOf(ringPath(from, to, 0));
		const collapsed = pointsOf(ringPath(from, to, 1));
		for (let index = 0; index < ringPoints; index++) {
			expectWithinRounding(atRest[index]![0], from[index * 2]!);
			expectWithinRounding(atRest[index]![1], from[index * 2 + 1]!);
			expectWithinRounding(collapsed[index]![0], to[index * 2]!);
			expectWithinRounding(collapsed[index]![1], to[index * 2 + 1]!);
		}
	});

	// Point for point, and in a straight line, which is what makes running the scroll back up the
	// reverse animation rather than a second one.
	test('walks each vertex straight from one outline to the other', () => {
		const half = pointsOf(ringPath(from, to, 0.5));
		for (let index = 0; index < ringPoints; index++) {
			expectWithinRounding(half[index]![0], (from[index * 2]! + to[index * 2]!) / 2);
			expectWithinRounding(half[index]![1], (from[index * 2 + 1]! + to[index * 2 + 1]!) / 2);
		}
	});

	// The one that catches a bad regeneration of `wordmarkShapes.ts`.
	test('never emits a coordinate that is not a number, at any point in the run', () => {
		for (let step = 0; step <= 20; step++) {
			const d = ringPath(from, to, step / 20);
			expect(d).not.toMatch(/NaN|undefined|Infinity/);
			for (const [x, y] of pointsOf(d)) {
				expect(Number.isFinite(x)).toBe(true);
				expect(Number.isFinite(y)).toBe(true);
			}
		}
	});
});

describe('the two rings together', () => {
	// They are generated as one pass over both marks; a resample that changed only one of them
	// would tear the arrow in half without either ring being wrong on its own.
	test('carry the same point count, so the head and the chevron stay one arrow', () => {
		expect(chevronFrom).toHaveLength(headFrom.length);
		expect(chevronTo).toHaveLength(headTo.length);
	});

	test('hold a finite coordinate in every slot', () => {
		for (const ring of [chevronFrom, chevronTo, headFrom, headTo]) {
			expect(ring.every(Number.isFinite)).toBe(true);
		}
	});
});

import wordmarkFrameAt, {
	barHalfWidth,
	barJoint,
	barRest,
	collapsedBox,
	dashHalfWidth,
	dashRest,
	fadeWidth,
	restBox,
	wordmarkExtents as extents,
} from '../src/components/wordmarkFrame';

// Sampled rather than spot-checked. Every failure this guards against is a few frames wide — a
// letter surfacing for 40ms behind an arrow that has not quite covered it — so the interesting
// question is never what one value is, it is whether a property holds across the whole run.
const everyFrame = Array.from({ length: 601 }, (_, step) => step / 600);

// Outlines the animation never moves, so they live here rather than in the module under test.
const arenLeft = 36.8;
const wapLeft = 1070;
const headWidth = 88.9;

const topVisibleLeftOf = (t: number) => wordmarkFrameAt(t).aFade.from;
const bottomVisibleRightOf = (t: number) => wordmarkFrameAt(t).sFade.from;

const aSpan = (t: number) => {
	const left = extents.aLeft + wordmarkFrameAt(t).aShift;
	return { left, right: left + extents.aWidth };
};
const sSpan = (t: number) => {
	const left = extents.sLeft + wordmarkFrameAt(t).sShift;
	return { left, right: left + extents.sWidth };
};
const dotRight = (t: number) => extents.dotCx + wordmarkFrameAt(t).dotShift + extents.dotOuter;

describe('the wordmark at rest', () => {
	const rest = wordmarkFrameAt(0);

	test('draws the source mark, untouched', () => {
		expect(rest.box).toEqual(restBox);
		expect(rest.barX1).toBe(barRest + barHalfWidth);
		expect(rest.barX2).toBe(barJoint);
		expect(rest.dashX2).toBe(dashRest - dashHalfWidth);
		expect(rest.aShift).toBe(0);
		expect(rest.sShift).toBe(0);
		expect(rest.dotShift).toBe(0);
	});

	// The fade bands sit inside each arrow's leading end. At rest that puts them in the gap between
	// word and arrow, which is the only reason the mark is pixel-identical to the file it came from.
	test('parks both fade bands in the gap, touching no letter', () => {
		expect(Math.min(rest.arenFade.from, rest.arenFade.to)).toBeGreaterThan(extents.arenRight);
		expect(Math.min(rest.aFade.from, rest.aFade.to)).toBeGreaterThan(extents.arenRight);
		expect(Math.max(rest.wapFade.from, rest.wapFade.to)).toBeLessThan(extents.sLeft);
		expect(Math.max(rest.sFade.from, rest.sFade.to)).toBeLessThan(extents.sLeft);
	});
});

describe('the wordmark collapsed', () => {
	const end = wordmarkFrameAt(1);

	test('lands on the favicon arrangement', () => {
		expect(aSpan(1).left).toBeCloseTo(extents.aCollapsedLeft, 5);
		expect(sSpan(1).left).toBeCloseTo(extents.sCollapsedLeft, 5);
		expect(end.barX1 - barHalfWidth).toBeCloseTo(194.6, 5);
		expect(end.barX2 + headWidth).toBeCloseTo(432, 5);
		// Seven pills become two, which is what the icon draws.
		expect(end.dashX2 + dashHalfWidth).toBeCloseTo(308.6, 5);
	});

	test('closes the box around exactly what survives, with nothing hanging out of it', () => {
		// Field by field: the lerp lands on 546.0999999999999 rather than 546.1, and the box is the
		// one place in here where that matters not at all.
		expect(end.box.x).toBeCloseTo(collapsedBox.x, 6);
		expect(end.box.y).toBeCloseTo(collapsedBox.y, 6);
		expect(end.box.width).toBeCloseTo(collapsedBox.width, 6);
		expect(end.box.height).toBeCloseTo(collapsedBox.height, 6);
		const right = collapsedBox.x + collapsedBox.width;
		expect(dotRight(1)).toBeLessThanOrEqual(right);
		expect(end.barX2 + headWidth).toBeLessThanOrEqual(right);
	});

	test('leaves both survivors completely uncovered', () => {
		expect(topVisibleLeftOf(1)).toBeGreaterThanOrEqual(aSpan(1).right);
		expect(bottomVisibleRightOf(1)).toBeLessThanOrEqual(sSpan(1).left);
	});
});

describe('across the whole run', () => {
	// The masks that eat `aren` and `wap` are separate from the ones holding the `a` and `s`
	// precisely so the arrows can retract without spitting the words back out. If those two ever
	// get merged back together this is the test that notices.
	test('never uncovers a word it has already eaten', () => {
		const eaten = everyFrame.filter(t => t > 0.5);
		eaten.forEach(t => {
			const frame = wordmarkFrameAt(t);
			expect(frame.arenFade.from).toBeLessThanOrEqual(arenLeft);
			expect(frame.wapFade.from).toBeGreaterThanOrEqual(wapLeft);
		});
	});

	// Both survivors travel several hundred units to reach their favicon positions. They do it
	// under the arrow that just ate them, and a frame where one is halfway there and visible is
	// the mark tearing itself apart on screen.
	test('keeps the `a` hidden for every frame of its slide', () => {
		everyFrame
			.filter(t => wordmarkFrameAt(t).aShift !== 0 && wordmarkFrameAt(t).aShift !== wordmarkFrameAt(1).aShift)
			.forEach(t => {
				expect(aSpan(t).left).toBeGreaterThanOrEqual(topVisibleLeftOf(t) + fadeWidth);
			});
	});

	test('keeps the `s` and the dot hidden for every frame of theirs', () => {
		everyFrame
			.filter(t => wordmarkFrameAt(t).sShift !== 0 && wordmarkFrameAt(t).sShift !== wordmarkFrameAt(1).sShift)
			.forEach(t => {
				const covered = bottomVisibleRightOf(t) - fadeWidth;
				expect(sSpan(t).right).toBeLessThanOrEqual(covered);
				expect(dotRight(t)).toBeLessThanOrEqual(covered);
			});
	});

	test('never lets the arrowhead leave the box or the bar turn inside out', () => {
		everyFrame.forEach(t => {
			const frame = wordmarkFrameAt(t);
			expect(frame.barX2 + headWidth).toBeLessThanOrEqual(frame.box.x + frame.box.width);
			expect(frame.barX2 - frame.barX1).toBeGreaterThan(barHalfWidth);
		});
	});

	test('closes the box without ever widening it again', () => {
		everyFrame.slice(1).forEach((t, index) => {
			expect(wordmarkFrameAt(t).box.width).toBeLessThanOrEqual(wordmarkFrameAt(everyFrame[index]).box.width);
		});
	});

	// Scrolling back up is the same function run backwards and nothing else, so it is only truly
	// reversible if no frame depends on how it was reached.
	test('depends on nothing but `t`, which is what makes scrolling up the reverse', () => {
		everyFrame.forEach(t => {
			expect(wordmarkFrameAt(t)).toEqual(wordmarkFrameAt(t));
		});
	});

	test('clamps rather than extrapolating past either end', () => {
		expect(wordmarkFrameAt(-3)).toEqual(wordmarkFrameAt(0));
		expect(wordmarkFrameAt(4)).toEqual(wordmarkFrameAt(1));
	});
});

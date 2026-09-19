import wordmarkFrameAt, {
	barCentreRest,
	barJoint,
	barRest,
	barStrokeRest,
	collapsedBox,
	dashCentreRest,
	dashFirstCapRest,
	dashLastCapRest,
	dashStrokeRest,
	fadeWidth,
	restBox,
	wordmarkExtents as extents,
} from '../src/components/wordmarkFrame';

// Sampled rather than spot-checked. Every failure this guards against is a few frames wide — a
// letter blinking out for 40ms behind something that has not quite covered it — so the interesting
// question is never what one value is, it is whether a property holds across the whole run.
const everyFrame = Array.from({ length: 601 }, (_, step) => step / 600);

const headWidth = 89.92;

// A box's placement under a frame's pose, which is what the browser actually draws.
const placed = (box: { x: number; y: number; w: number; h: number }, at: { x: number; y: number; scaleX: number; scaleY: number }) => ({
	left: box.x * at.scaleX + at.x,
	right: (box.x + box.w) * at.scaleX + at.x,
	top: box.y * at.scaleY + at.y,
	bottom: (box.y + box.h) * at.scaleY + at.y,
});

describe('the wordmark at rest', () => {
	const rest = wordmarkFrameAt(0);

	test('draws the source mark, untouched', () => {
		expect(rest.box).toEqual(restBox);
		expect(rest.barX1).toBeCloseTo(barRest + barStrokeRest / 2, 6);
		expect(rest.barX2).toBe(barJoint);
		expect(rest.barCentre).toBe(barCentreRest);
		expect(rest.barStroke).toBe(barStrokeRest);
		expect(rest.dashX1).toBe(dashFirstCapRest);
		expect(rest.dashX2).toBe(dashLastCapRest);
		expect(rest.dashStroke).toBe(dashStrokeRest);
		expect(rest.dashCentre).toBe(dashCentreRest);
		expect(rest.chevronMorph).toBe(0);
		expect(rest.headMorph).toBe(0);
		expect(rest.a).toEqual({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
		expect(rest.s).toEqual({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
		expect(rest.dot).toEqual(extents.dotRest);
	});

	// The bands sit inside each leading edge. At rest that puts them in the gap between word and
	// arrow, which is the only reason the mark is pixel-identical to the file it came from.
	test('parks both fade bands clear of every letter', () => {
		expect(rest.arenFade.from).toBeGreaterThan(extents.arenRight);
		expect(rest.wapFade.from).toBeGreaterThan(extents.wapBox.x + extents.wapBox.w);
	});
});

describe('the wordmark collapsed', () => {
	const end = wordmarkFrameAt(1);

	// Not an impression of the icon — the icon. Every one of these was measured off
	// `icon_white_on_transparent.svg` and is asserted to the hundredth of a unit, which is a
	// thousandth of a pixel at the size the popup draws this.
	test('lands on the favicon, piece for piece', () => {
		const a = placed(extents.aBox, end.a);
		expect(a.left).toBeCloseTo(extents.aEnd.x, 2);
		expect(a.right - a.left).toBeCloseTo(extents.aEnd.w, 2);

		const s = placed(extents.sBox, end.s);
		expect(s.left).toBeCloseTo(extents.sEnd.x, 2);
		expect(s.top).toBeCloseTo(extents.sEnd.y, 2);
		expect(s.right - s.left).toBeCloseTo(extents.sEnd.w, 2);

		(['cx', 'cy', 'rx', 'ry', 'stroke'] as const).forEach(key => {
			expect(end.dot[key]).toBeCloseTo(extents.dotEnd[key], 6);
		});
		expect(end.barX1 - end.barStroke / 2).toBeCloseTo(extents.barEnd.left, 2);
		expect(end.barX2).toBeCloseTo(extents.barEnd.joint, 2);
		expect(end.barStroke).toBeCloseTo(extents.barEnd.stroke, 2);
		expect(end.barCentre).toBeCloseTo(extents.barEnd.centre, 2);
		expect(end.dashX1).toBeCloseTo(extents.dashEnd.firstCap, 2);
		expect(end.dashX2).toBeCloseTo(extents.dashEnd.lastCap, 2);
		// Seven pills become two, at the icon's own pitch.
		expect(end.dashPattern).toBe(`${extents.dashEnd.seg} ${extents.dashEnd.gap}`);
		// Both point rings all the way onto the icon's outlines.
		expect(end.chevronMorph).toBe(1);
		expect(end.headMorph).toBe(1);
	});

	test('closes the box around what survives, with nothing hanging out of it', () => {
		expect(end.box.width).toBeCloseTo(collapsedBox.width, 6);
		expect(end.box.height).toBeCloseTo(collapsedBox.height, 6);
		const right = collapsedBox.x + collapsedBox.width;
		expect(end.dot.cx + end.dot.rx + end.dot.stroke / 2).toBeLessThanOrEqual(right + 0.01);
		expect(end.barX2 + headWidth * (extents.barEnd.stroke / barStrokeRest)).toBeLessThanOrEqual(right);
	});

	test('has both doomed words fully behind their masks', () => {
		const wap = placed(extents.wapBox, end.wap);
		expect(end.arenFade.to).toBeLessThanOrEqual(extents.arenLeft);
		expect(end.wapFade.to).toBeLessThanOrEqual(wap.left);
	});
});

describe('across the whole run', () => {
	// The point of the whole rebuild. The `a` and the `s` are not masked by anything, so the only
	// way either can leave the screen is by being placed outside the viewBox — which is exactly
	// what a mistake in the pose or the box would do, and exactly what nobody would notice until
	// the animation was already shipped.
	test('never lets the `a` or the `s` out of frame', () => {
		everyFrame.forEach(t => {
			const frame = wordmarkFrameAt(t);
			const right = frame.box.x + frame.box.width;
			const bottom = frame.box.y + frame.box.height;
			([['a', placed(extents.aBox, frame.a)], ['s', placed(extents.sBox, frame.s)]] as const).forEach(([name, at]) => {
				expect({ name, t, inside: at.left >= frame.box.x - 0.01 }).toEqual({ name, t, inside: true });
				expect({ name, t, inside: at.right <= right + 0.01 }).toEqual({ name, t, inside: true });
				expect({ name, t, inside: at.top >= frame.box.y - 0.01 }).toEqual({ name, t, inside: true });
				expect({ name, t, inside: at.bottom <= bottom + 0.01 }).toEqual({ name, t, inside: true });
			});
		});
	});

	// Both mask edges only ever close. Nothing eaten can come back, in either direction of travel.
	test('never uncovers a word it has already eaten', () => {
		everyFrame.slice(1).forEach((t, index) => {
			const now = wordmarkFrameAt(t);
			const before = wordmarkFrameAt(everyFrame[index] as number);
			expect(now.arenFade.from).toBeLessThanOrEqual(before.arenFade.from);
			expect(now.wapFade.from).toBeLessThanOrEqual(before.wapFade.from);
		});
	});

	test('never lets the arrowhead leave the box or the bar turn inside out', () => {
		everyFrame.forEach(t => {
			const frame = wordmarkFrameAt(t);
			const head = frame.barX2 + headWidth * (frame.barStroke / barStrokeRest);
			expect(head).toBeLessThanOrEqual(frame.box.x + frame.box.width);
			expect(frame.barX2 - frame.barX1).toBeGreaterThan(frame.barStroke / 2);
		});
	});

	// The bar's tail is pinned off the `a`'s shoulder and its head is on a slower clock, which is
	// what makes it lengthen before it collapses. If both ever land on the same curve the arrow
	// just slides left instead, and the covering move is gone.
	test('lengthens the top arrow before shortening it', () => {
		const lengths = everyFrame.map(t => {
			const frame = wordmarkFrameAt(t);
			return frame.barX2 - frame.barX1;
		});
		expect(Math.max(...lengths)).toBeGreaterThan((lengths[0] as number) * 1.3);
		expect(lengths[lengths.length - 1] as number).toBeLessThan(lengths[0] as number);
	});

	test('closes the box without ever widening it again', () => {
		everyFrame.slice(1).forEach((t, index) => {
			expect(wordmarkFrameAt(t).box.width).toBeLessThanOrEqual(wordmarkFrameAt(everyFrame[index] as number).box.width);
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

	test('reports how far it has closed, monotonically, from 0 to 1', () => {
		expect(wordmarkFrameAt(0).closed).toBe(0);
		expect(wordmarkFrameAt(1).closed).toBe(1);
		everyFrame.slice(1).forEach((t, index) => {
			expect(wordmarkFrameAt(t).closed).toBeGreaterThanOrEqual(wordmarkFrameAt(everyFrame[index] as number).closed);
		});
	});
});

describe('the fade bands', () => {
	test('are a fixed width that never touches a surviving letter', () => {
		everyFrame.forEach(t => {
			const frame = wordmarkFrameAt(t);
			expect(frame.arenFade.to - frame.arenFade.from).toBeCloseTo(fadeWidth, 6);
			expect(frame.wapFade.to - frame.wapFade.from).toBeCloseTo(fadeWidth, 6);
			// The band's opaque end leads the `a`'s shoulder, so a letter is already gone by the
			// time the `a` reaches it. The transparent end runs on past — harmless, because the `a`
			// is not in this mask and only `aren` is behind it.
			const a = placed(extents.aBox, frame.a);
			expect(frame.arenFade.from).toBeLessThanOrEqual(a.left + 0.01);
		});
	});
});

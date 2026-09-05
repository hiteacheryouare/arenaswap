import { dominantColorFromPixels } from '../src/components/logoTint';

// One RGBA quad per entry, in the order the canvas hands them back.
const pixels = (quads: [number, number, number, number][]): Uint8ClampedArray => (
	new Uint8ClampedArray(quads.flat())
);

const opaque = (red: number, green: number, blue: number, times: number): [number, number, number, number][] => (
	Array.from({ length: times }, () => [red, green, blue, 255] as [number, number, number, number])
);

describe('dominantColorFromPixels', () => {
	test('returns the colour that covers the most of the crest', () => {
		expect(dominantColorFromPixels(pixels([
			...opaque(0, 131, 72, 10),
			...opaque(200, 16, 46, 3),
		]))).toBe('#008348');
	});

	test('ignores the transparent background a cut-out crest is mostly made of', () => {
		expect(dominantColorFromPixels(pixels([
			[10, 20, 200, 0],
			[10, 20, 200, 0],
			[10, 20, 200, 0],
			...opaque(200, 16, 46, 1),
		]))).toBe('#c8102e');
	});

	test('ignores white, black and grey, so a plate behind the mark cannot win', () => {
		expect(dominantColorFromPixels(pixels([
			...opaque(255, 255, 255, 40),
			...opaque(0, 0, 0, 20),
			...opaque(128, 130, 127, 20),
			...opaque(0, 131, 72, 5),
		]))).toBe('#008348');
	});

	test('gives up on a crest with no colour in it at all', () => {
		expect(dominantColorFromPixels(pixels([
			...opaque(255, 255, 255, 20),
			...opaque(17, 17, 17, 20),
		]))).toBeNull();
	});

	test('gives up on a fully transparent sample', () => {
		expect(dominantColorFromPixels(pixels([[0, 0, 0, 0], [255, 0, 0, 10]]))).toBeNull();
	});

	// Antialiasing and gradients spread one flat colour over neighbouring values, so near-identical
	// pixels have to land in one bucket or a solid crest loses to a smaller solid area.
	test('collects near-identical shades into one colour rather than splitting them', () => {
		expect(dominantColorFromPixels(pixels([
			...opaque(0, 131, 72, 2),
			...opaque(1, 132, 73, 2),
			...opaque(2, 133, 74, 2),
			...opaque(200, 16, 46, 5),
		]))).toBe('#018449');
	});

	test('reads an empty sample as no colour rather than throwing', () => {
		expect(dominantColorFromPixels(new Uint8ClampedArray())).toBeNull();
	});
});

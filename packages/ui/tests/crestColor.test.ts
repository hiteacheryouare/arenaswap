import { crestColorFromPixels } from '../src/components/crestColor';
import { colorDifference } from '../src/components/colorMath';

const crest = (...inks: [string, number][]): Uint8ClampedArray => {
	const pixels: number[] = [];
	for (const [hex, count] of inks) {
		const packed = Number.parseInt(hex.slice(1), 16);
		for (let index = 0; index < count; index++) pixels.push((packed >> 16) & 255, (packed >> 8) & 255, packed & 255, 255);
	}
	return new Uint8ClampedArray(pixels);
};

describe('crestColorFromPixels', () => {
	// Northeastern: a black-and-white husky with a red outline.
	test('takes the colour over the black and white that cover more of the crest', () => {
		const color = crestColorFromPixels(crest(['#000000', 500], ['#FFFFFF', 300], ['#CC0001', 200]));
		expect(colorDifference(color!, '#CC0001')).toBeLessThan(2);
	});

	test('picks the most common of two colours', () => {
		const color = crestColorFromPixels(crest(['#FFCB05', 600], ['#00274C', 300], ['#FFFFFF', 100]));
		expect(colorDifference(color!, '#FFCB05')).toBeLessThan(2);
	});

	// A gold drawn in a dozen near shades by antialiasing is still one gold, and outvotes a flat navy
	// covering less of the crest than all of them together.
	test('groups the shades of one colour before counting', () => {
		const golds: [string, number][] = [['#F0B200', 60], ['#E8AC08', 60], ['#F4B806', 60], ['#ECB000', 60]];
		const color = crestColorFromPixels(crest(['#13213A', 180], ...golds));
		expect(colorDifference(color!, '#F0B200')).toBeLessThan(4);
	});

	test('falls back to black for a crest with no colour in it', () => {
		const color = crestColorFromPixels(crest(['#FFFFFF', 500], ['#0A0A0A', 400]));
		expect(colorDifference(color!, '#0A0A0A')).toBeLessThan(2);
	});

	test('falls back to black when the only colour is a keyline', () => {
		const color = crestColorFromPixels(crest(['#050505', 700], ['#FFFFFF', 280], ['#3E9BD1', 20]));
		expect(colorDifference(color!, '#050505')).toBeLessThan(2);
	});

	test('gives nothing for an all-white crest', () => {
		expect(crestColorFromPixels(crest(['#FFFFFF', 800], ['#F6F6F6', 100]))).toBeNull();
	});

	test('skips transparent pixels', () => {
		const pixels = crest(['#CC0001', 100]);
		const transparentBlue = new Uint8ClampedArray([0, 0, 255, 0, 0, 0, 255, 0]);
		const merged = new Uint8ClampedArray(pixels.length + transparentBlue.length * 200);
		merged.set(pixels);
		for (let index = 0; index < 200; index++) merged.set(transparentBlue, pixels.length + (index * transparentBlue.length));
		expect(colorDifference(crestColorFromPixels(merged)!, '#CC0001')).toBeLessThan(2);
	});
});

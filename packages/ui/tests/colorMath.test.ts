import { blackInkContrast, contrastBetween, hexToRgb, hexLuminance, isHex, rgbLuminance, rgbToHex, whiteInkContrast } from '../src/components/colorMath';

// The arithmetic every readability decision in the product is built on. Nothing here fails loudly:
// a transfer function off by a hair still returns a number, and what goes wrong is a crest drawn in
// the colour that cannot be seen.

// `colorMath`'s header says the two thresholds WCAG has published — 0.03928 and 0.04045 — agree on
// all 256 channel values, and consolidates on 0.04045 on the strength of it. That claim still
// matters outside this package: `packages/core/src/apiClient.ts` carries its own copy of the
// transfer function at 0.03928 and gates `resolveTeamColors` on it, so the two halves of the
// product only reach the same verdict for as long as this holds.
const channelAtThreshold = (threshold: number) => (value: number): number => {
	const scaled = value / 255;
	return scaled <= threshold ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

const low = channelAtThreshold(0.03928);
const high = channelAtThreshold(0.04045);

describe('the two published sRGB thresholds', () => {
	test('agree on every channel value a pixel or a hex can actually carry', () => {
		for (let channel = 0; channel <= 255; channel++) {
			expect(low(channel)).toBe(high(channel));
		}
	});

	// Both thresholds sit between 10/255 and 11/255, which is why no integer can tell them apart.
	test('only differ for a channel between the two, which no integer lands on', () => {
		const between = 0.04 * 255;
		expect(low(between)).not.toBe(high(between));
		expect(Math.ceil(0.03928 * 255)).toBe(Math.ceil(0.04045 * 255));
	});
});

// Three ways of asking the same question. `crestInkReads` measures every pixel with
// `contrastBetween` while `pickMonoMark` chooses a substitute with the other two, so a crest can be
// judged unreadable and then handed a replacement judged by a different yardstick.
describe('the ink shortcuts agree with the general contrast', () => {
	const surfaces = ['#000000', '#0d1117', '#111827', '#0C2340', '#860038', '#C8102E', '#4B9CD3', '#FFB81C', '#f8fafc', '#ffffff'];

	test('white ink measures the same as white measured the long way', () => {
		for (const surface of surfaces) {
			const backdrop = hexLuminance(surface);
			expect(whiteInkContrast(backdrop)).toBeCloseTo(contrastBetween(hexLuminance('#ffffff'), backdrop), 10);
		}
	});

	test('black ink measures the same as black measured the long way', () => {
		for (const surface of surfaces) {
			const backdrop = hexLuminance(surface);
			expect(blackInkContrast(backdrop)).toBeCloseTo(contrastBetween(hexLuminance('#000000'), backdrop), 10);
		}
	});

	// 21:1 is the most sRGB contains, and a formula that exceeds it is reporting a contrast that
	// cannot exist.
	test('neither can promise more contrast than black on white', () => {
		for (let step = 0; step <= 100; step++) {
			const backdrop = step / 100;
			expect(whiteInkContrast(backdrop)).toBeLessThanOrEqual(21);
			expect(blackInkContrast(backdrop)).toBeLessThanOrEqual(21);
		}
	});
});

describe('hexToRgb and rgbToHex', () => {
	test('round-trip every colour the product hands them', () => {
		for (const hex of ['#000000', '#ffffff', '#0C2340', '#E03A3E', '#0080C6', '#FDBB30', '#010203']) {
			const rgb = hexToRgb(hex)!;
			expect(rgbToHex(rgb.red, rgb.green, rgb.blue)).toBe(hex.toLowerCase());
		}
	});

	test('reads the channels in the order they are written', () => {
		expect(hexToRgb('#123456')).toEqual({ red: 0x12, green: 0x34, blue: 0x56 });
	});

	// The lightening loops in `colorUtils` scale channels past 255 and the scrim mixes fractions,
	// so both ends are reached in normal use.
	test('clamps a channel driven out of range rather than wrapping it', () => {
		expect(rgbToHex(300, -20, 255.4)).toBe('#ff00ff');
	});

	test('rounds a fractional channel rather than truncating it', () => {
		expect(rgbToHex(0.6, 1.4, 2.5)).toBe('#010103');
	});
});

describe('isHex', () => {
	// ESPN publishes colours both with and without the hash and in either case, and `apiClient`
	// normalises before anything here sees them. What must not happen is a half-parsed value being
	// treated as a colour.
	test('takes a six-digit colour in either case', () => {
		expect(isHex('#0C2340')).toBe(true);
		expect(isHex('#0c2340')).toBe(true);
	});

	test('refuses everything that is not one', () => {
		for (const value of ['0C2340', '#0C234', '#0C23400', '#abc', 'rgb(1,2,3)', 'red', '', null, undefined]) {
			expect(isHex(value)).toBe(false);
		}
	});
});

describe('rgbLuminance', () => {
	// The coefficients, checked against the primaries rather than against themselves.
	test('weights the three primaries the way sRGB does', () => {
		expect(rgbLuminance(255, 0, 0)).toBeCloseTo(0.2126, 10);
		expect(rgbLuminance(0, 255, 0)).toBeCloseTo(0.7152, 10);
		expect(rgbLuminance(0, 0, 255)).toBeCloseTo(0.0722, 10);
	});

	test('runs from black at 0 to white at 1', () => {
		expect(rgbLuminance(0, 0, 0)).toBe(0);
		expect(rgbLuminance(255, 255, 255)).toBeCloseTo(1, 10);
	});
});

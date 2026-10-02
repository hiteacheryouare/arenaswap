import { blackInkContrast, colorDifference, contrastBetween, hexToLab, hexToRgb, hexLuminance, isHex, labChroma, labDifference, rgbLuminance, rgbToHex, whiteInkContrast } from '../src/components/colorMath';
import type { Lab } from '../src/components/colorMath';

// The arithmetic every readability decision in the product is built on. Nothing here fails loudly:
// a transfer function off by a hair still returns a number, and what goes wrong is a crest drawn in
// the colour that cannot be seen.

// `colorMath`'s header says the two thresholds WCAG has published — 0.03928 and 0.04045 — agree on
// all 256 channel values, and consolidates on 0.04045 on the strength of it.
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

// Sharma, Wu and Dalal's published test pairs, which exercise every branch the formula has: the
// hue wrap at 0/360, the mean-hue correction, achromatic inputs and the blue rotation term.
describe('labDifference', () => {
	const pairs: [Lab, Lab, number][] = [
		[{ lightness: 50, a: 2.6772, b: -79.7751 }, { lightness: 50, a: 0, b: -82.7485 }, 2.0425],
		[{ lightness: 50, a: 3.1571, b: -77.2803 }, { lightness: 50, a: 0, b: -82.7485 }, 2.8615],
		[{ lightness: 50, a: 2.4900, b: -0.0010 }, { lightness: 50, a: -2.4900, b: 0.0009 }, 7.1792],
		[{ lightness: 50, a: 2.4900, b: -0.0010 }, { lightness: 50, a: -2.4900, b: 0.0011 }, 7.2195],
		[{ lightness: 50, a: -0.0010, b: 2.4900 }, { lightness: 50, a: 0.0009, b: -2.4900 }, 4.8045],
		[{ lightness: 50, a: 0, b: 0 }, { lightness: 50, a: -1, b: 2 }, 2.3669],
		[{ lightness: 50, a: 2.5, b: 0 }, { lightness: 73, a: 25, b: -18 }, 27.1492],
		[{ lightness: 60.2574, a: -34.0099, b: 36.2677 }, { lightness: 60.4626, a: -34.1751, b: 39.4387 }, 1.2644],
		[{ lightness: 22.7233, a: 20.0904, b: -46.6940 }, { lightness: 23.0331, a: 14.9730, b: -42.5619 }, 2.0373],
		[{ lightness: 2.0776, a: 0.0795, b: -1.1350 }, { lightness: 0.9033, a: -0.0636, b: -0.5514 }, 0.9082],
	];

	test.each(pairs)('matches the published value for pair %#', (one, two, expected) => {
		expect(labDifference(one, two)).toBeCloseTo(expected, 4);
	});

	test('is symmetric', () => {
		for (const [one, two] of pairs) expect(labDifference(two, one)).toBeCloseTo(labDifference(one, two), 10);
	});
});

describe('colorDifference', () => {
	test('is zero for a colour against itself', () => {
		expect(colorDifference('#1D428A', '#1D428A')).toBe(0);
	});

	test('calls a malformed colour infinitely far from everything', () => {
		expect(colorDifference('navy', '#1D428A')).toBe(Number.POSITIVE_INFINITY);
	});

	test('reads two navies as closer than a red and a maroon', () => {
		expect(colorDifference('#0D2B56', '#132448')).toBeLessThan(colorDifference('#E31937', '#5A1414'));
	});
});

describe('hexToLab', () => {
	test('puts white at the top of the lightness scale and black at the bottom', () => {
		expect(hexToLab('#FFFFFF')!.lightness).toBeCloseTo(100, 2);
		expect(hexToLab('#000000')!.lightness).toBeCloseTo(0, 5);
	});

	test('gives a grey no chroma', () => {
		expect(labChroma(hexToLab('#808080')!)).toBeLessThan(0.01);
	});
});

// The colour arithmetic every surface in the product measures itself with. One copy, because a
// second is how two files end up disagreeing about what a hex is worth: `colorUtils` and `logoTint`
// each carried the sRGB transfer function, at the two different thresholds WCAG has published
// (0.03928 and 0.04045). They agree on all 256 channel values, so this is a consolidation and not a
// change — but only one of them can be here.

export interface Rgb {
	red: number;
	green: number;
	blue: number;
}

const hexPattern = /^#([\da-fA-F]{6})$/;

export const isHex = (value: string | null | undefined): value is string => (
	typeof value === 'string' && hexPattern.test(value)
);

export const hexToRgb = (value: string): Rgb | null => {
	const matched = hexPattern.exec(value);
	if (!matched) return null;
	const packed = Number.parseInt(matched[1]!, 16);
	return { red: (packed >> 16) & 255, green: (packed >> 8) & 255, blue: packed & 255 };
};

const channelHex = (value: number): string => (
	Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
);

export const rgbToHex = (red: number, green: number, blue: number): string => (
	`#${channelHex(red)}${channelHex(green)}${channelHex(blue)}`
);

const channelLuminance = (value: number): number => {
	const scaled = value / 255;
	return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

export const rgbLuminance = (red: number, green: number, blue: number): number => (
	(0.2126 * channelLuminance(red)) + (0.7152 * channelLuminance(green)) + (0.0722 * channelLuminance(blue))
);

// An unparseable colour reads as black rather than throwing: every caller here is deciding how to
// paint something, and a thrown error paints nothing at all.
export const hexLuminance = (hex: string): number => {
	const rgb = hexToRgb(hex);
	return rgb ? rgbLuminance(rgb.red, rgb.green, rgb.blue) : 0;
};

// Taken between two luminances rather than two colours, because the crest measurement holds the
// background's luminance and asks this once per pixel.
export const contrastBetween = (a: number, b: number): number => (
	(Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
);

export const whiteInkContrast = (backdrop: number): number => 1.05 / (backdrop + 0.05);

export const blackInkContrast = (backdrop: number): number => (backdrop + 0.05) / 0.05;

export interface Lab {
	lightness: number;
	a: number;
	b: number;
}

// D65 white, which is what sRGB is defined against.
const labPivot = (value: number): number => (value > 216 / 24389 ? Math.cbrt(value) : ((24389 / 27) * value + 16) / 116);

export const hexToLab = (hex: string): Lab | null => {
	const rgb = hexToRgb(hex);
	if (!rgb) return null;
	const red = channelLuminance(rgb.red);
	const green = channelLuminance(rgb.green);
	const blue = channelLuminance(rgb.blue);
	const x = labPivot(((0.4124564 * red) + (0.3575761 * green) + (0.1804375 * blue)) / 0.95047);
	const y = labPivot((0.2126729 * red) + (0.7151522 * green) + (0.0721750 * blue));
	const z = labPivot(((0.0193339 * red) + (0.1191920 * green) + (0.9503041 * blue)) / 1.08883);
	return { lightness: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
};

export const labChroma = (lab: Lab): number => Math.hypot(lab.a, lab.b);

const toDegrees = (radians: number): number => {
	const degrees = (radians * 180) / Math.PI;
	return degrees < 0 ? degrees + 360 : degrees;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

// CIEDE2000, Sharma, Wu and Dalal (2005). Plain RGB distance calls two navies far apart and a
// red and a maroon close, which is backwards from how either pair looks on a card.
export const labDifference = (one: Lab, two: Lab): number => {
	const meanChroma = (labChroma(one) + labChroma(two)) / 2;
	const chromaWeight = 0.5 * (1 - Math.sqrt(meanChroma ** 7 / (meanChroma ** 7 + 25 ** 7)));
	const aOne = one.a * (1 + chromaWeight);
	const aTwo = two.a * (1 + chromaWeight);
	const chromaOne = Math.hypot(aOne, one.b);
	const chromaTwo = Math.hypot(aTwo, two.b);
	const hueOne = aOne === 0 && one.b === 0 ? 0 : toDegrees(Math.atan2(one.b, aOne));
	const hueTwo = aTwo === 0 && two.b === 0 ? 0 : toDegrees(Math.atan2(two.b, aTwo));

	const lightnessDelta = two.lightness - one.lightness;
	const chromaDelta = chromaTwo - chromaOne;
	let hueGap = hueTwo - hueOne;
	if (chromaOne * chromaTwo === 0) hueGap = 0;
	else if (hueGap > 180) hueGap -= 360;
	else if (hueGap < -180) hueGap += 360;
	const hueDelta = 2 * Math.sqrt(chromaOne * chromaTwo) * Math.sin(toRadians(hueGap / 2));

	const meanLightness = (one.lightness + two.lightness) / 2;
	const meanPrimeChroma = (chromaOne + chromaTwo) / 2;
	let meanHue = hueOne + hueTwo;
	if (chromaOne * chromaTwo !== 0) {
		if (Math.abs(hueOne - hueTwo) <= 180) meanHue /= 2;
		else meanHue = hueOne + hueTwo < 360 ? (meanHue + 360) / 2 : (meanHue - 360) / 2;
	}

	const hueWeight = 1
		- (0.17 * Math.cos(toRadians(meanHue - 30)))
		+ (0.24 * Math.cos(toRadians(2 * meanHue)))
		+ (0.32 * Math.cos(toRadians((3 * meanHue) + 6)))
		- (0.20 * Math.cos(toRadians((4 * meanHue) - 63)));
	const rotation = 30 * Math.exp(-(((meanHue - 275) / 25) ** 2));
	const rotationScale = 2 * Math.sqrt(meanPrimeChroma ** 7 / (meanPrimeChroma ** 7 + 25 ** 7));
	const lightnessScale = 1 + ((0.015 * ((meanLightness - 50) ** 2)) / Math.sqrt(20 + ((meanLightness - 50) ** 2)));
	const chromaScale = 1 + (0.045 * meanPrimeChroma);
	const hueScale = 1 + (0.015 * meanPrimeChroma * hueWeight);
	const rotationTerm = -Math.sin(toRadians(2 * rotation)) * rotationScale;

	const lightnessPart = lightnessDelta / lightnessScale;
	const chromaPart = chromaDelta / chromaScale;
	const huePart = hueDelta / hueScale;
	return Math.sqrt((lightnessPart ** 2) + (chromaPart ** 2) + (huePart ** 2) + (rotationTerm * chromaPart * huePart));
};

export const colorDifference = (first: string, second: string): number => {
	const one = hexToLab(first);
	const two = hexToLab(second);
	return one && two ? labDifference(one, two) : Number.POSITIVE_INFINITY;
};

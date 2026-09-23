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

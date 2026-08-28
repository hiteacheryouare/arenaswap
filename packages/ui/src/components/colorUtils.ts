const hexToRgb = (value: string): { red: number; green: number; blue: number } | null => {
	const matched = /^#([\da-fA-F]{6})$/.exec(value);
	if (!matched) return null;
	const hex = matched[1]!;
	return {
		red: Number.parseInt(hex.slice(0, 2), 16),
		green: Number.parseInt(hex.slice(2, 4), 16),
		blue: Number.parseInt(hex.slice(4, 6), 16),
	};
};

const normalizeChannel = (value: number): number => {
	const channel = value / 255;
	return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

const luminance = (value: string): number => {
	const rgb = hexToRgb(value);
	if (!rgb) return 0;
	return (0.2126 * normalizeChannel(rgb.red))
		+ (0.7152 * normalizeChannel(rgb.green))
		+ (0.0722 * normalizeChannel(rgb.blue));
};

const mixTowardWhite = (value: string, amount: number): string => {
	const rgb = hexToRgb(value);
	if (!rgb) return value;
	const red = Math.round(rgb.red + (255 - rgb.red) * amount);
	const green = Math.round(rgb.green + (255 - rgb.green) * amount);
	const blue = Math.round(rgb.blue + (255 - rgb.blue) * amount);
	return `#${[red, green, blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
};

const resolveReadableSeriesColor = (value: string | undefined, fallback: string): string => {
	if (!value || !hexToRgb(value)) return fallback;
	// Chart lines are non-text, so WCAG wants 3:1 against the chart background. That background
	// is #0d1117 (luminance 0.0055), which puts the 3:1 boundary at luminance 0.1164.
	return luminance(value) < 0.1164 ? mixTowardWhite(value, 0.48) : value;
};

const colorDistance = (a: string, b: string): number => {
	const ra = hexToRgb(a);
	const rb = hexToRgb(b);
	if (!ra || !rb) return 0;
	return Math.sqrt((ra.red - rb.red) ** 2 + (ra.green - rb.green) ** 2 + (ra.blue - rb.blue) ** 2);
};

const clashThreshold = 65;

const isUsable = (hex: string): boolean => { const l = luminance(hex); return l >= 0.03 && l <= 0.95; };

const pickPair = (ap: string, aa: string, hp: string, ha: string): [string, string] => {
	if (colorDistance(ap, hp) >= clashThreshold) return [ap, hp];
	const candidates: [string, string][] = [[ap, ha], [aa, hp], [aa, ha]];
	const usable = candidates.filter(([a, h]) => isUsable(a) && isUsable(h));
	const pool = usable.length > 0 ? usable : candidates;
	const best = pool.reduce((b, c) => colorDistance(c[0], c[1]) > colorDistance(b[0], b[1]) ? c : b);
	return colorDistance(best[0], best[1]) > colorDistance(ap, hp) ? best : [ap, hp];
};

// White on a team colour is fine for the navies and reds and unreadable on a gold. 0.1833 is where
// white stops clearing 4.5:1 — contrast is 1.05 / (L + 0.05) — and these labels are too small to
// qualify for the 3:1 large-text allowance.
export const readableInkOn = (background: string, light = '#ffffff', dark = '#111827'): string => (
	hexToRgb(background) && luminance(background) > 0.1833 ? dark : light
);

export const resolveTeamColorPair = (
	away: { color?: string; alternateColor?: string },
	home: { color?: string; alternateColor?: string },
	awayFallback = '#60a5fa',
	homeFallback = '#f87171',
	lighten = false,
): [string, string] => {
	const [a, h] = pickPair(
		away.color ?? awayFallback,
		away.alternateColor ?? awayFallback,
		home.color ?? homeFallback,
		home.alternateColor ?? homeFallback,
	);
	return lighten
		? [resolveReadableSeriesColor(a, awayFallback), resolveReadableSeriesColor(h, homeFallback)]
		: [a, h];
};

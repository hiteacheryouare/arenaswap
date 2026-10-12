import { colorDifference, hexToLab, hexToRgb, rgbToHex } from './colorMath';
import { crestInkGrouping, groupCrestInk } from './crestColor';
import { samplePixels } from './logoTint';

// The colour a team switches to when its published alternate is white, which a card cannot paint
// a side in. Apple Sports takes it out of the crest: Maryland went to the gold in their M and
// Louisville to the black around their cardinal. Black counts here, unlike the disc tint, because
// Louisville is the evidence that it should.
const sampleSize = 96;
const minAlpha = 200;
// A real second colour, not antialiasing: the Reds' crest is red and white and nothing else, and
// every pink in it together is under this share.
const minShare = 0.06;
// L* rather than luminance, so the keylines every crest is outlined in fall out and a silver does not.
const whiteLightness = 90;
// The crest's own primary is the colour that clashed, so anything that reads as it is no use.
const nearPrimaryDifference = 15;

// A crest's primary fading into its white keyline makes a whole range of tints — the Red Wings'
// red edge reads as pink in bulk — and none of them is a colour the club owns.
const blendSteps = [0.2, 0.35, 0.5, 0.65, 0.8];
const blendDifference = 8;

const isBlendWithWhite = (color: string, primary: string): boolean => {
	const rgb = hexToRgb(primary);
	if (!rgb) return false;
	return blendSteps.some(amount => {
		const toward = (channel: number): number => channel + ((255 - channel) * amount);
		return colorDifference(color, rgbToHex(toward(rgb.red), toward(rgb.green), toward(rgb.blue))) < blendDifference;
	});
};

export const switchColorFromPixels = (pixels: Uint8ClampedArray, primary: string): string | null => {
	const { total, groups } = groupCrestInk(pixels, minAlpha);
	const winner = groups
		.filter(group => group.count >= total * minShare)
		.map(group => group.color)
		.find(color => (
			hexToLab(color)!.lightness <= whiteLightness
			&& colorDifference(color, primary) >= nearPrimaryDifference
			&& !isBlendWithWhite(color, primary)
		));
	return winner ?? null;
};

// Persisted for the same reason the crest verdicts are: a popup is a new document every time it
// opens, and without this the card would paint its fallback and then change colour on every open.
const storageKey = 'arenaswap.logoSwitchColors';
const calibration = [sampleSize, minAlpha, crestInkGrouping, minShare, whiteLightness, nearPrimaryDifference, blendDifference].join('/');
const cacheLimit = 1024;

const readStored = (): Map<string, string | null> => {
	try {
		const raw = globalThis.localStorage?.getItem(storageKey);
		if (!raw) return new Map();
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return new Map();
		const stored = parsed as { calibration?: unknown; colors?: unknown };
		if (stored.calibration !== calibration || typeof stored.colors !== 'object' || stored.colors === null) return new Map();
		return new Map(Object.entries(stored.colors as Record<string, unknown>)
			.filter((entry): entry is [string, string | null] => typeof entry[1] === 'string' || entry[1] === null));
	} catch {
		return new Map();
	}
};

const cache = readStored();

const persist = (): void => {
	try {
		globalThis.localStorage?.setItem(storageKey, JSON.stringify({ calibration, colors: Object.fromEntries(cache) }));
	} catch {
		// Storage full or unavailable. The cache still works for this document.
	}
};

const cacheKey = (src: string, primary: string): string => `${src}|${primary.toLowerCase()}`;

export const cachedLogoSwitchColor = (src: string, primary: string): string | null | undefined => (
	cache.get(cacheKey(src, primary))
);

const pending = new Map<string, Promise<void>>();

// Resolves once the crest has been read, whether or not it gave a colour. A crest that will not
// load or taints the canvas is left unrecorded, so a later open can try again.
export const measureLogoSwitchColor = (src: string, primary: string): Promise<void> => {
	const key = cacheKey(src, primary);
	if (cache.has(key)) return Promise.resolve();
	const inFlight = pending.get(key);
	if (inFlight) return inFlight;

	const measurement = new Promise<void>(resolve => {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.addEventListener('load', () => {
			const pixels = samplePixels(image, sampleSize);
			if (pixels) {
				cache.set(key, switchColorFromPixels(pixels, primary));
				for (const oldest of cache.keys()) {
					if (cache.size <= cacheLimit) break;
					cache.delete(oldest);
				}
				persist();
			}
			resolve();
		}, { once: true });
		image.addEventListener('error', () => resolve(), { once: true });
		image.src = src;
	}).finally(() => pending.delete(key));
	pending.set(key, measurement);
	return measurement;
};

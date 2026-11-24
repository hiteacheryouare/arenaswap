import { colorDifference, hexToLab, hexToRgb, rgbToHex } from './colorMath';
import { crestInkGrouping, groupCrestInk } from './crestColor';
import { samplePixels } from './pixelSample';

const sampleSize = 96;
const minAlpha = 200;
const minShare = 0.06;
const whiteLightness = 90;
const nearPrimaryDifference = 15;

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

const storageKey = 'arenaswap.logoSwitchColors';
export const switchColorCalibration = [sampleSize, minAlpha, crestInkGrouping, minShare, whiteLightness, nearPrimaryDifference, blendSteps.join(), blendDifference].join('/');
const cacheLimit = 1024;

const readStored = (): Map<string, string | null> => {
	try {
		const raw = globalThis.localStorage?.getItem(storageKey);
		if (!raw) return new Map();
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return new Map();
		const stored = parsed as { calibration?: unknown; colors?: unknown };
		if (stored.calibration !== switchColorCalibration || typeof stored.colors !== 'object' || stored.colors === null) return new Map();
		return new Map(Object.entries(stored.colors as Record<string, unknown>)
			.filter((entry): entry is [string, string | null] => typeof entry[1] === 'string' || entry[1] === null));
	} catch {
		return new Map();
	}
};

const cache = readStored();

let persistHandle: ReturnType<typeof setTimeout> | undefined;

const persistDelayMs = 250;

const persist = (): void => {
	if (persistHandle !== undefined) clearTimeout(persistHandle);
	persistHandle = setTimeout(() => {
		persistHandle = undefined;
		try {
			globalThis.localStorage?.setItem(storageKey, JSON.stringify({ calibration: switchColorCalibration, colors: Object.fromEntries(cache) }));
		} catch {}
	}, persistDelayMs);
};

const cacheKey = (src: string, primary: string): string => `${src}|${primary.toLowerCase()}`;

export const cachedLogoSwitchColor = (src: string, primary: string): string | null | undefined => (
	cache.get(cacheKey(src, primary))
);

const pending = new Map<string, Promise<void>>();

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

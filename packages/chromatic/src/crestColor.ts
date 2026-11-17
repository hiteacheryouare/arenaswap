import { colorDifference, hexToLab, rgbToHex } from './colorMath';

const bucketShift = 3;
const sameColorDifference = 12;
export const crestInkGrouping = [bucketShift, sameColorDifference].join('/');

export interface crestInkGroup {
	color: string;
	count: number;
}

export interface crestInk {
	total: number;
	groups: crestInkGroup[];
}

interface runningGroup extends inkBucket {
	seed: string;
}

const meanOf = (group: inkBucket): string => rgbToHex(group.red / group.count, group.green / group.count, group.blue / group.count);

export interface inkBucket {
	count: number;
	red: number;
	green: number;
	blue: number;
}

export const bucketInk = (
	pixels: Uint8ClampedArray,
	minAlpha: number,
	keep: (red: number, green: number, blue: number) => boolean = () => true,
): { buckets: inkBucket[]; total: number } => {
	const buckets = new Map<number, inkBucket>();
	let total = 0;
	for (let index = 0; index + 3 < pixels.length; index += 4) {
		if (pixels[index + 3]! < minAlpha) continue;
		total += 1;
		const red = pixels[index]!;
		const green = pixels[index + 1]!;
		const blue = pixels[index + 2]!;
		if (!keep(red, green, blue)) continue;
		const key = ((red >> bucketShift) << 10) | ((green >> bucketShift) << 5) | (blue >> bucketShift);
		const bucket = buckets.get(key);
		if (bucket) {
			bucket.count += 1;
			bucket.red += red;
			bucket.green += green;
			bucket.blue += blue;
		} else {
			buckets.set(key, { count: 1, red, green, blue });
		}
	}
	return { buckets: [...buckets.values()], total };
};

export const groupCrestInk = (
	pixels: Uint8ClampedArray,
	minAlpha: number,
	keep: (red: number, green: number, blue: number) => boolean = () => true,
): crestInk => {
	const { buckets, total } = bucketInk(pixels, minAlpha, keep);

	const groups: runningGroup[] = [];
	for (const bucket of buckets.toSorted((a, b) => b.count - a.count)) {
		const shade = meanOf(bucket);
		const group = groups.find(candidate => colorDifference(candidate.seed, shade) < sameColorDifference);
		if (!group) {
			groups.push({ ...bucket, seed: shade });
			continue;
		}
		group.count += bucket.count;
		group.red += bucket.red;
		group.green += bucket.green;
		group.blue += bucket.blue;
	}

	return {
		total,
		groups: groups.toSorted((a, b) => b.count - a.count).map(group => ({ color: meanOf(group), count: group.count })),
	};
};

export const crestSampleSize = 64;
const minAlpha = 200;
const minChroma = 24;
const minShare = 0.06;
const whiteLightness = 90;

const isChromatic = (red: number, green: number, blue: number): boolean => (
	Math.max(red, green, blue) - Math.min(red, green, blue) >= minChroma
);

export const crestColorFromPixels = (pixels: Uint8ClampedArray): string | null => {
	const colored = groupCrestInk(pixels, minAlpha, isChromatic);
	const leading = colored.groups[0];
	if (leading && leading.count >= colored.total * minShare) return leading.color;
	return groupCrestInk(pixels, minAlpha).groups
		.find(group => hexToLab(group.color)!.lightness <= whiteLightness)?.color ?? null;
};

export const crestColorCalibration = [crestSampleSize, minAlpha, minChroma, minShare, whiteLightness, crestInkGrouping].join('/');

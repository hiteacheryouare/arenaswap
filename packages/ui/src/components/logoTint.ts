// A team crest is mostly background — transparent, or a white plate — so the colour worth tinting a
// disc with is the most common one that is actually a colour. Greys, white and black are rejected
// by chroma rather than by lightness, which is what stops a black-and-white crest from washing its
// disc a muddy grey instead of leaving it clean.
const minChroma = 24;
const minAlpha = 128;
// Five bits a channel. Finer than this and a gradient in the logo splits its own colour across
// enough buckets to lose to a flat one covering less of the crest.
const bucketShift = 3;

export const dominantColorFromPixels = (pixels: Uint8ClampedArray): string | null => {
	const buckets = new Map<number, { count: number; red: number; green: number; blue: number }>();

	for (let index = 0; index + 3 < pixels.length; index += 4) {
		if (pixels[index + 3]! < minAlpha) continue;

		const red = pixels[index]!;
		const green = pixels[index + 1]!;
		const blue = pixels[index + 2]!;
		if (Math.max(red, green, blue) - Math.min(red, green, blue) < minChroma) continue;

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

	let winner: { count: number; red: number; green: number; blue: number } | null = null;
	for (const bucket of buckets.values()) {
		if (!winner || bucket.count > winner.count) winner = bucket;
	}
	if (!winner) return null;

	const { count, red, green, blue } = winner;
	const channel = (total: number): string => Math.round(total / count).toString(16).padStart(2, '0');
	return `#${channel(red)}${channel(green)}${channel(blue)}`;
};

// Sampled small: the browser has already decoded the image to paint it, and averaging it down to a
// few hundred pixels is what keeps this affordable on a list of a few hundred crests.
const sampleSize = 24;

// Keyed on the URL rather than the team, so the same crest is read once however many rows show it.
const tintCache = new Map<string, string | null>();

export const logoTint = (image: HTMLImageElement, src: string): string | null => {
	const cached = tintCache.get(src);
	if (cached !== undefined) return cached;

	let color: string | null = null;
	try {
		const canvas = document.createElement('canvas');
		canvas.width = sampleSize;
		canvas.height = sampleSize;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (context) {
			context.drawImage(image, 0, 0, sampleSize, sampleSize);
			color = dominantColorFromPixels(context.getImageData(0, 0, sampleSize, sampleSize).data);
		}
	} catch {
		// An image that arrived without CORS headers taints the canvas and throws on read. The disc
		// stays plain white, which is the state it degrades to anyway.
	}

	tintCache.set(src, color);
	return color;
};

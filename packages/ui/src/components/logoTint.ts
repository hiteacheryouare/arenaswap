import type { TeamMonoMarks } from '@arenaswap/core/types';

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

// ── Is this crest still readable where it is being drawn? ────────────────────
// A team's real colours are the point, so a crest is drawn in them unless doing so stops it being a
// crest. What decides that is not the team's published hex — it is the artwork.
//
// The question is whether *part* of the crest genuinely stands out, not whether most of it faintly
// does. Measuring the faint version gets it backwards in both directions, and both were real:
//
//   Texas Rangers on their own navy — 73% of that crest cleared a gentle 2.5:1 and nothing in it
//   cleared 3.8:1. Uniformly muddy, and it passed.
//
//   Washington Commanders on their own maroon — only 42% cleared 2.5:1, because most of the mark is
//   dark. The part that is not is the gold W, at 10.8:1. Plainly readable, and it failed.
//
// So the measure is the share of the crest's ink that clears a *strong* contrast.
//
// A share is an area, and a stroke is not an area. The Marlins are a black M with a thin blue and
// pink outline drawn round it — the outline is the whole mark, and at 48x48 it is 5% of the crest's
// ink. A tenth cut straight through it, and through the Bears' head and the Canucks' orca with it.
// What the share is actually for is separating a feature of the artwork from an antialiased edge,
// and measured across 124 crests on four surfaces the two do not overlap anywhere near a tenth: the
// crests with genuinely nothing in them sit at 0.0% to 0.4% — the Yankees, the Rangers, Memphis,
// Carolina on a guide bar — and every thin-stroke case is above 4%.
const strongInkShare = 0.04;

// 4.5:1 rather than 3:1. The lower bar cannot tell a highlight from a wash — Rangers navy and
// Commanders gold both clear 3:1 against their own backdrops, and only one of them is visible.
const strongInkFloor = 4.5;

// A floor is only meaningful if the surface can deliver it, and a mid-tone one cannot. Against the
// Marlins' own blue — luminance 0.17 under the hero's scrim — pure black reaches 4.4:1 and only a
// near-white clears 4.5, so an absolute floor finds no strong ink in *any* crest drawn on it and
// sends every one of them to a monochrome mark. That is not a judgement about the artwork; it is the
// floor asking for something the backdrop does not have.
//
// So the floor is capped at a share of the best contrast the surface can produce. Every dark surface
// in the product reaches 13:1 or more, so 4.5 is well inside what they can do and none of them moves
// — the cap only ever engages on a team shown in a light or mid-tone alternate.
//
// And a light alternate is a team's *own other colour*, which is the one backdrop the crest was
// actually designed against. A club picks its two colours to be told apart rather than to clear a
// text-contrast bar, and measured on the real pairings they mostly do not: USC's cardinal on USC's
// gold is 2.6:1, the Athletics' green on their gold 3.6:1. Both are plainly legible — large solid
// letterforms carrying their own outline — and at 60% of reach both were being thrown away for a
// black mark that says less. 35% is what those pairings need, and it is still nowhere near enough
// to rescue a crest that has genuinely vanished: the Rangers on their own navy and the Phillies on
// their own red both stay at zero strong ink, because the cap cannot engage at all on a surface
// whose reach is over 12.9.
const strongInkReachShare = 0.35;

const surfaceReach = (backgroundLuminance: number): number => Math.max(
	(backgroundLuminance + 0.05) / 0.05,
	1.05 / (backgroundLuminance + 0.05),
);

const strongFloorOn = (backgroundLuminance: number): number => (
	Math.min(strongInkFloor, surfaceReach(backgroundLuminance) * strongInkReachShare)
);

// The other half of the question. A crest can carry a bright minority and still read badly if the
// rest of it has vanished into the surface, and this is what keeps the Panthers monochrome: on the
// popup 6% of that cat stands out and 70% of it is simply gone, so what arrives is a few disjoint
// highlights rather than an animal.
//
// Absent has to mean absent, and 1.5:1 was calling ink absent that you can see. Both the Marlins and
// the Rockies are a mass of near-black carrying a bright mark, and the same ink lands in two
// different places: black on a guide bar is 1.37:1, which is faint and is the letterform you read,
// and black on the Rockies' own purple is 1.21:1, which is a hole. A floor of 1.3 sits between them
// — and that it is the *surface* separating them rather than the artwork is the measure doing its
// job, since the Rockies on a guide bar read too.
const deadInkFloor = 1.3;

// Measured rather than argued. Across 124 crests on four surfaces each the share that has gone
// leaves a gap either side of the high fifties: everything up to 55% reads, and from 58.8% up
// nothing does — the Rockies on their own purple at 60.4%, the Colts, the Cowboys, the Flyers,
// Toronto, and Carolina at 70%.
const deadInkShare = 0.57;

// Sampled finer than the tint above, which only has to find the most common colour and reads 24x24
// for it. Legibility turns on thin detail: the Diamondbacks' pale snake outline is the whole reason
// that crest is readable on their own red, and at 24x24 the downscale averages it away — 14% of the
// crest's ink at 48x48, 1.8% at 24. 48 is also about what the hero actually renders a crest at.
const legibilitySampleSize = 48;

const channelLuminance = (value: number): number => {
	const scaled = value / 255;
	return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (red: number, green: number, blue: number): number => (
	(0.2126 * channelLuminance(red)) + (0.7152 * channelLuminance(green)) + (0.0722 * channelLuminance(blue))
);

export const hexLuminance = (hex: string): number => {
	const matched = /^#([\da-fA-F]{6})$/.exec(hex);
	if (!matched) return 0;
	const value = Number.parseInt(matched[1]!, 16);
	return relativeLuminance((value >> 16) & 255, (value >> 8) & 255, value & 255);
};

const inkShareAbove = (pixels: Uint8ClampedArray, backgroundLuminance: number, floor: number, below: boolean): number => {
	let opaque = 0;
	let counted = 0;
	for (let index = 0; index + 3 < pixels.length; index += 4) {
		if (pixels[index + 3]! < minAlpha) continue;
		opaque += 1;
		const ink = relativeLuminance(pixels[index]!, pixels[index + 1]!, pixels[index + 2]!);
		const ratio = (Math.max(ink, backgroundLuminance) + 0.05) / (Math.min(ink, backgroundLuminance) + 0.05);
		if (below ? ratio < floor : ratio >= floor) counted += 1;
	}
	// A crest that is entirely transparent has no ink to be unreadable.
	return opaque === 0 ? (below ? 0 : 1) : counted / opaque;
};

// The share of a crest's own ink that stands strongly off a background.
export const strongInkFraction = (pixels: Uint8ClampedArray, backgroundLuminance: number): number => (
	inkShareAbove(pixels, backgroundLuminance, strongFloorOn(backgroundLuminance), false)
);

// The share that has effectively disappeared into it.
export const deadInkFraction = (pixels: Uint8ClampedArray, backgroundLuminance: number): number => (
	inkShareAbove(pixels, backgroundLuminance, deadInkFloor, true)
);

export const crestInkReads = (pixels: Uint8ClampedArray, backgroundLuminance: number): boolean => (
	strongInkFraction(pixels, backgroundLuminance) >= strongInkShare
	&& deadInkFraction(pixels, backgroundLuminance) <= deadInkShare
);

// Persisted, because an extension popup is a brand new document every time it is opened, so an
// in-memory cache is empty on every single open. Without this the first frame draws the colour crest,
// the measurement runs, and only then does the monochrome mark start downloading — which is the
// second-long swap you can watch happen. With it, a crest seen once is drawn correctly from the
// first frame forever after.
//
// `localStorage` rather than `storage.local` because this is read during render and has to be
// synchronous; `storage.local` would resolve a frame or two too late to prevent the very thing it
// is for. Both the popup and the guide are ordinary extension pages, so both have it.
const legibilityStorageKey = 'arenaswap.crestLegibility';

// Every verdict in storage was reached under the numbers above, so moving any of them has to throw
// the stored answers away — a crest measured under the old calibration would otherwise keep its old
// treatment for as long as the browser profile lives, on the one machine where it is hardest to
// notice.
//
// Built out of those numbers rather than hand-bumped, because a version somebody has to remember to
// raise is a version that gets left behind. That is not hypothetical: it was raised once, the
// thresholds moved twice more underneath it, and the stale answers went on being served.
export const legibilityCalibration = [
	strongInkShare,
	strongInkFloor,
	strongInkReachShare,
	deadInkFloor,
	deadInkShare,
	legibilitySampleSize,
].join('/');

interface StoredLegibility {
	calibration?: unknown;
	verdicts?: unknown;
}

const readStoredLegibility = (): Map<string, boolean> => {
	try {
		const raw = globalThis.localStorage?.getItem(legibilityStorageKey);
		if (!raw) return new Map();
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return new Map();
		const { calibration, verdicts } = parsed as StoredLegibility;
		if (calibration !== legibilityCalibration) return new Map();
		if (typeof verdicts !== 'object' || verdicts === null) return new Map();
		return new Map(Object.entries(verdicts as Record<string, unknown>)
			.filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
	} catch {
		// No storage, a quota error, or something else wrote nonsense to the key. Measuring again is
		// always available, so there is nothing to recover.
		return new Map();
	}
};

const legibilityCache = readStoredLegibility();

let persistHandle: ReturnType<typeof setTimeout> | undefined;

// Batched: a guide opens with a hundred bars and would otherwise serialise the whole map once per
// crest measured.
const persistLegibility = (): void => {
	if (persistHandle !== undefined) return;
	persistHandle = setTimeout(() => {
		persistHandle = undefined;
		try {
			globalThis.localStorage?.setItem(legibilityStorageKey, JSON.stringify({
				calibration: legibilityCalibration,
				verdicts: Object.fromEntries(legibilityCache),
			}));
		} catch {
			// Storage full or unavailable. The cache still works for this document.
		}
	}, 0);
};

const legibilityKey = (src: string, background: string): string => `${src}|${background}`;

// The answer for a crest already measured, or undefined if it has never been sampled. Lets a caller
// render the right artwork on the first frame rather than showing the wrong one and swapping.
export const cachedCrestReadsOn = (src: string, background: string): boolean | undefined => (
	legibilityCache.get(legibilityKey(src, background))
);

export const crestReadsOn = (image: HTMLImageElement, src: string, background: string): boolean => {
	const key = legibilityKey(src, background);
	const cached = legibilityCache.get(key);
	if (cached !== undefined) return cached;

	let reads = true;
	try {
		const canvas = document.createElement('canvas');
		canvas.width = legibilitySampleSize;
		canvas.height = legibilitySampleSize;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (context) {
			context.drawImage(image, 0, 0, legibilitySampleSize, legibilitySampleSize);
			const pixels = context.getImageData(0, 0, legibilitySampleSize, legibilitySampleSize).data;
			reads = crestInkReads(pixels, hexLuminance(background));
		}
	} catch {
		// A crest that arrived without CORS headers taints the canvas and throws on read. Unmeasured
		// means kept: the colour artwork is what the product wants, and the disc is still behind it.
	}

	legibilityCache.set(key, reads);
	persistLegibility();
	return reads;
};

// Swapping a crest for the white mark is only an improvement if white is itself readable where the
// crest is going. It usually is, because these surfaces are dark — but a team drawn in its own light
// alternate is a mid-tone backdrop, and there white is the *worse* of the two. The Commanders on
// their own gold are the case: the burgundy in their crest reaches 4.27 against it and pure white
// reaches 3.28, so trading one for the other makes the mark harder to see, not easier.
// Which of a team's two monochrome marks to draw on this surface, or undefined if neither stands
// off it. White on a dark backdrop, black on a light one — and it has to be a real choice rather
// than always the white one, because a white mark on a team's gold reaches 3.3:1 and is no more
// readable than the colour crest it was brought in to replace. That was the Athletics and the
// Commanders: both carry a gold alternate, and on it neither their artwork nor a white mark reads,
// so the crest fell all the way through to the disc. Their black mark reaches 6:1.
//
// The two ranges overlap — white clears the floor up to a backdrop luminance of 0.183 and black from
// 0.175 — so a team that has the marks always has one that works, and the disc is left to the clubs
// ESPN has drawn none for.
export const pickMonoMark = (marks: TeamMonoMarks | undefined, background: string): string | undefined => {
	if (!marks) return undefined;
	const backdrop = hexLuminance(background);
	// The flat floor rather than the capped one, which is the difference between artwork a team
	// published and a mark we are choosing. A crest is judged against what its own backdrop can
	// deliver, because a club's two colours are a fact about the club; a substitute has to earn the
	// full 4.5:1, since the tinted disc is always available and works on anything. It is also what
	// the overlap below is measured at.
	const floor = strongInkFloor;
	return [
		{ url: marks.white, ratio: 1.05 / (backdrop + 0.05) },
		{ url: marks.black, ratio: (backdrop + 0.05) / 0.05 },
	]
		.filter(candidate => candidate.url !== undefined && candidate.ratio >= floor)
		.toSorted((a, b) => b.ratio - a.ratio)[0]?.url;
};

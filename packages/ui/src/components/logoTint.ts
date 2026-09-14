import type { TeamMonoMarks } from '@arenaswap/core/types';
import { blackInkContrast, contrastBetween, hexLuminance, rgbLuminance, rgbToHex, whiteInkContrast } from './colorMath';

// A crest is mostly background — transparent, or a white plate — so the colour worth tinting a disc
// with is the most common one that is actually a colour. Greys, white and black are rejected by
// chroma rather than lightness, which is what stops a black-and-white crest washing its disc grey.
const minChroma = 24;
// What counts as ink at all, for both the tint below and every legibility verdict in this file.
const minAlpha = 128;
// Five bits a channel. Finer, and a gradient splits its own colour across enough buckets to lose to
// a flat one covering less of the crest.
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

	// Picked after the loop rather than tracked during it, so a tie goes to the bucket seen first
	// whatever order the two climbed in.
	let winner: { count: number; red: number; green: number; blue: number } | null = null;
	for (const bucket of buckets.values()) {
		if (!winner || bucket.count > winner.count) winner = bucket;
	}
	if (!winner) return null;
	const { count, red, green, blue } = winner;
	return rgbToHex(red / count, green / count, blue / count);
};

// ── Reading a crest's pixels back off the page ───────────────────────────────
// One canvas for the whole document rather than one per crest. A guide opens with a hundred bars,
// and past its canvas memory ceiling Chrome starts handing back a null context — which used to be
// indistinguishable from a measurement, see `crestReadsOn`. Assigning `width` clears the bitmap, so
// consecutive crests cannot bleed into each other.
let sampler: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null = null;

const samplePixels = (image: HTMLImageElement, size: number): Uint8ClampedArray | null => {
	try {
		if (!sampler) {
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) return null;
			sampler = { canvas, context };
		}
		sampler.canvas.width = size;
		sampler.canvas.height = size;
		sampler.context.drawImage(image, 0, 0, size, size);
		return sampler.context.getImageData(0, 0, size, size).data;
	} catch {
		// A crest that arrived without CORS headers taints the canvas and throws on read.
		return null;
	}
};

// Sampled small: the browser has already decoded the image to paint it, and averaging it down to a
// few hundred pixels is what keeps this affordable on a list of a few hundred crests.
const tintSampleSize = 24;

// Keyed on the URL rather than the team, so the same crest is read once however many rows show it.
const tintCache = new Map<string, string | null>();

export const cachedLogoTint = (src: string): string | null | undefined => tintCache.get(src);

export const logoTint = (image: HTMLImageElement, src: string): string | null => {
	const cached = tintCache.get(src);
	if (cached !== undefined) return cached;

	const pixels = samplePixels(image, tintSampleSize);
	// A tainted canvas is not a crest with no colour in it, so it is not cached as one. The disc
	// stays plain white, which is the state it degrades to anyway.
	if (!pixels) return null;

	const color = dominantColorFromPixels(pixels);
	tintCache.set(src, color);
	return color;
};

// ── Is this crest still readable where it is being drawn? ────────────────────
// A team's real colours are the point, so a crest is drawn in them unless doing so stops it being a
// crest. What decides that is not the team's published hex — it is the artwork.

// The share of a crest's ink that has to stand *strongly* off the surface. Measuring the faint
// version got it backwards in both directions: the Rangers on their own navy had 73% clear a gentle
// 2.5:1 and nothing clear 3.8:1, and the Commanders on their maroon had only 42% clear 2.5:1 while
// the gold W that carries the mark sat at 10.8:1.
//
// A share is an area and a stroke is not one. The Marlins are a black M with a thin blue-and-pink
// outline — the outline is the whole mark, and at 48x48 it is 5% of the ink. Across 124 crests on
// four surfaces the crests with genuinely nothing in them sit at 0.0-0.4% and every thin-stroke case
// is above 4%, so a tenth cut through the Marlins, the Bears' head and the Canucks' orca.
const strongInkShare = 0.04;

// 4.5:1 rather than 3:1, which cannot tell a highlight from a wash — Rangers navy and Commanders
// gold both clear 3:1 on their own backdrops and only one of them is visible.
const strongInkFloor = 4.5;

// A floor only means something if the surface can deliver it. Against the Marlins' own blue under
// the hero scrim, pure black reaches 4.4:1, so an absolute 4.5 finds no strong ink in *any* crest
// drawn there — that is the floor asking for something the backdrop does not have.
//
// So it is capped at a share of the best contrast the surface can produce. Every dark surface in the
// product reaches 13:1 or more, so the cap only engages on a team shown in its own light alternate —
// the one backdrop the crest was actually designed against, where clubs pick two colours to be told
// apart rather than to clear a text bar. USC's cardinal on USC's gold is 2.6:1 and the Athletics'
// green on theirs 3.6:1; both are plainly legible, and 60% threw both away for a black mark. 35%
// keeps them and still cannot rescue the Rangers or the Phillies, whose surfaces reach over 12.9.
const strongInkReachShare = 0.35;

const surfaceReach = (backgroundLuminance: number): number => Math.max(
	blackInkContrast(backgroundLuminance),
	whiteInkContrast(backgroundLuminance),
);

const strongFloorOn = (backgroundLuminance: number): number => (
	Math.min(strongInkFloor, surfaceReach(backgroundLuminance) * strongInkReachShare)
);

// The other half of the question: a crest can carry a bright minority and still read badly if the
// rest has vanished. It is what keeps the Panthers monochrome — 6% of that cat stands out and 70% is
// gone, so what arrives is a few disjoint highlights rather than an animal.
//
// 1.5 was calling ink absent that you can see. The Marlins and the Rockies are both a near-black mass
// carrying a bright mark, and the same ink lands in two places: black on a guide bar is 1.37:1, faint
// and the letterform you read; black on the Rockies' purple is 1.21:1, a hole. 1.3 sits between them.
const deadInkFloor = 1.3;

// Measured, not argued: across 124 crests on four surfaces the share that has gone leaves a gap
// either side of the high fifties. Everything to 55% reads; from 58.8% up nothing does — the Rockies
// on their purple at 60.4%, the Colts, the Cowboys, the Flyers, Toronto, and Carolina at 70%.
const deadInkShare = 0.57;

// Finer than the tint, which only has to find the most common colour. Legibility turns on thin
// detail: the Diamondbacks' pale snake outline is 14% of their crest's ink at 48x48 and 1.8% at 24,
// and it is the whole reason that crest reads on their own red. 48 is also about what the hero
// renders a crest at.
const legibilitySampleSize = 48;

interface InkMeasurement {
	strong: number;
	dead: number;
}

// Both shares in one pass. They walk the same 2,304 pixels and differ only in which floor they
// compare each ratio against, and the real caller — `crestInkReads` — always wants both.
const measureInk = (pixels: Uint8ClampedArray, backgroundLuminance: number): InkMeasurement => {
	const strongFloor = strongFloorOn(backgroundLuminance);
	let opaque = 0;
	let strong = 0;
	let dead = 0;

	for (let index = 0; index + 3 < pixels.length; index += 4) {
		if (pixels[index + 3]! < minAlpha) continue;
		opaque += 1;
		const ink = rgbLuminance(pixels[index]!, pixels[index + 1]!, pixels[index + 2]!);
		const ratio = contrastBetween(ink, backgroundLuminance);
		if (ratio >= strongFloor) strong += 1;
		if (ratio < deadInkFloor) dead += 1;
	}

	// A crest that is entirely transparent has no ink to be unreadable.
	return opaque === 0 ? { strong: 1, dead: 0 } : { strong: strong / opaque, dead: dead / opaque };
};

// The share of a crest's own ink that stands strongly off a background.
export const strongInkFraction = (pixels: Uint8ClampedArray, backgroundLuminance: number): number => (
	measureInk(pixels, backgroundLuminance).strong
);

// The share that has effectively disappeared into it.
export const deadInkFraction = (pixels: Uint8ClampedArray, backgroundLuminance: number): number => (
	measureInk(pixels, backgroundLuminance).dead
);

export const crestInkReads = (pixels: Uint8ClampedArray, backgroundLuminance: number): boolean => {
	const { strong, dead } = measureInk(pixels, backgroundLuminance);
	return strong >= strongInkShare && dead <= deadInkShare;
};

// ── The verdict cache ────────────────────────────────────────────────────────
// Persisted, because a popup is a brand new document every open and an in-memory cache is empty
// every time. Without this the first frame draws the colour crest, the measurement runs, and only
// then does the monochrome mark start downloading — the second-long swap you can watch happen.
//
// `localStorage` rather than `storage.local` because this is read during render and has to be
// synchronous. Both the popup and the guide are ordinary extension pages, so both have it.
const legibilityStorageKey = 'arenaswap.crestLegibility';

// Every stored verdict was reached under the numbers above, so moving any of them has to throw the
// stored answers away — otherwise a crest measured under the old calibration keeps its old treatment
// for as long as the browser profile lives, on the machine where it is hardest to notice.
//
// Built out of those numbers rather than hand-bumped: a version somebody has to remember to raise is
// a version that gets left behind, which is not hypothetical. It was raised once, the thresholds
// moved twice more underneath it, and the stale answers went on being served.
export const legibilityCalibration = [
	strongInkShare,
	strongInkFloor,
	strongInkReachShare,
	deadInkFloor,
	deadInkShare,
	legibilitySampleSize,
	minAlpha,
].join('/');

// Enough for every team in all 31 leagues on a handful of surfaces each, and a ceiling on what a
// long-lived profile can grow this key to. Map iterates in insertion order, so the overflow that
// goes is the oldest thing measured.
const legibilityCacheLimit = 4096;

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

// Trailing rather than leading. Crests land in separate tasks, so collapsing within one task still
// left a guide serialising the whole map dozens of times while the grid was being scrolled.
const persistDelayMs = 250;

const persistLegibility = (): void => {
	if (persistHandle !== undefined) clearTimeout(persistHandle);
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
	}, persistDelayMs);
};

// Lowercased, because the same surface arrives written both ways: `underHeroScrim` builds its hex in
// lower case and `normalizeOne` uppercases every colour ESPN publishes, so an end zone would
// otherwise never share a verdict with anything else.
const legibilityKey = (src: string, background: string): string => `${src}|${background.toLowerCase()}`;

// The answer for a crest already measured, or undefined if it has never been sampled. Lets a caller
// render the right artwork on the first frame rather than showing the wrong one and swapping.
export const cachedCrestReadsOn = (src: string, background: string): boolean | undefined => (
	legibilityCache.get(legibilityKey(src, background))
);

export const crestReadsOn = (image: HTMLImageElement, src: string, background: string): boolean => {
	const key = legibilityKey(src, background);
	const cached = legibilityCache.get(key);
	if (cached !== undefined) return cached;

	const pixels = samplePixels(image, legibilitySampleSize);
	// Unmeasured means kept, and means *not written down*: a tainted canvas or a browser out of
	// canvas memory is not a verdict, and storing it as one would serve "this crest reads fine"
	// out of `localStorage` forever, since nothing ever re-measures a key that is present.
	if (!pixels) return true;

	const reads = crestInkReads(pixels, hexLuminance(background));
	legibilityCache.set(key, reads);
	for (const oldest of legibilityCache.keys()) {
		if (legibilityCache.size <= legibilityCacheLimit) break;
		legibilityCache.delete(oldest);
	}
	persistLegibility();
	return reads;
};

// Which of a team's two monochrome marks to draw here, or undefined if neither stands off the
// surface. It has to be a real choice rather than always the white one: on the Commanders' own gold
// the burgundy in their crest reaches 4.27 and pure white only 3.28, so the swap makes the mark
// harder to see. Their black mark reaches 6:1, and the Athletics carry the same gold problem.
//
// White clears the floor up to a backdrop luminance of 0.183 and black from 0.175, so the two ranges
// overlap: a team with both marks always has one that works, and the disc is left to the clubs ESPN
// has drawn none for.
export const pickMonoMark = (marks: TeamMonoMarks | undefined, background: string): string | undefined => {
	if (!marks) return undefined;
	const backdrop = hexLuminance(background);
	// The flat floor rather than the capped one — the difference between artwork a team published
	// and a mark we are choosing. A crest is judged against what its own backdrop can deliver
	// because a club's two colours are a fact about the club; a substitute has to earn the full
	// 4.5:1, since the tinted disc is always available and works on anything.
	return [
		{ url: marks.white, ratio: whiteInkContrast(backdrop) },
		{ url: marks.black, ratio: blackInkContrast(backdrop) },
	]
		.filter(candidate => candidate.url !== undefined && candidate.ratio >= strongInkFloor)
		.toSorted((a, b) => b.ratio - a.ratio)[0]?.url;
};

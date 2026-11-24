// ── Reading a crest's pixels back off the page ───────────────────────────────
// One canvas for the whole document rather than one per crest. A guide opens with a hundred bars,
// and past its canvas memory ceiling Chrome starts handing back a null context — which used to be
// indistinguishable from a measurement, see `crestReadsOn`. Assigning `width` clears the bitmap, so
// consecutive crests cannot bleed into each other.
let sampler: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null = null;

export const samplePixels = (image: HTMLImageElement, size: number): Uint8ClampedArray | null => {
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

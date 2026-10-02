import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// A release's lead image is a base-relative path into public/, which astro:assets does not
// measure. The width and height are read off the PNG header so the browser can reserve the space
// before the image arrives; anything that is not a PNG is left to size itself as it did before.
const publicImageSize = (src: string): { width: number; height: number } | undefined => {
	const relative = src.startsWith(import.meta.env.BASE_URL) ? src.slice(import.meta.env.BASE_URL.length) : src;
	if (!relative.endsWith('.png')) return undefined;
	const header = readFileSync(join(process.cwd(), 'public', relative)).subarray(16, 24);
	return { width: header.readUInt32BE(0), height: header.readUInt32BE(4) };
};

export default publicImageSize;

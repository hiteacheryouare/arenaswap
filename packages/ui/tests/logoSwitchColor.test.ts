import { switchColorFromPixels } from '../src/components/logoSwitchColor';
import { colorDifference } from '../src/components/colorMath';

// A crest as a bag of opaque pixels: each entry is a colour and how many pixels of it there are.
const crest = (...inks: [string, number][]): Uint8ClampedArray => {
	const pixels: number[] = [];
	for (const [hex, count] of inks) {
		const packed = Number.parseInt(hex.slice(1), 16);
		for (let index = 0; index < count; index++) pixels.push((packed >> 16) & 255, (packed >> 8) & 255, packed & 255, 255);
	}
	return new Uint8ClampedArray(pixels);
};

const maryland = '#CE1126';

describe('switchColorFromPixels', () => {
	test('takes the gold out of a red, gold and black crest', () => {
		const color = switchColorFromPixels(crest([maryland, 600], ['#F8DB3F', 200], ['#000000', 150], ['#FFFFFF', 50]), maryland);
		expect(colorDifference(color!, '#F8DB3F')).toBeLessThan(2);
	});

	// Louisville: the bird is red, the outline black, and the gold is a sliver.
	test('allows black, which is what Apple paints Louisville in', () => {
		const color = switchColorFromPixels(crest(['#C9001F', 500], ['#050403', 300], ['#FDB913', 40], ['#FFFFFF', 160]), '#C9001F');
		expect(colorDifference(color!, '#050403')).toBeLessThan(2);
	});

	// The Reds: red and white, with every edge pixel a pink somewhere between the two.
	test('finds nothing in a crest that is only its primary, white, and the blends between them', () => {
		const pinks: [string, number][] = [['#D84050', 20], ['#E87080', 20], ['#F0A0A8', 20], ['#F8C8CC', 20]];
		expect(switchColorFromPixels(crest(['#C6011F', 700], ['#FFFFFF', 200], ...pinks), '#C6011F')).toBeNull();
	});

	test('ignores a colour too small a share of the crest to be one of its colours', () => {
		expect(switchColorFromPixels(crest(['#003E7E', 900], ['#FFFFFF', 80], ['#FDB71A', 20]), '#003E7E')).toBeNull();
	});

	test('skips transparent pixels', () => {
		const pixels = crest([maryland, 300], ['#F8DB3F', 100]);
		const transparent = new Uint8ClampedArray(4000).fill(0);
		expect(switchColorFromPixels(new Uint8ClampedArray([...pixels, ...transparent]), maryland)).not.toBeNull();
	});
});

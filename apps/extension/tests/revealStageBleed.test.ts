import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { revealStageBleedPx } from '../entrypoints/popup/cardReveal';

const globalScss = readFileSync(join(__dirname, '..', 'assets', 'global.scss'), 'utf8');

describe('reveal stage bleed', () => {
	it('is the same width in global.scss as the seam lean is measured across', () => {
		expect(Number(/\$reveal-stage-bleed:\s*(\d+)px;/.exec(globalScss)![1])).toBe(revealStageBleedPx);
	});
});

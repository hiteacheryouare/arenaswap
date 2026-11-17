import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { motionDuration, motionEase, motionLoop } from '../src/motion';

const scss = readFileSync(join(__dirname, '..', 'src', '_motion.scss'), 'utf8');
const scssMilliseconds = Object.fromEntries(
	Array.from(scss.matchAll(/\$motion-([a-z]+):\s+(\d+)ms;/g), ([, name, ms]) => [name, Number(ms)]),
);

describe('motion scale', () => {
	it.each(Object.entries({ ...motionDuration, ...motionLoop }))('%s matches _motion.scss', (name, ms) => {
		expect(scssMilliseconds[name]).toBe(ms);
	});

	it('uses the same signature easing curve', () => {
		expect(/\$motion-ease:\s+([^;]+);/.exec(scss)![1]).toBe(motionEase);
	});
});

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const localesDir = join(__dirname, '../locales');

interface StaleStrings {
	staleMinutes: { 1: string; n: string };
	staleUnderMinute: string;
}

const gameCardStrings = (file: string) => (
	JSON.parse(readFileSync(join(localesDir, file), 'utf8')) as { gameCard: StaleStrings }
).gameCard;

describe('the stale league note', () => {
	test.each(readdirSync(localesDir).filter(file => file.endsWith('.json')))('%s writes both plural forms and the under-a-minute line', file => {
		const { staleMinutes, staleUnderMinute } = gameCardStrings(file);

		expect(staleMinutes['1']).toContain('1');
		expect(staleMinutes.n).toContain('$1');
		expect(staleUnderMinute).not.toContain('$1');
		expect(new Set([staleMinutes['1'], staleMinutes.n, staleUnderMinute]).size).toBe(3);
	});
});

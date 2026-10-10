import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const localesDir = join(__dirname, '../locales');

interface PluralStrings { 1: string; n: string }

interface StaleStrings {
	staleMinutes: PluralStrings;
	staleHours: PluralStrings;
}

const gameCardStrings = (file: string) => (
	JSON.parse(readFileSync(join(localesDir, file), 'utf8')) as { gameCard: StaleStrings }
).gameCard;

describe('the stale league note', () => {
	test.each(readdirSync(localesDir).filter(file => file.endsWith('.json')))('%s writes both plural forms for minutes and for hours', file => {
		const { staleMinutes, staleHours } = gameCardStrings(file);

		for (const forms of [staleMinutes, staleHours]) {
			expect(forms['1']).toContain('1');
			expect(forms.n).toContain('$1');
			expect(forms['1']).not.toBe(forms.n);
		}
		expect(staleHours.n).not.toBe(staleMinutes.n);
	});

	test('pt_PT keeps the European spelling the rest of its file uses', () => {
		expect(gameCardStrings('pt_PT.json').staleMinutes.n).toContain('actualização');
	});
});

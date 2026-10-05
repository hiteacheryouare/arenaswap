import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultFantasyScoring } from 'powerscore';
import { fantasyRuleGroups, fantasySports, ruleStep } from '../entrypoints/popup/components/fantasyScoringLabels';

const en = JSON.parse(readFileSync(join(__dirname, '../locales/en.json'), 'utf8')) as Record<string, unknown>;
const lookup = (key: string): unknown => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);

describe('fantasy scoring labels', () => {
	it('lists every rule the engine scores, once, for every sport', () => {
		for (const sport of fantasySports) {
			const listed = fantasyRuleGroups[sport].flatMap(group => group.rules.map(rule => rule.rule));
			expect(listed.toSorted()).toEqual(Object.keys(defaultFantasyScoring[sport]).toSorted());
		}
	});

	it('names every rule and heading in English', () => {
		for (const sport of fantasySports) {
			for (const group of fantasyRuleGroups[sport]) {
				if ('headingKey' in group) expect(typeof lookup(group.headingKey)).toBe('string');
				for (const rule of group.rules) expect(typeof lookup(rule.labelKey)).toBe('string');
			}
		}
	});

	it('steps an input as finely as its default is written', () => {
		expect(ruleStep(0.04)).toBeCloseTo(0.01);
		expect(ruleStep(1.2)).toBeCloseTo(0.1);
		expect(ruleStep(6)).toBe(1);
		expect(ruleStep(-2)).toBe(1);
	});
});

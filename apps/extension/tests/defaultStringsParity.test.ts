import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultStrings } from '@arenaswap/ui/src/components/defaultStrings';

const flatten = (node: Record<string, unknown>, prefix = ''): Record<string, unknown> =>
	Object.entries(node).reduce<Record<string, unknown>>((flat, [key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		const isPlural = typeof value === 'object' && value !== null && '1' in value && 'n' in value;
		if (typeof value === 'object' && value !== null && !isPlural) return { ...flat, ...flatten(value as Record<string, unknown>, path) };
		return { ...flat, [path]: value };
	}, {});

const readEnglish = (text: string) => flatten(JSON.parse(text) as Record<string, unknown>);

export const findDrift = (english: Record<string, unknown>) =>
	Object.entries(defaultStrings).flatMap(([key, fallback]) => {
		if (!(key in english)) return [];
		const value = english[key];
		const expected = typeof value === 'string' ? value : `${(value as Record<string, string>)['1']} | ${(value as Record<string, string>).n}`;
		return expected === fallback ? [] : [key];
	});

describe('ui default strings', () => {
	it('match the extension en.json', () => {
		const english = readEnglish(readFileSync(join(__dirname, '../locales/en.json'), 'utf8'));
		expect(findDrift(english)).toEqual([]);
	});
});

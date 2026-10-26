import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// A key missing from a locale silently falls back to English, and a dropped placeholder silently
// prints a sentence with a hole in it, so neither shows up anywhere but on a translated screen.

const localesDir = join(__dirname, '../locales');
const localeFiles = readdirSync(localesDir).filter(file => file.endsWith('.json') && file !== 'en.json');

interface Strings { [key: string]: string | Strings }

const readLocale = (file: string): Strings => JSON.parse(readFileSync(join(localesDir, file), 'utf8')) as Strings;

const flatten = (strings: Strings, prefix = ''): Map<string, string> => new Map(
	Object.entries(strings).flatMap(([key, value]) => (
		typeof value === 'string' ? [[prefix + key, value] as const] : [...flatten(value, `${prefix}${key}.`)]
	)),
);

const placeholders = (text: string): string[] => [...text.matchAll(/\{[a-zA-Z]+\}|\$\d/g)].map(match => match[0]).toSorted();

const english = flatten(readLocale('en.json'));

// A fragment of a sentence split around inline markup (English "When ") can rightly be empty in a
// language that orders the sentence differently, so only whole strings are held to the blank check.
const isFragment = (text: string) => /^\s|\s$/.test(text);

describe.each(localeFiles)('%s', file => {
	const translated = flatten(readLocale(file));

	test('has every string English has', () => {
		expect([...english.keys()].filter(key => !translated.has(key))).toEqual([]);
	});

	test('has no strings English has dropped', () => {
		expect([...translated.keys()].filter(key => !english.has(key))).toEqual([]);
	});

	test('fills in the same placeholders English does', () => {
		const mismatched = [...english].flatMap(([key, text]) => {
			const theirs = translated.get(key);
			if (theirs === undefined) return [];
			const expected = placeholders(text);
			const actual = placeholders(theirs);
			return expected.join() === actual.join() ? [] : [{ key, expected, actual }];
		});

		expect(mismatched).toEqual([]);
	});

	test('leaves no whole string blank where English has words', () => {
		expect([...english].filter(([key, text]) => text.trim() !== '' && !isFragment(text) && translated.get(key)?.trim() === '').map(([key]) => key)).toEqual([]);
	});
});

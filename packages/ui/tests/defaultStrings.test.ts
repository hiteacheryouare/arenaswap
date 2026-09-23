import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defaultStrings } from '../src/components/defaultStrings';

/* `defaultStrings` is the English fallback the shared components fall back to when nothing has put
   a translator on the context. That is not a hypothetical: `apps/docs` renders `LiveGameCard`
   straight out of `ScreenshotCard.tsx` with no provider around it, which is how the store
   screenshots get drawn. A key missing from here throws nothing — `i18nContext`'s default
   translator does `defaultStrings[key] ?? key` — so what ships is a card with the literal text
   `gameCard.somethingNew` where a label should be, baked into a screenshot.

   Scanning the source rather than rendering, because this project's Jest runs in Node with no
   document. The scan has to see *every* shape a call site uses, not the common one: an earlier
   version of this file matched `t('key')` only, and quietly skipped the two keys in
   `inningHalfIcon.tsx`, which are written `t(cond ? 'a' : 'b')`. Comments are stripped first so a
   key mentioned in prose cannot invent a requirement, and a call whose key is not a literal at all
   fails the run rather than being silently dropped — an unenumerable key is exactly the one that
   would slip through. */

const srcDir = join(__dirname, '..', 'src');
const skipped = new Set(['defaultStrings.ts', 'i18nContext.tsx']);

const sourceFiles = (dir: string): string[] => readdirSync(dir).flatMap(name => {
	const path = join(dir, name);
	if (statSync(path).isDirectory()) return sourceFiles(path);
	if (!/\.tsx?$/.test(name) || skipped.has(name)) return [];
	return [path];
});

// Walks the file once tracking quotes, so a `//` inside a string survives and a `t('x.y')` inside
// a comment does not. Comment bodies are blanked rather than removed to keep offsets honest.
const withoutComments = (source: string): string => {
	let out = '';
	let index = 0;
	while (index < source.length) {
		const char = source[index]!;
		if (char === '/' && source[index + 1] === '/') {
			while (index < source.length && source[index] !== '\n') { out += ' '; index++; }
			continue;
		}
		if (char === '/' && source[index + 1] === '*') {
			while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) { out += ' '; index++; }
			out += '  ';
			index += 2;
			continue;
		}
		if (char === '\'' || char === '"' || char === '`') {
			const quote = char;
			out += char;
			index++;
			while (index < source.length && source[index] !== quote) {
				if (source[index] === '\\') { out += source[index]! + (source[index + 1] ?? ''); index += 2; continue; }
				out += source[index];
				index++;
			}
			out += source[index] ?? '';
			index++;
			continue;
		}
		out += char;
		index++;
	}
	return out;
};

// Everything between the opening paren and its match, so a ternary, a nested call or a template
// all come back whole.
const callArguments = (source: string, start: number): string => {
	let depth = 1;
	let index = start;
	let out = '';
	while (index < source.length && depth > 0) {
		const char = source[index]!;
		if (char === '\'' || char === '"' || char === '`') {
			const quote = char;
			out += char;
			index++;
			while (index < source.length && source[index] !== quote) {
				if (source[index] === '\\') { out += source[index]! + (source[index + 1] ?? ''); index += 2; continue; }
				out += source[index];
				index++;
			}
			out += source[index] ?? '';
			index++;
			continue;
		}
		if (char === '(' || char === '{' || char === '[') depth++;
		if (char === ')' || char === '}' || char === ']') {
			depth--;
			if (depth === 0) break;
		}
		out += char;
		index++;
	}
	return out;
};

// The substitutions are the second argument, and their values are never keys, so only the first
// one is read. Splitting at the first top-level comma.
const firstArgument = (args: string): string => {
	let depth = 0;
	for (let index = 0; index < args.length; index++) {
		const char = args[index]!;
		if (char === '(' || char === '{' || char === '[') depth++;
		else if (char === ')' || char === '}' || char === ']') depth--;
		else if (char === ',' && depth === 0) return args.slice(0, index);
	}
	return args;
};

const keyPattern = /(['"])([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)\1/g;
const callPattern = /(?<![A-Za-z0-9_$.])t\(/g;

interface CallSite {
	file: string;
	keys: string[];
	argument: string;
}

const callSites = (): CallSite[] => sourceFiles(srcDir).flatMap(path => {
	const source = withoutComments(readFileSync(path, 'utf8'));
	const file = path.slice(srcDir.length + 1);
	const sites: CallSite[] = [];
	for (const match of source.matchAll(callPattern)) {
		const argument = firstArgument(callArguments(source, match.index + match[0].length)).trim();
		sites.push({ file, argument, keys: [...argument.matchAll(keyPattern)].map(found => found[2]!) });
	}
	return sites;
});

const placeholders = (value: string): (string | undefined)[] => (
	[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(match => match[1])
);

describe('defaultStrings covers every label the shared components render', () => {
	const sites = callSites();
	const rendered = new Map<string, string[]>();
	for (const site of sites) {
		for (const key of site.keys) rendered.set(key, [...(rendered.get(key) ?? []), site.file]);
	}

	// A scan that quietly stopped matching would turn this whole file green and prove nothing.
	// The two inningHalfIcon keys are named on purpose: they are the ones the narrow scan missed,
	// and they are the only call site written as a ternary, so they are the canary for it.
	test('the scan finds the labels it is supposed to be checking', () => {
		expect(rendered.size).toBeGreaterThan(25);
		expect(rendered.has('gameCard.live')).toBe(true);
		expect(rendered.has('gameCard.openDetails')).toBe(true);
		expect(rendered.get('gameCard.topOfInning')).toEqual(['components/inningHalfIcon.tsx']);
		expect(rendered.get('gameCard.bottomOfInning')).toEqual(['components/inningHalfIcon.tsx']);
	});

	test('the scan reads past a comment rather than out of one', () => {
		expect(withoutComments('// t(\'fake.key\')\nt(\'real.key\')')).not.toContain('fake.key');
		expect(withoutComments('/* t(\'fake.key\') */ t(\'real.key\')')).not.toContain('fake.key');
		expect(withoutComments('const url = \'https://x.test//y\';')).toContain('https://x.test//y');
	});

	// A key built at runtime cannot be checked against this map, so the scan refuses to pretend it
	// checked it. If one ever lands, either enumerate its values here or give it a literal.
	test('every call site names its key outright, so none escapes the check', () => {
		const unenumerable = sites
			.filter(site => site.keys.length === 0)
			.map(site => `${site.file}: t(${site.argument})`);
		expect(unenumerable).toEqual([]);
	});

	test('every key a component asks for has an English fallback', () => {
		const missing = [...rendered.entries()]
			.filter(([key]) => defaultStrings[key] === undefined)
			.map(([key, files]) => `${key} (${[...new Set(files)].join(', ')})`);
		expect(missing).toEqual([]);
	});

	// The substitutions are positional by name, so a fallback that dropped a placeholder would
	// render "Add  to favorites" rather than fail.
	test('a fallback that takes a substitution still has somewhere to put it', () => {
		expect(placeholders(defaultStrings['gameCard.addToFavorites']!)).toEqual(['team']);
		expect(placeholders(defaultStrings['gameCard.removeFromFavorites']!)).toEqual(['team']);
		expect(placeholders(defaultStrings['gameCard.openDetails']!)).toEqual(['away', 'home']);
		expect(placeholders(defaultStrings['gameCard.teamRank']!)).toEqual(['rank']);
		expect(placeholders(defaultStrings['gameCard.timeoutsRemaining']!)).toEqual(['team', 'count']);
		expect(placeholders(defaultStrings['gameCard.downDistanceAt']!)).toEqual(['downDistance', 'fieldPosition']);
		expect(placeholders(defaultStrings['field.possession']!)).toEqual(['team']);
	});

	test('no fallback is blank, which would render as a missing label rather than a wrong one', () => {
		for (const [key, value] of Object.entries(defaultStrings)) {
			expect(value.trim()).not.toBe('');
			expect(key).toMatch(/^[a-z][a-zA-Z0-9]*\.[a-zA-Z0-9]+$/);
		}
	});
});

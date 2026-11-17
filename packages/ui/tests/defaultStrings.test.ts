import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defaultStrings } from '../src/components/defaultStrings';

const srcDir = join(__dirname, '..', 'src');
const skipped = new Set(['defaultStrings.ts', 'i18nContext.tsx']);

const sourceFiles = (dir: string): string[] => readdirSync(dir).flatMap(name => {
	const path = join(dir, name);
	if (statSync(path).isDirectory()) return sourceFiles(path);
	if (!/\.tsx?$/.test(name) || skipped.has(name)) return [];
	return [path];
});

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

	test('a fallback that takes a substitution still has somewhere to put it', () => {
		expect(placeholders(defaultStrings['gameCard.addToFavorites']!)).toEqual(['team']);
		expect(placeholders(defaultStrings['gameCard.removeFromFavorites']!)).toEqual(['team']);
		expect(placeholders(defaultStrings['gameCard.openDetails']!)).toEqual(['away', 'home']);
		expect(placeholders(defaultStrings['gameCard.teamRank']!)).toEqual(['rank']);
		expect(placeholders(defaultStrings['gameCard.timeoutsRemaining']!)).toEqual(['team', 'team']);
		expect(defaultStrings['gameCard.timeoutsRemaining']).toContain('$1');
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

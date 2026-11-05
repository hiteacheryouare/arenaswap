import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import {
	listContentFiles,
	markdownHeadings,
	sourceHash,
	splitContentPath,
	stripFrontmatter,
	translatedLocales,
} from '../src/lib/translationSource';

const contentRoot = join(__dirname, '../src/content');
const collections = ['docs', 'releases'] as const;

const fixedFields = ['section', 'order', 'version', 'date', 'image', 'draft'];

const frontmatter = (text: string) => text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';

const field = (text: string, name: string) =>
	frontmatter(text).match(new RegExp(`^${name}:\\s*(.*?)\\s*$`, 'm'))?.[1]?.replace(/^(['"])(.*)\1$/, '$2');

const all = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map(match => match[0]);

const withoutCode = (body: string) => body.replace(/^(`{3,}|~{3,})[\s\S]*?^\1\s*$/gm, '');

// What a translator carries across untouched: the code, the links, and whatever the page renders
// in place of a line of Markdown.
// A translation sits one folder deeper, so its relative imports climb one more level to reach the
// same file. They are compared by what they resolve to.
const resolvedImport = (filePath: string, line: string) =>
	line.replace(/(['"])(\.[^'"]+)\1/, (_, quote: string, specifier: string) =>
		`${quote}${relative(contentRoot, resolve(dirname(filePath), specifier))}${quote}`);

const untouchables = (filePath: string) => {
	const text = readFileSync(filePath, 'utf8');
	const body = stripFrontmatter(text);
	const prose = withoutCode(body);
	return {
		'code blocks': all(body, /^(`{3,}|~{3,})[\s\S]*?^\1\s*$/gm),
		'inline code': all(prose, /`[^`\n]+`/g).toSorted(),
		'link targets': all(prose, /\]\([^)\s]+\)/g).toSorted(),
		'imports': all(prose, /^import .+$/gm).map(line => resolvedImport(filePath, line)),
		'components': all(prose, /<[A-Z][\w.]*\b[^>]*>/g),
		'demo markers': all(prose, /<!--\s*demo:[^>]*-->/g),
	};
};

const shapeOf = (text: string) => ({
	headings: markdownHeadings(text).map(heading => heading.depth),
	faq: all(frontmatter(text), /^\s*- q:/gm).length,
	...Object.fromEntries(fixedFields.map(name => [name, field(text, name)])),
});

describe.each(collections)('%s translations', collection => {
	const root = join(contentRoot, collection);
	const files = listContentFiles(root);
	const originals = files.filter(path => splitContentPath(path).locale === 'en');
	const translations = files.filter(path => splitContentPath(path).locale !== 'en');

	const pairs = originals.flatMap(original => translatedLocales.map(locale => [original, locale] as const));

	it.each(pairs)('%s has a current %s translation', (original, locale) => {
		const translationPath = `${locale}/${original}`;
		const english = readFileSync(join(root, original), 'utf8');

		if (!existsSync(join(root, translationPath))) {
			throw new Error(`${collection}/${translationPath} is missing. Translate ${collection}/${original} and set sourceHash: '${sourceHash(english)}'`);
		}

		const translation = readFileSync(join(root, translationPath), 'utf8');
		const expectedHash = sourceHash(english);
		if (field(translation, 'sourceHash') !== expectedHash) {
			throw new Error(`${collection}/${translationPath} was translated from a different version of ${collection}/${original}. Re-translate what changed (git log -p ${collection}/${original}), then set sourceHash: '${expectedHash}'`);
		}

		expect(shapeOf(translation)).toEqual(shapeOf(english));
		expect(untouchables(join(root, translationPath))).toEqual(untouchables(join(root, original)));
	});

	it('has no translation without an English original', () => {
		const orphans = translations.filter(path => !originals.includes(splitContentPath(path).originalPath));
		expect(orphans).toEqual([]);
	});
});

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { defaultLocale, localeCodes, type LocaleCode } from '../i18n/locales.ts';

// File-system view of the translated docs and release notes, shared by the build (sitemap, heading
// ids) and tests/translations.test.ts. Paths are relative to a collection root and use `/`.

export const translatedLocales = localeCodes.filter(code => code !== defaultLocale);

export const listContentFiles = (root: string, directory = ''): string[] =>
	readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
		const path = posix.join(directory, entry.name);
		if (entry.isDirectory()) return listContentFiles(root, path);
		return /\.mdx?$/.test(entry.name) ? [path] : [];
	});

export const splitContentPath = (path: string): { locale: LocaleCode; originalPath: string } => {
	const [first, ...rest] = path.split('/');
	const locale = translatedLocales.find(code => code === first);
	return locale ? { locale, originalPath: rest.join('/') } : { locale: defaultLocale, originalPath: path };
};

export const withoutExtension = (path: string) => path.replace(/\.mdx?$/, '');

export const sourceHash = (text: string) =>
	createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);

export const stripFrontmatter = (text: string) => text.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '');

export interface MarkdownHeading {
	depth: number;
	text: string;
}

export const markdownHeadings = (text: string): MarkdownHeading[] => {
	let fence: string | undefined;
	const headings: MarkdownHeading[] = [];

	for (const line of stripFrontmatter(text).split('\n')) {
		const fenceMark = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
		if (fenceMark && (!fence || fenceMark.startsWith(fence))) {
			fence = fence ? undefined : fenceMark;
			continue;
		}
		const heading = !fence && line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
		if (heading) headings.push({ depth: heading[1]!.length, text: heading[2]! });
	}

	return headings;
};

const readOriginal = (root: string, originalPath: string) => readFileSync(join(root, originalPath), 'utf8');

// The locale URLs, without the base, whose words are this locale's rather than the English copy:
// each translated article or release note, and an index page once everything it lists is translated.
export const translatedPagePaths = (docsRoot: string, releasesRoot: string) => {
	const pages = new Set<string>();

	const collect = (root: string, pagePath: (originalPath: string) => string, indexPaths: (originalPath: string) => string[]) => {
		const files = listContentFiles(root);
		const originals = files.filter(path => splitContentPath(path).locale === defaultLocale)
			.filter(path => !/^draft:\s*true\s*$/m.test(readOriginal(root, path)));
		const translated = new Set(files.map(path => {
			const { locale, originalPath } = splitContentPath(path);
			return `${locale}/${withoutExtension(originalPath)}`;
		}));

		for (const locale of translatedLocales) {
			const missing = new Set<string>();
			for (const original of originals) {
				const key = withoutExtension(original);
				if (translated.has(`${locale}/${key}`)) pages.add(`${locale}/${pagePath(key)}`);
				else indexPaths(key).forEach(index => missing.add(index));
			}
			for (const index of new Set(originals.flatMap(original => indexPaths(withoutExtension(original))))) {
				if (!missing.has(index)) pages.add(`${locale}/${index}`);
			}
		}
	};

	collect(docsRoot, key => `docs/${key}/`, key => ['docs/', `docs/${key.split('/')[0]}/`]);
	collect(releasesRoot, key => `releases/${key}/`, () => ['releases/']);

	return pages;
};

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import GithubSlugger from 'github-slugger';
import type { HastPluginEntry } from 'satteri';
import { defaultLocale } from '../i18n/locales.ts';
import { markdownHeadings, splitContentPath } from './translationSource.ts';

// What a heading's rendered text content is, from its Markdown: no code ticks, emphasis or link
// targets. Astro slugs that text with github-slugger, so this reproduces the English page's ids.
const plainText = (markdown: string) => markdown
	.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
	.replace(/[`*_]/g, '');

export const headingIds = (text: string) => {
	const slugger = new GithubSlugger();
	return markdownHeadings(text).map(heading => slugger.slug(plainText(heading.text)));
};

const collectionRoot = /\/src\/content\/(?:docs|releases)\//;

// A translated heading keeps the English heading's id, so `#closeness` lands on the same section in
// every language. Headings pair up by position; tests/translations.test.ts holds the counts equal.
const translatedHeadingIds: HastPluginEntry = ({ fileURL }) => {
	const filePath = fileURL && fileURLToPath(fileURL).split('\\').join('/');
	const root = filePath?.match(collectionRoot);
	if (!filePath || !root) return null;

	const rootPath = filePath.slice(0, root.index! + root[0].length);
	const { locale, originalPath } = splitContentPath(filePath.slice(rootPath.length));
	if (locale === defaultLocale) return null;

	const ids = headingIds(readFileSync(rootPath + originalPath, 'utf8'));
	let position = 0;

	return {
		name: 'translated-heading-ids',
		element: {
			filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
			visit: (node, ctx) => {
				const id = ids[position++];
				if (id) ctx.setProperty(node, 'id', id);
			},
		},
	};
};

export default translatedHeadingIds;

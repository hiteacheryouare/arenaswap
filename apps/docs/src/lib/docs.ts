import { getCollection, type CollectionEntry } from 'astro:content';
import type { Translator } from '../i18n/ui';

export type DocsSection = 'extension' | 'powerscore';

// The two trees, and the words that introduce each of them. Read through one helper so the section
// index, the article pages and the side nav all describe a section the same way.
export const docsSectionCopy = (t: Translator, section: DocsSection) => ({
	title: t(`reading.sections.${section}.title`),
	heading: t(`reading.sections.${section}.heading`),
	description: t(`reading.sections.${section}.description`),
});

export const docsSectionOrder = ['extension', 'powerscore'] as const;

// The glob loader ids these `<section>/<slug>`, matching the directory the file sits in. The URL
// takes its section from frontmatter, so the last segment is all that is left to read.
export const docSlug = (entry: CollectionEntry<'docs'>) => entry.id.split('/').at(-1)!;

export const docPath = (entry: CollectionEntry<'docs'>) =>
	`docs/${entry.data.section}/${docSlug(entry)}/`;

export const getSectionDocs = async (section: DocsSection) =>
	(await getCollection('docs', ({ data }) => !data.draft && data.section === section))
		.toSorted((a, b) => a.data.order - b.data.order);

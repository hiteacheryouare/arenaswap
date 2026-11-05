import type { CollectionEntry } from 'astro:content';
import type { LocaleCode } from '../i18n/locales';
import type { Translator } from '../i18n/ui';
import { getLocalizedCollection } from './localizedContent';

export type DocsSection = 'extension' | 'powerscore';

// The two trees, and the words that introduce each of them. Read through one helper so the section
// index, the article pages and the side nav all describe a section the same way.
export const docsSectionCopy = (t: Translator, section: DocsSection) => ({
	title: t(`reading.sections.${section}.title`),
	heading: t(`reading.sections.${section}.heading`),
	description: t(`reading.sections.${section}.description`),
});

export const docsSectionOrder = ['extension', 'powerscore'] as const;

// Ids are `<section>/<slug>`, or `<locale>/<section>/<slug>` for a translation. The URL
// takes its section from frontmatter, so the last segment is all that is left to read.
export const docSlug = (entry: CollectionEntry<'docs'>) => entry.id.split('/').at(-1)!;

export const docPath = (entry: CollectionEntry<'docs'>) =>
	`docs/${entry.data.section}/${docSlug(entry)}/`;

export const getSectionDocs = async (section: DocsSection, locale: LocaleCode) =>
	(await getLocalizedCollection('docs', locale))
		.filter(({ original }) => original.data.section === section)
		.toSorted((a, b) => a.original.data.order - b.original.data.order);

import { getCollection, type CollectionEntry } from 'astro:content';

export type DocsSection = 'extension' | 'powerscore';

// The two trees, and the words that introduce each of them. Written here rather than in a page so
// the section index, the article pages and the side nav all describe a section the same way.
export const docsSections = {
	extension: {
		title: 'The extension',
		heading: 'Using ArenaSwap',
		description: 'Installing ArenaSwap, assigning tabs to games, tuning when it switches, and Standby Stream.',
	},
	powerscore: {
		title: 'PowerScore',
		heading: 'The PowerScore package',
		description: 'How a game gets scored. The five signals, the boosts, the penalties and the types.',
	},
} as const satisfies Record<DocsSection, { title: string; heading: string; description: string }>;

export const docsSectionOrder = ['extension', 'powerscore'] as const;

// The glob loader ids these `<section>/<slug>`, matching the directory the file sits in. The URL
// takes its section from frontmatter, so the last segment is all that is left to read.
export const docSlug = (entry: CollectionEntry<'docs'>) => entry.id.split('/').at(-1)!;

export const docPath = (entry: CollectionEntry<'docs'>) =>
	`docs/${entry.data.section}/${docSlug(entry)}/`;

export const getSectionDocs = async (section: DocsSection) =>
	(await getCollection('docs', ({ data }) => !data.draft && data.section === section))
		.toSorted((a, b) => a.data.order - b.data.order);

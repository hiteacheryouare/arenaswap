import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Release notes are written by hand as user-facing prose, one file per version. They are
// deliberately not generated from CHANGELOG.md: the changelog is an engineering record and reads
// like one.
const releases = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/releases' }),
	schema: z.object({
		// Drives the URL: /releases/<version>/
		version: z.string(),
		title: z.string(),
		// One or two sentences, used on the index and in the feed.
		summary: z.string(),
		date: z.coerce.date(),
		// Optional lead image for the release page and its social card.
		image: z.string().optional(),
		imageAlt: z.string().optional(),
		draft: z.boolean().optional().default(false),
	}),
});

// The schema and the URL tree are settled ahead of the content, so that writing documentation is
// writing Markdown rather than writing Markdown and then designing a docs site around it.
// `section` picks which of the two trees a page belongs to; `order` sorts it inside that tree.
const docs = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		section: z.enum(['extension', 'powerscore']),
		order: z.number().default(0),
		draft: z.boolean().optional().default(false),
	}),
});

export const collections = { releases, docs };

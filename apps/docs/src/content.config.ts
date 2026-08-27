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

// One file per article, one URL per article: /docs/<section>/<slug>/, where the slug is the
// filename and the section is the directory the file sits in. A single page stacking every article
// would put two URLs in front of every question a reader has, and search engines would have to
// pick which heading on which long page answers it.
const docs = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
	schema: z.object({
		title: z.string(),
		// Rendered as the meta description and as the article's summary on the section index, so it
		// is a sentence rather than a fragment.
		description: z.string(),
		section: z.enum(['extension', 'powerscore']),
		order: z.number().default(0),
		// The side nav is 13rem wide. A long title gets a short label there and keeps its length
		// in the heading and the <title>, where the length is worth something.
		navLabel: z.string().optional(),
		// Becomes a "Common questions" block and FAQPage structured data. Only worth filling in
		// where the questions are ones people ask; a restatement of the article is not one.
		faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
		draft: z.boolean().optional().default(false),
	}),
});

export const collections = { releases, docs };

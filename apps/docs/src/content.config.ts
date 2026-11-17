import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Ids are the path under the collection, unaltered. The default slugifies each segment, which
// lowercases `pt-BR/` and strips the dots out of `2.2.0`, and src/lib/localizedContent.ts reads
// the locale and the original's id back out of a translation's id.
const generateId = ({ entry }: { entry: string }) => entry.replace(/\.mdx?$/, '');

const sourceHash = z.string().regex(/^[0-9a-f]{12}$/).optional();

const releases = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/releases', generateId }),
	schema: z.object({
		version: z.string(),
		title: z.string(),
		summary: z.string(),
		date: z.coerce.date(),
		image: z.string().optional(),
		imageAlt: z.string().optional(),
		draft: z.boolean().optional().default(false),
		sourceHash,
	}),
});

const docs = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs', generateId }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		section: z.enum(['extension', 'powerscore']),
		order: z.number().default(0),
		navLabel: z.string().optional(),
		faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
		draft: z.boolean().optional().default(false),
		sourceHash,
	}),
});

export const collections = { releases, docs };

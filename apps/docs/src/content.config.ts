import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		author: z.string().default('Ryan Mullin'),
		tags: z.array(z.string()).optional().default([]),
		image: z.string().optional(),
		imageAlt: z.string().optional(),
		draft: z.boolean().optional().default(false),
	}),
});

export const collections = { blog };

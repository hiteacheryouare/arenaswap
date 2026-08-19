import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import pkg from '../../package.json'

const year = new Date().getFullYear();
const version = pkg.version;

export default defineConfig({
	integrations: [react(), mdx()],
	vite: {
		plugins: [tailwindcss()],
		rollupOptions: {
			output: {
				banner: `/*! ArenaSwap v${version} Copyright (c) ${year} ArenaSwap Systems, Ryan Mullin, and Contributors. All rights reserved. */`,
			},
		},
	},
	// GitHub Pages project site. Needed for canonical URLs and the release notes feed.
	site: 'https://hiteacheryouare.github.io',
	outDir: '../../docs',
	base: '/arenaswap/',
	build: {
		emptyOutDir: true,
	},
	// Retired URLs. `/blog/` and the one post it held were published, and `/credits/` shipped in 2.0,
	// so they redirect rather than 404. Static output makes these meta-refresh pages, which is all
	// GitHub Pages can serve.
	// Keys are routes, so `base` is applied to them the same way it is to a page in src/pages.
	// Destinations are written out literally, base included.
	redirects: {
		'/blog': '/arenaswap/releases/',
		'/blog/introducing-v2': '/arenaswap/releases/2.0.0/',
		'/credits': '/arenaswap/legal/credits/',
	},
});

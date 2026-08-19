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
});

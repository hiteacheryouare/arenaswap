import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import pkg from '../../package.json'

const year = new Date().getFullYear();
const version = pkg.version;

export default defineConfig({
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
		rollupOptions: {
			output: {
				banner: `/*! ArenaSwap v${version} Copyright (c) ${year} ArenaSwap Systems, Ryan Mullin, and Contributors. All rights reserved. */`,
			},
		},
	},
	outDir: '../../docs',
	base: '/arenaswap/',
	build: {
		emptyOutDir: true,
	},
});

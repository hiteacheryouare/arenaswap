import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import sassOptions from '@arenaswap/ui/src/sassOptions';

// The stage the films are shot on. It is a page like any other, served beside the built extension
// by scripts/film/render/server.ts, so it is built once and never run as a dev server.
export default defineConfig({
	root: resolve(import.meta.dirname, 'stage'),
	base: '/film/',
	publicDir: false,
	plugins: [react()],
	resolve: {
		alias: { powerscore: resolve(import.meta.dirname, '../../packages/powerscore/src/index.ts') },
	},
	css: { preprocessorOptions: { scss: sassOptions } },
	build: {
		outDir: resolve(import.meta.dirname, '.build/stage'),
		emptyOutDir: true,
		target: 'es2023',
		reportCompressedSize: false,
		chunkSizeWarningLimit: 4000,
	},
	logLevel: 'warn',
});

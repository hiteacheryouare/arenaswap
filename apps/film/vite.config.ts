import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import bootstrapTokenPrefix from '@arenaswap/ui/src/bootstrapTokenPrefix';
import alias from './sourceAliases';

export default defineConfig({
	root: resolve(import.meta.dirname, 'stage'),
	base: '/film/',
	publicDir: false,
	plugins: [react()],
	resolve: { alias },
	css: { postcss: { plugins: [bootstrapTokenPrefix] } },
	build: {
		outDir: resolve(import.meta.dirname, '.build/stage'),
		emptyOutDir: true,
		target: 'es2023',
		reportCompressedSize: false,
		chunkSizeWarningLimit: 4000,
	},
	logLevel: 'warn',
});

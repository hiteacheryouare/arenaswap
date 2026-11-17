import { defineConfig } from 'rolldown';

export default defineConfig({
	input: './src/index.ts',
	platform: 'neutral',
	output: {
		dir: './dist',
		format: 'esm',
		sourcemap: true,
		minify: 'dce-only',
		// Wipes dist, so this has to run before `tsc --emitDeclarationOnly` or the declarations go
		// with it.
		cleanDir: true,
	},
});

import { defineConfig } from 'rolldown';

export default defineConfig({
	input: './src/index.ts',
	// Published to npm and consumed by the extension, the docs site, and Node scripts. `neutral`
	// resolves purely through package.json exports instead of assuming browser or node conditions.
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

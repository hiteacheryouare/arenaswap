import { defineConfig } from 'rolldown';

export default defineConfig({
	// One entry per subpath in package.json exports. Code shared between them lands in a common
	// chunk rather than being duplicated, which keeps logger.ts's verbose flag a single instance
	// for callers that import both '@arenaswap/core' and '@arenaswap/core/constants'.
	input: {
		index: './src/index.ts',
		constants: './src/constants.ts',
		types: './src/types.ts',
	},
	external: ['powerscore', 'zod'],
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

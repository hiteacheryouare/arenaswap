import { resolve } from 'node:path';
import { defineConfig } from 'rolldown';

// Both names resolve to their built dist by default; the tools bundle source instead. A replay always
// runs the engine and core in the working tree, even when dist is stale, and core's own `powerscore`
// import lands on the same source copy as the tools' import.
const shared = {
	platform: 'node' as const,
	resolve: {
		alias: {
			powerscore: resolve(import.meta.dirname, '../powerscore/src/index.ts'),
			'@arenaswap/core': resolve(import.meta.dirname, '../core/src/index.ts'),
		},
	},
	logLevel: 'silent' as const,
};

const cli = (name: string) => ({ ...shared, input: `src/${name}.ts`, output: { file: `dist/${name}.cjs`, format: 'cjs' as const } });

export default defineConfig([
	cli('recordSlate'),
	cli('replaySlate'),
	cli('simulateDistribution'),
	cli('validateLive'),
]);

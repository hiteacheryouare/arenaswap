import { resolve } from 'node:path';
import { defineConfig } from 'rolldown';

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
	cli('evaluateBreaks'),
]);

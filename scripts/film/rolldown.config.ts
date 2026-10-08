import { resolve } from 'node:path';
import { defineConfig } from 'rolldown';

// Same alias as the PowerScore tooling: the films score games with the engine in the working tree,
// not whatever was last built into packages/powerscore/dist.
const alias = { powerscore: resolve(import.meta.dirname, '../../packages/powerscore/src/index.ts') };
const node = { platform: 'node' as const, resolve: { alias }, logLevel: 'silent' as const };

export default defineConfig([
	{ ...node, input: 'scripts/film/extract/extractSlate.ts', output: { file: 'scripts/film/extract/extractSlate.cjs', format: 'cjs' } },
	{ ...node, input: 'scripts/film/extract/fetchPregame.ts', output: { file: 'scripts/film/extract/fetchPregame.cjs', format: 'cjs' } },
	{ ...node, input: 'scripts/film/render/render.ts', output: { file: 'scripts/film/render/render.cjs', format: 'cjs' } },
	{ ...node, input: 'scripts/film/audio/cli.ts', output: { file: 'scripts/film/audio/cli.cjs', format: 'cjs' } },
	// Runs inside each popup before the app does, so it is one classic script with nothing to import.
	{
		input: 'scripts/film/stage/popup/popupShim.ts',
		platform: 'browser',
		resolve: { alias },
		logLevel: 'silent',
		output: { file: 'scripts/film/.build/stage/popupShim.js', format: 'iife' },
	},
]);

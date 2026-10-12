import { defineConfig } from 'rolldown';
import alias from './sourceAliases';

const node = { platform: 'node' as const, resolve: { alias }, logLevel: 'silent' as const };

export default defineConfig([
	{ ...node, input: 'extract/extractSlate.ts', output: { file: 'extract/extractSlate.cjs', format: 'cjs' } },
	{ ...node, input: 'extract/fetchPregame.ts', output: { file: 'extract/fetchPregame.cjs', format: 'cjs' } },
	{ ...node, input: 'render/render.ts', output: { file: 'render/render.cjs', format: 'cjs' } },
	{ ...node, input: 'audio/cli.ts', output: { file: 'audio/cli.cjs', format: 'cjs' } },
	// Runs inside each popup before the app does, so it is one classic script with nothing to import.
	{
		input: 'stage/popup/popupShim.ts',
		platform: 'browser',
		resolve: { alias },
		logLevel: 'silent',
		output: { file: '.build/stage/popupShim.js', format: 'iife' },
	},
]);

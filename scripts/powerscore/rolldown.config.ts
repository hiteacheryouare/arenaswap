import { resolve } from 'node:path';
import { defineConfig } from 'rolldown';

// Core imports `powerscore` by package name, which resolves to the built dist; the scripts import the
// engine's source. Aliasing the name to source too means a replay always runs one engine, the one in
// the working tree, even when dist is stale.
const shared = {
	platform: 'node' as const,
	resolve: { alias: { powerscore: resolve(import.meta.dirname, '../../packages/powerscore/src/index.ts') } },
	logLevel: 'silent' as const,
};

export default defineConfig([
	{ ...shared, input: 'scripts/powerscore/recordSlate.ts', output: { file: 'scripts/powerscore/recordSlate.cjs', format: 'cjs' } },
	{ ...shared, input: 'scripts/powerscore/replaySlate.ts', output: { file: 'scripts/powerscore/replaySlate.cjs', format: 'cjs' } },
]);

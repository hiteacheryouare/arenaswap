import { resolve } from 'node:path';

const packages = resolve(import.meta.dirname, '../../packages');

// The films score games with the engine and core in the working tree, not whatever was last built
// into their dist folders, and every package the films pull in shares that one copy of core.
// Subpaths come first: an alias also matches anything under its own name.
export default {
	'@arenaswap/core/constants': resolve(packages, 'core/src/constants.ts'),
	'@arenaswap/core/types': resolve(packages, 'core/src/types.ts'),
	'@arenaswap/core': resolve(packages, 'core/src/index.ts'),
	powerscore: resolve(packages, 'powerscore/src/index.ts'),
};

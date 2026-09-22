const commonProjectConfig = {
	testEnvironment: 'node',
	moduleNameMapper: {
		'^@arenaswap/core$': '<rootDir>/../core/src/index.ts',
		'^@arenaswap/core/(.*)$': '<rootDir>/../core/src/$1.ts',
		'^powerscore$': '<rootDir>/../powerscore/src/index.ts',
	},
	transform: {
		'^.+\\.tsx?$': [
			'@swc/jest',
			{
				jsc: {
					parser: { syntax: 'typescript', tsx: true },
					transform: { react: { runtime: 'automatic' } },
					target: 'es2020',
				},
				module: { type: 'commonjs' },
			},
		],
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
};

module.exports = {
	// What this number means. The `unit` project runs in Node, where there is no `document`, so it
	// reaches the pure-logic modules and the plain helpers that a couple of components export
	// alongside themselves — never a component body. Rendering is verified by the Cypress component
	// runner over in `apps/extension`, so aiming this at the whole of `src` would report the design
	// system as largely unverified when it is only unverified *here*. Scoped instead to what Jest
	// can actually execute: every `.ts` module, plus the two `.tsx` files the node tests import
	// helpers straight out of. The component bodies inside those two still count against them,
	// which is the honest reading — they are Cypress ground, not Jest ground.
	collectCoverageFrom: [
		'src/**/*.ts',
		'src/components/crest.tsx',
		'src/components/gameCardShared.tsx',
		'!src/**/*.d.ts',
		// Interfaces only, so there is no statement in it to execute.
		'!src/components/gameCardTypes.ts',
	],
	coverageReporters: ['json-summary', 'lcov', 'text'],
	projects: [
		{
			...commonProjectConfig,
			displayName: 'unit',
			// Node env, so there is no document. A component test needs its own jsdom project
			// rather than a tsx glob on this one.
			testMatch: ['<rootDir>/tests/**/*.test.ts'],
		},
	],
};

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
	collectCoverageFrom: [
		'src/**/*.ts',
		'src/components/crest.tsx',
		'src/components/gameCardShared.tsx',
		'!src/**/*.d.ts',
		'!src/components/gameCardTypes.ts',
	],
	coverageReporters: ['json-summary', 'lcov', 'text'],
	projects: [
		{
			...commonProjectConfig,
			displayName: 'unit',
			testMatch: ['<rootDir>/tests/**/*.test.ts'],
		},
	],
};

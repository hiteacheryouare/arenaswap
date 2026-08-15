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
	projects: [
		{
			...commonProjectConfig,
			displayName: 'unit',
			testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
		},
	],
};

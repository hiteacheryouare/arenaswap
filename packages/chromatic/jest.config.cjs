module.exports = {
	collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
	coverageReporters: ['json-summary', 'lcov', 'text'],
	projects: [
		{
			displayName: 'unit',
			testEnvironment: 'node',
			testMatch: ['<rootDir>/tests/**/*.test.ts'],
			moduleNameMapper: {
				'^@arenaswap/core$': '<rootDir>/../core/src/index.ts',
				'^@arenaswap/core/(.*)$': '<rootDir>/../core/src/$1.ts',
				'^powerscore$': '<rootDir>/../powerscore/src/index.ts',
			},
			transform: {
				'^.+\\.ts$': [
					'@swc/jest',
					{
						jsc: {
							parser: { syntax: 'typescript' },
							target: 'es2020',
						},
						module: { type: 'commonjs' },
					},
				],
			},
			moduleFileExtensions: ['ts', 'js', 'json'],
		},
	],
};

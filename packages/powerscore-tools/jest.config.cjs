process.env.TZ = 'UTC';

module.exports = {
	collectCoverageFrom: ['src/**/*.ts'],
	coverageReporters: ['json-summary', 'lcov', 'text'],
	projects: [
		{
			displayName: 'unit',
			testEnvironment: 'node',
			testMatch: ['<rootDir>/tests/**/*.test.ts'],
			moduleNameMapper: {
				'^@arenaswap/core$': '<rootDir>/../core/src/index.ts',
				'^@arenaswap/core/(.*)$': '<rootDir>/../core/src/$1.ts',
				'^@arenaswap/sideline$': '<rootDir>/../sideline/src/index.ts',
				'^powerscore$': '<rootDir>/../powerscore/src/index.ts',
			},
			transform: {
				'^.+\\.ts$': [
					'@swc/jest',
					{
						jsc: {
							parser: { syntax: 'typescript' },
							target: 'es2022',
						},
						module: { type: 'commonjs' },
					},
				],
			},
			moduleFileExtensions: ['ts', 'js', 'json'],
		},
	],
};

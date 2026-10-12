// Pinned here rather than in the setup file: Jest hands each test file a copy of `process`, so an
// assignment made from inside the sandbox never reaches the setter Node uses to invalidate V8's
// cached zone. The config is read in the real process, before any worker is forked.
process.env.TZ = 'UTC';

const commonProjectConfig = {
	testEnvironment: 'node',
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
	setupFilesAfterEnv: ['<rootDir>/jestSetup.ts'],
	moduleFileExtensions: ['ts', 'js', 'json'],
};

module.exports = {
	// The demo payloads are data, and `index.ts` only re-exports.
	collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/mock*.ts'],
	coverageReporters: ['json-summary', 'lcov', 'text'],
	projects: [
		{
			...commonProjectConfig,
			displayName: 'unit',
			testMatch: ['<rootDir>/tests/**/*.test.ts'],
			testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
		},
		{
			...commonProjectConfig,
			displayName: 'e2e',
			testMatch: ['<rootDir>/tests/e2e/**/*.e2e.test.ts'],
		},
	],
};

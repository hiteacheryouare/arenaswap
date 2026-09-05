// Pinned here rather than in the setup file: Jest hands each test file a copy of `process`, so an
// assignment made from inside the sandbox never reaches the setter Node uses to invalidate V8's
// cached zone. The config is read in the real process, before any worker is forked.
process.env.TZ = 'UTC';

const commonProjectConfig = {
	testEnvironment: 'node',
	moduleNameMapper: {
		'^@arenaswap/core$': '<rootDir>/../../packages/core/src/index.ts',
		'^@arenaswap/core/(.*)$': '<rootDir>/../../packages/core/src/$1.ts',
		'^powerscore$': '<rootDir>/../../packages/powerscore/src/index.ts',
		'^wxt/browser$': '<rootDir>/tests/stubs/wxtBrowser.ts',
		'^#i18n$': '<rootDir>/tests/stubs/i18n.ts',
	},
	transform: {
		'^.+\\.[jt]sx?$': [
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
	setupFilesAfterEnv: ['<rootDir>/jestSetup.ts'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};

module.exports = {
	projects: [
		{
			...commonProjectConfig,
			displayName: 'unit',
			testMatch: ['<rootDir>/tests/**/*.test.ts'],
		},
	],
};

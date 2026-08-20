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

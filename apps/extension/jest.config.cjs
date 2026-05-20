const commonProjectConfig = {
	testEnvironment: 'node',
	moduleNameMapper: {
		'^@arenaswap/core$': '<rootDir>/../../packages/core/src/index.ts',
		'^@arenaswap/core/(.*)$': '<rootDir>/../../packages/core/src/$1.ts',
		'^powerscore$': '<rootDir>/../../packages/powerscore/src/index.ts',
		'^wxt/browser$': '<rootDir>/tests/stubs/wxtBrowser.ts',
	},
	transform: {
		'^.+\\.[jt]sx?$': [
			'ts-jest',
			{
				tsconfig: '<rootDir>/tsconfig.jest.json',
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
		{
			...commonProjectConfig,
			displayName: 'component',
			testEnvironment: 'jest-environment-jsdom',
			testMatch: ['<rootDir>/tests/**/*.test.tsx'],
			setupFilesAfterEnv: [
				'<rootDir>/jestSetup.ts',
				'@testing-library/jest-dom',
			],
		},
	],
};

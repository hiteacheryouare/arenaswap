module.exports = {
	displayName: 'unit',
	testEnvironment: 'node',
	testMatch: ['<rootDir>/tests/**/*.test.ts'],
	transform: {
		'^.+\\.ts$': [
			'@swc/jest',
			{
				jsc: {
					parser: { syntax: 'typescript' },
					target: 'es2022',
					// src/i18n/locales.ts reads Vite's base URL, which only exists inside Astro.
					transform: { optimizer: { globals: { vars: { 'import.meta.env.BASE_URL': "'/arenaswap/'" } } } },
				},
				module: { type: 'commonjs' },
			},
		],
	},
	moduleFileExtensions: ['ts', 'js', 'json'],
};

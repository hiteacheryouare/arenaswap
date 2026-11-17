const target = process.env.ARENASWAP_COVERAGE_TARGET ?? 'cypress';

module.exports = {
	all: false,
	include: ['entrypoints/**/*.{ts,tsx,js,jsx}', 'utils/**/*.{ts,tsx}'],
	exclude: [
		'**/*.d.ts',
		'**/node_modules/**',
		'cypress/**',
		'tests/**',
		'.wxt/**',
	],
	reporter: ['json-summary', 'lcov', 'text-summary'],
	'report-dir': `coverage/${target}`,
	'temp-dir': `coverage/.tmp/${target}`,
};

// Read by @cypress/code-coverage (report + temp directories) and by vite-plugin-istanbul
// (include/exclude). The component and e2e runners share this working directory, so the target
// each one writes into comes from an environment variable the npm script sets — without it the
// second runner would overwrite the first one's report.
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

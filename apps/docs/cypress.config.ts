import { defineConfig } from 'cypress';
import { existsSync } from 'node:fs';
import path from 'path';
import { crawlSite } from './cypress/siteCrawl';
import { startStaticServer } from './cypress/staticServer';
import { localeCodes } from './src/i18n/locales';

// The real `astro build` output, served at the base path it was built for, so a spec measures the
// pages GitHub Pages will actually serve rather than a dev-server rendering of them.
//
// ARENASWAP_SITE_DIR points the server somewhere else, which is how a coverage run serves an
// instrumented build from a scratch directory rather than overwriting the tracked docs/ output
// that GitHub Pages publishes. Unset, the path is the one it has always been.
const siteDir = process.env.ARENASWAP_SITE_DIR
	? path.resolve(process.env.ARENASWAP_SITE_DIR)
	: path.resolve(__dirname, '../../docs');
const basePath = '/arenaswap/';
const e2ePort = 5198;

// The support file registers @cypress/code-coverage, which no-ops on this flag. Coverage is only
// meaningful against a build made with ARENASWAP_SITE_COVERAGE=1, so it stays off by default and
// a plain `npm run test:e2e` neither looks for __coverage__ nor writes a report.
const collectCoverage = process.env.ARENASWAP_SITE_COVERAGE === '1';

export default defineConfig({
	expose: { coverage: collectCoverage },
	// Cypress 16 deprecates its bundled Electron and will drop it in a later major. The site is
	// a static build, so any installed browser would serve — Chrome matches what the extension's
	// suite runs on, which keeps one browser to install rather than two.
	defaultBrowser: 'chrome',
	e2e: {
		baseUrl: `http://127.0.0.1:${e2ePort}${basePath}`,
		specPattern: 'cypress/e2e/**/*.cy.ts',
		supportFile: 'cypress/support/e2e.ts',
		screenshotOnRunFailure: false,
		video: false,
		// 1280 is where the desktop navigation is at its roomiest; the specs that care about the
		// tight end set 992 themselves, which is the breakpoint the links appear at.
		viewportWidth: 1280,
		viewportHeight: 900,
		async setupNodeEvents(on, config) {
			if (!existsSync(path.join(siteDir, 'index.html'))) {
				throw new Error(`No built site at ${siteDir}. Run \`npm run test:e2e\` from the repo root, which builds first, or \`npm run build\` here.`);
			}
			const server = await startStaticServer(siteDir, basePath, e2ePort);

			// Walking the finished output is how siteIntegrity.cy.ts checks all 361 pages at once. It
			// reads the same directory this server is about to serve, so the two cannot disagree.
			on('task', { crawlSite: () => crawlSite(siteDir, basePath, localeCodes) });
			on('after:run', () => new Promise<void>(resolve => { server.close(() => resolve()); }));
			if (!collectCoverage) return config;

			const registerCodeCoverage = (await import('@cypress/code-coverage/task')).default;
			return registerCodeCoverage(on, config);
		},
	},
});

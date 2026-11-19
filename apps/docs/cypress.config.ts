import { defineConfig } from 'cypress';
import { existsSync } from 'node:fs';
import path from 'path';
import { crawlSite } from './cypress/siteCrawl';
import { startStaticServer } from './cypress/staticServer';
import { localeCodes } from './src/i18n/locales';

const siteDir = process.env.ARENASWAP_SITE_DIR
	? path.resolve(process.env.ARENASWAP_SITE_DIR)
	: path.resolve(__dirname, 'dist');
const basePath = '/arenaswap/';
const e2ePort = 5198;

const collectCoverage = process.env.ARENASWAP_SITE_COVERAGE === '1';

export default defineConfig({
	expose: { coverage: collectCoverage },
	defaultBrowser: 'chrome',
	e2e: {
		baseUrl: `http://127.0.0.1:${e2ePort}${basePath}`,
		specPattern: 'cypress/e2e/**/*.cy.ts',
		supportFile: 'cypress/support/e2e.ts',
		screenshotOnRunFailure: false,
		video: false,
		viewportWidth: 1280,
		viewportHeight: 900,
		async setupNodeEvents(on, config) {
			if (!existsSync(path.join(siteDir, 'index.html'))) {
				throw new Error(`No built site at ${siteDir}. Run \`npm run test:e2e\` from the repo root, which builds first, or \`npm run build\` here.`);
			}
			const server = await startStaticServer(siteDir, basePath, e2ePort);

			on('task', { crawlSite: () => crawlSite(siteDir, basePath, localeCodes) });
			on('after:run', () => new Promise<void>(resolve => { server.close(() => resolve()); }));
			if (!collectCoverage) return config;

			const registerCodeCoverage = (await import('@cypress/code-coverage/task')).default;
			return registerCodeCoverage(on, config);
		},
	},
});

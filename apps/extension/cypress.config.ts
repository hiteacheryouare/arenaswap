import { defineConfig } from 'cypress';
import codeCoverageTask from '@cypress/code-coverage/task';
import { existsSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'path';
import { componentAliases, componentStubs } from './cypress/componentResolve';
import { startStaticServer } from './cypress/staticServer';
import bootstrapTokenPrefix from '@arenaswap/ui/src/bootstrapTokenPrefix';

const root = (rel: string) => path.resolve(__dirname, rel);

const popupBuildDir = root('./.output/e2e/chrome-mv3');

const specGroup = process.env.ARENASWAP_SPEC_GROUP;
const specFolder = (testingType: 'component' | 'e2e') => (specGroup ? `cypress/${testingType}/${specGroup}` : `cypress/${testingType}`);
const screenshotsFolder = (testingType: 'component' | 'e2e') => (specGroup ? `cypress/screenshots/${testingType}/${specGroup}` : 'cypress/screenshots');

const coverageTarget = process.env.ARENASWAP_COVERAGE_TARGET;

// vite-plugin-istanbul ships ESM only, and this config is loaded as CommonJS, so it cannot be
// a static import.
const istanbulPlugins = async () => {
	if (coverageTarget !== 'component') return [];
	const { default: istanbul } = await import('vite-plugin-istanbul');
	return [istanbul({ requireEnv: false })];
};

export default defineConfig({
	expose: { coverage: coverageTarget !== undefined },
	defaultBrowser: 'chrome',
	component: {
		devServer: {
			framework: 'react',
			bundler: 'vite',
			viteConfig: async () => ({
				...(specGroup ? { cacheDir: root(`node_modules/.vite/cypress-component-${specGroup}`) } : {}),
				css: {
					postcss: {
						plugins: [bootstrapTokenPrefix],
					},
				},
				resolve: {
					alias: componentAliases,
				},
				plugins: [
					{
						name: 'cypress-component-stubs',
						enforce: 'pre' as const,
						resolveId(source: string) {
							return componentStubs[source] ?? null;
						},
					},
					...(await istanbulPlugins()),
				],
			}),
		},
		specPattern: `${specFolder('component')}/**/*.cy.{ts,tsx}`,
		screenshotsFolder: screenshotsFolder('component'),
		supportFile: 'cypress/support/component.ts',
		experimentalSingleTabRunMode: true,
		setupNodeEvents(on, config) {
			codeCoverageTask(on, config);
			return config;
		},
	},
	e2e: {
		specPattern: `${specFolder('e2e')}/**/*.cy.ts`,
		screenshotsFolder: screenshotsFolder('e2e'),
		supportFile: 'cypress/support/e2e.ts',
		viewportWidth: 320,
		viewportHeight: 560,
		async setupNodeEvents(on, config) {
			if (!existsSync(path.join(popupBuildDir, 'popup.html'))) {
				throw new Error(`No built popup at ${popupBuildDir}. Run \`npm run test:e2e\` from the repo root, which builds first, or \`npm run build:e2e\` here.`);
			}
			const server = await startStaticServer(popupBuildDir, 0);
			on('after:run', () => new Promise<void>(resolve => { server.close(() => resolve()); }));
			codeCoverageTask(on, config);
			return { ...config, baseUrl: `http://localhost:${(server.address() as AddressInfo).port}` };
		},
	},
});

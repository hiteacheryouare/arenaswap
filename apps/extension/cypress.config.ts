import { defineConfig } from 'cypress';
import codeCoverageTask from '@cypress/code-coverage/task';
import { existsSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'path';
import { componentAliases, componentStubs } from './cypress/componentResolve';
import { startStaticServer } from './cypress/staticServer';
import bootstrapTokenPrefix from '@arenaswap/ui/src/bootstrapTokenPrefix';

const root = (rel: string) => path.resolve(__dirname, rel);

// E2E drives the real `wxt build` output rather than a Cypress-bundled copy of the source, so the
// bundle under test is byte-for-byte the one that ships. It reads its own build rather than the
// shared `.output/chrome-mv3`, which `wxt zip` deletes and rewrites while this server is serving it.
const popupBuildDir = root('./.output/e2e/chrome-mv3');

// Each `test:component:<group>` and `test:e2e:<group>` script names a folder under cypress/<type>/,
// and turbo caches each one on its own inputs. Unset, a run takes every spec. Groups run in
// parallel, so each also gets its own Vite deps cache and screenshots folder: two dev servers
// optimizing into one cache is what makes lazy imports 404 mid-run.
const specGroup = process.env.ARENASWAP_SPEC_GROUP;
const specFolder = (testingType: 'component' | 'e2e') => (specGroup ? `cypress/${testingType}/${specGroup}` : `cypress/${testingType}`);
const screenshotsFolder = (testingType: 'component' | 'e2e') => (specGroup ? `cypress/screenshots/${testingType}/${specGroup}` : 'cypress/screenshots');

// Both Cypress runners share this working directory, so which one is collecting decides where
// nyc writes (see nyc.config.cjs). Instrumenting the component dev server costs build time on
// every spec, so it only happens when a coverage run asked for it.
const coverageTarget = process.env.ARENASWAP_COVERAGE_TARGET;

// vite-plugin-istanbul ships ESM only, and this config is loaded as CommonJS, so it cannot be
// a static import.
const istanbulPlugins = async () => {
	if (coverageTarget !== 'component') return [];
	const { default: istanbul } = await import('vite-plugin-istanbul');
	return [istanbul({ requireEnv: false })];
};

export default defineConfig({
	// Off unless a coverage run set the target, so a normal `cypress run` neither pays for
	// instrumentation nor logs the plugin's missing-coverage warning after every spec.
	expose: { coverage: coverageTarget !== undefined },
	// Cypress 16 deprecates its bundled Electron and will drop it in a later major. Chrome is
	// the browser the extension ships against, so both runners take it rather than a flag at each
	// call site — `defaultBrowser` covers `cypress open` too, which a `--browser` flag would not.
	defaultBrowser: 'chrome',
	component: {
		devServer: {
			framework: 'react',
			bundler: 'vite',
			viteConfig: async () => ({
				...(specGroup ? { cacheDir: root(`node_modules/.vite/cypress-component-${specGroup}`) } : {}),
				// The support file imports both .scss entries, so the component runner needs the same
				// token prefix the real build applies.
				css: {
					postcss: {
						plugins: [bootstrapTokenPrefix],
					},
				},
				resolve: {
					alias: componentAliases,
				},
				// The stub resolver stays first so a stubbed specifier never reaches the real
				// module; istanbul follows it and therefore instruments only what did resolve to
				// real source. nyc.config.cjs excludes cypress/ so the stubs are never counted.
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
		setupNodeEvents(on, config) {
			codeCoverageTask(on, config);
			return config;
		},
	},
	e2e: {
		specPattern: `${specFolder('e2e')}/**/*.cy.ts`,
		screenshotsFolder: screenshotsFolder('e2e'),
		supportFile: 'cypress/support/e2e.ts',
		// The popup is 320x560 and never renders at anything else.
		viewportWidth: 320,
		viewportHeight: 560,
		async setupNodeEvents(on, config) {
			if (!existsSync(path.join(popupBuildDir, 'popup.html'))) {
				throw new Error(`No built popup at ${popupBuildDir}. Run \`npm run test:e2e\` from the repo root, which builds first, or \`npm run build:e2e\` here.`);
			}
			// Port 0 takes any free port, so e2e groups, worktrees and other checkouts can all serve at once.
			const server = await startStaticServer(popupBuildDir, 0);
			on('after:run', () => new Promise<void>(resolve => { server.close(() => resolve()); }));
			codeCoverageTask(on, config);
			return { ...config, baseUrl: `http://localhost:${(server.address() as AddressInfo).port}` };
		},
	},
});

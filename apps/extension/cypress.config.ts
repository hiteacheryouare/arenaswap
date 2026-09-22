import { defineConfig } from 'cypress';
import codeCoverageTask from '@cypress/code-coverage/task';
import { existsSync } from 'node:fs';
import path from 'path';
import { startStaticServer } from './cypress/staticServer';
import sassOptions from '@arenaswap/ui/src/sassOptions';

const root = (rel: string) => path.resolve(__dirname, rel);

// E2E drives the real `wxt build` output rather than a Cypress-bundled copy of the source, so the
// bundle under test is byte-for-byte the one that ships. It reads its own build rather than the
// shared `.output/chrome-mv3`, which `wxt zip` deletes and rewrites while this server is serving it.
const popupBuildDir = root('./.output/e2e/chrome-mv3');
const e2ePort = 5199;

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

const componentStubs: Record<string, string> = {
	'./flipScore': root('./cypress/stubs/flipScore.tsx'),
	// tabAssignSelect is deliberately absent: it touches no browser API, so the real control
	// mounts here. Stubbing it to null had the card and pre-game specs measuring a layout with
	// no tab picker in it, which is not a layout the extension ever renders.
	'./gameCard': root('./cypress/stubs/gameCard.tsx'),
	'./gameDetailChart': root('./cypress/stubs/gameDetailChart.tsx'),
	'./popupFooter': root('./cypress/stubs/popupFooter.tsx'),
	'./proTip': root('./cypress/stubs/proTip.tsx'),
	'./emptyGameState': root('./cypress/stubs/emptyGameState.tsx'),
	'./reviewPromptBanner': root('./cypress/stubs/reviewPromptBanner.tsx'),
	'./ludicrousSpeedOverlay': root('./cypress/stubs/ludicrousSpeedOverlay.tsx'),
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
				// The support file imports both .scss entries, so the component runner compiles
				// Bootstrap the same way the real build does and needs the same silencing.
				css: {
					preprocessorOptions: {
						scss: sassOptions,
					},
				},
				resolve: {
					alias: [
						// List subpaths before the root entry to prevent prefix-match collision
						{ find: '@arenaswap/core/constants', replacement: root('../../packages/core/src/constants.ts') },
						{ find: '@arenaswap/core/types', replacement: root('../../packages/core/src/types.ts') },
						{ find: /^@arenaswap\/core$/, replacement: root('../../packages/core/src/index.ts') },
						{ find: /^powerscore$/, replacement: root('../../packages/powerscore/src/index.ts') },
						{ find: /^wxt\/browser$/, replacement: root('./tests/stubs/wxtBrowser.ts') },
						{ find: /^#i18n$/, replacement: root('./cypress/stubs/i18n.ts') },
					],
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
		specPattern: 'cypress/component/**/*.cy.{ts,tsx}',
		supportFile: 'cypress/support/component.ts',
		setupNodeEvents(on, config) {
			codeCoverageTask(on, config);
			return config;
		},
	},
	e2e: {
		baseUrl: `http://localhost:${e2ePort}`,
		specPattern: 'cypress/e2e/**/*.cy.ts',
		supportFile: 'cypress/support/e2e.ts',
		// The popup is 320x560 and never renders at anything else.
		viewportWidth: 320,
		viewportHeight: 560,
		async setupNodeEvents(on, config) {
			if (!existsSync(path.join(popupBuildDir, 'popup.html'))) {
				throw new Error(`No built popup at ${popupBuildDir}. Run \`npm run test:e2e\` from the repo root, which builds first, or \`npm run build:e2e\` here.`);
			}
			const server = await startStaticServer(popupBuildDir, e2ePort);
			on('after:run', () => new Promise<void>(resolve => { server.close(() => resolve()); }));
			codeCoverageTask(on, config);
			return config;
		},
	},
});

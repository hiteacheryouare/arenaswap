import { defineConfig } from 'cypress';
import { existsSync } from 'node:fs';
import path from 'path';
import { startStaticServer } from './cypress/staticServer';

const root = (rel: string) => path.resolve(__dirname, rel);

// E2E drives the real `wxt build` output rather than a Cypress-bundled copy of the source, so the
// bundle under test is byte-for-byte the one that ships.
const popupBuildDir = root('./.output/chrome-mv3');
const e2ePort = 5199;

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
	component: {
		devServer: {
			framework: 'react',
			bundler: 'vite',
			viteConfig: {
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
				plugins: [
					{
						name: 'cypress-component-stubs',
						enforce: 'pre' as const,
						resolveId(source: string) {
							return componentStubs[source] ?? null;
						},
					},
				],
			},
		},
		specPattern: 'cypress/component/**/*.cy.{ts,tsx}',
		supportFile: 'cypress/support/component.ts',
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
				throw new Error(`No built popup at ${popupBuildDir}. Run \`npm run test:e2e\` from the repo root, which builds first, or \`npm run build\` here.`);
			}
			const server = await startStaticServer(popupBuildDir, e2ePort);
			on('after:run', () => new Promise<void>(resolve => { server.close(() => resolve()); }));
			return config;
		},
	},
});

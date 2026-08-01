import { defineConfig } from 'cypress';
import path from 'path';

const root = (rel: string) => path.resolve(__dirname, rel);

const componentStubs: Record<string, string> = {
	'./flipScore': root('./cypress/stubs/flipScore.tsx'),
	'./baseDiamond': root('./cypress/stubs/baseDiamond.tsx'),
	'./tabAssignSelect': root('./cypress/stubs/tabAssignSelect.tsx'),
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
});

import path from 'node:path';

const root = (rel: string) => path.resolve(__dirname, '..', rel);

export const componentStubs: Record<string, string> = {
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

export const componentAliases: { find: string | RegExp; replacement: string }[] = [
	// List subpaths before the root entry to prevent prefix-match collision
	{ find: '@arenaswap/core/constants', replacement: root('../../packages/core/src/constants.ts') },
	{ find: '@arenaswap/core/types', replacement: root('../../packages/core/src/types.ts') },
	{ find: /^@arenaswap\/core$/, replacement: root('../../packages/core/src/index.ts') },
	{ find: /^powerscore$/, replacement: root('../../packages/powerscore/src/index.ts') },
	{ find: /^wxt\/browser$/, replacement: root('./tests/stubs/wxtBrowser.ts') },
	{ find: /^#i18n$/, replacement: root('./cypress/stubs/i18n.ts') },
];

import type { Browser } from 'wxt/browser';
import type { TabRegistration } from '@arenaswap/core/types';
import LiveGameCard from '../../../entrypoints/popup/components/liveGameCard';
import { formatTabLabel } from '../../../entrypoints/popup/popupHelpers';
import { makeScore } from '../../support/fixtures';
import { english, inEveryLocale, type shippedLocale } from '../../support/safetyNet/locales';
import { mountInPopup, popupSurface } from '../../support/safetyNet/mountInPopup';
import { worstCaseGames, worstUserText } from '../../support/safetyNet/worstCase';

const game = worstCaseGames[0].game;

const worstTabs: Browser.tabs.Tab[] = [
	{ id: 1, title: worstUserText.tabTitle, url: 'https://watch.example-stream.test/live/a' },
	{ id: 2, title: worstUserText.tabTitleUrl, url: worstUserText.tabTitleUrl },
	// Two tabs with one title get their paths appended to tell them apart.
	{ id: 3, title: worstUserText.tabTitle, url: 'https://watch.example-stream.test/live/b/with/a/very/long/path/to/the/feed' },
	{ id: 4, title: worstUserText.unbroken(60), url: 'https://example.test/' },
] as Browser.tabs.Tab[];

const mountCard = (registry: TabRegistration[], locale: shippedLocale = english, standbyStreamTabId: number | null = null) => mountInPopup(
	<LiveGameCard
		game={game}
		excitementResult={makeScore(game.id, 87)}
		favoriteTeamIds={new Set()}
		onToggleFavoriteTeam={() => {}}
		onOpenGameDetail={() => {}}
		bettingPrefs={{ bettingEnabled: false }}
		openTabs={worstTabs}
		registry={registry}
		onRegistryChange={() => {}}
		formatTabLabel={tab => formatTabLabel(tab, worstTabs)}
		standbyStreamTabId={standbyStreamTabId}
	/>,
	locale,
);

describe('tab picker containment on a live card', () => {
	inEveryLocale('keeps the unassigned picker inside the card', locale => {
		mountCard([], locale);
		cy.get(popupSurface).assertContained();
	});

	for (const tab of worstTabs) {
		it(`keeps an assigned tab inside the card and names it in full on hover (tab ${tab.id})`, () => {
			mountCard([{ tabId: tab.id!, gameId: game.id }]);
			cy.get(popupSurface).assertContained();
		});
	}

	const openList = (locale: shippedLocale) => {
		mountCard([{ tabId: 1, gameId: 'another-game' }], locale, 2);
		cy.get('.game-card-tab-assign .form-control-caret').click();
		return cy.get('.select-dropdown-menu.show').should('be.visible');
	};

	it('keeps the open list inside the popup\'s margins', () => {
		openList(english);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps every tab in the open list inside it, with tabs in use and on standby', locale => {
		openList(locale).assertContained();
	});
});

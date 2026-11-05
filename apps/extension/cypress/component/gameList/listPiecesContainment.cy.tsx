import { useState } from 'react';
import type { Game } from '@arenaswap/core/types';
import EmptyGameState from '../../../entrypoints/popup/components/emptyGameState';
import GameListHeader from '../../../entrypoints/popup/components/gameListHeader';
import NoGamesMessage from '../../../entrypoints/popup/components/noGamesMessage';
import ProTip from '../../../entrypoints/popup/components/proTip';
import ReviewPromptBanner from '../../../entrypoints/popup/components/reviewPromptBanner';
import SuggestBanner from '../../../entrypoints/popup/components/suggestBanner';
import SuggestView from '../../../entrypoints/popup/components/suggestView';
import UpcomingDayPager from '../../../entrypoints/popup/components/upcomingDayPager';
import UpcomingSearchTitle from '../../../entrypoints/popup/components/upcomingSearchTitle';
import type { TabSuggestion } from '../../../utils/tabSuggestions';
import { inEveryLocale, type shippedLocale } from '../../support/safetyNet/locales';
import { mountInPopup, mountPopupView, popupSurface } from '../../support/safetyNet/mountInPopup';
import { worstCaseGames, worstUserText } from '../../support/safetyNet/worstCase';

const noGamesMessageCount = 7;
const loadingMessageCount = 120;

const realRandom = Math.random;

// Mounts while Math.random answers with a fixed value, so a component that picks its line at random
// shows a chosen one. The pick is made on the first render, which lands after the mount command
// returns, so it is restored only once the picked line is on the page.
const mountPicking = (value: number, mount: () => void, picked: string) => {
	cy.then(() => {
		Math.random = () => value;
	});
	mount();
	cy.get(picked).should('exist');
	cy.then(() => {
		Math.random = realRandom;
	});
};

afterEach(() => {
	Math.random = realRandom;
});

const longestDayLabel = (locale: shippedLocale) => {
	const labels = Array.from({ length: 366 }, (_, offset) => (
		new Date(2027, 0, 1 + offset).toLocaleDateString(locale.tag, { weekday: 'long', month: 'short', day: 'numeric' })
	));
	return labels.reduce((longest, label) => (label.length > longest.length ? label : longest));
};

describe('notices and headers containment', () => {
	inEveryLocale('keeps the suggest banner inside the popup with a four-digit count', locale => {
		mountInPopup(<SuggestBanner count={1000} onReview={() => {}} onDismiss={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the review prompt inside the popup', locale => {
		mountInPopup(<ReviewPromptBanner onDismiss={() => {}} onLeaveReview={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the load failure banner and its retry button inside the popup', locale => {
		mountInPopup(<GameListHeader isLoading={false} hasError loadingMessage='' onRefresh={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps every loading line inside the popup', locale => {
		const messages = Object.values((locale.messages as unknown as { loading: Record<string, string> }).loading);
		expect(messages.length, 'the loading lines in this locale').to.be.at.least(loadingMessageCount);
		mountInPopup(
			<>
				{messages.map((message, index) => <GameListHeader key={index} isLoading hasError={false} loadingMessage={message} onRefresh={() => {}} />)}
			</>,
			locale,
		);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the no leagues state inside the popup', locale => {
		mountInPopup(<EmptyGameState noLeaguesSelected noGames={false} onOpenSetup={() => {}} onRefresh={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps every no games message inside the popup', locale => {
		for (let index = 0; index < noGamesMessageCount; index += 1) {
			mountPicking((index + 0.5) / noGamesMessageCount, () => mountInPopup(<NoGamesMessage onOpenSetup={() => {}} onRefresh={() => {}} />, locale), '.popup-no-games-title');
			cy.get('.popup-no-games-title').should('have.text', (locale.messages as unknown as Record<string, Record<string, { title: string }>>).noGames[`m${index + 1}`].title);
			cy.get(popupSurface).assertContained();
		}
	});

	// Pro tips read their strings when the module loads, so they are English whatever the locale.
	it('keeps every main-list pro tip inside the popup', () => {
		const tipCount = 13;
		for (let index = 0; index < tipCount; index += 1) {
			mountPicking((index + 0.5) / tipCount, () => mountInPopup(<ProTip context='main' chance={1} />), '.popup-notice');
			cy.get(popupSurface).assertContained();
		}
	});
});

const SearchHarness = ({ initial }: { initial: string }) => {
	const [query, setQuery] = useState<string | null>(initial);
	return <UpcomingSearchTitle query={query} onQueryChange={setQuery} />;
};

describe('Up Next controls containment', () => {
	inEveryLocale('keeps the day pager inside the popup with the longest date in the language', locale => {
		mountInPopup(<UpcomingDayPager dayLabel={longestDayLabel(locale)} index={3} total={14} onSelect={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the search title inside the popup with the field closed', locale => {
		mountInPopup(<UpcomingSearchTitle query={null} onQueryChange={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the open search field inside the popup', locale => {
		mountInPopup(<SearchHarness initial='' />, locale);
		cy.get(popupSurface).assertContained();
	});

	it('keeps a long unbroken search typed into the field inside the popup', () => {
		mountInPopup(<SearchHarness initial={worstUserText.unbroken(200)} />);
		cy.get(popupSurface).assertContained();
	});
});

const suggestGames: Game[] = worstCaseGames.map(({ game }) => game);

const suggestTabs = suggestGames.map((game, index) => ({
	id: index + 1,
	title: index % 2 === 0 ? worstUserText.tabTitle : worstUserText.tabTitleUrl,
	url: worstUserText.tabTitleUrl,
}));

const suggestions: TabSuggestion[] = suggestGames.map((game, index) => ({
	tabId: index + 1,
	gameId: game.id,
	score: 90,
	preChecked: true,
}));

describe('suggest view containment', () => {
	const mountSuggest = (locale?: shippedLocale) => mountPopupView(
		<SuggestView
			suggestions={suggestions}
			games={suggestGames}
			openTabs={suggestTabs}
			formatTabLabel={tab => tab.title ?? ''}
			onApply={() => {}}
			onBack={() => {}}
		/>,
		locale,
	);

	it('names a cut tab title in full on hover', () => {
		mountSuggest();
		cy.get(popupSurface).assertContained();
	});

	// The cut-title check above is its own test, so one missing title is one red test and not twelve.
	inEveryLocale('keeps the longest names and tab titles inside the popup', locale => {
		mountSuggest(locale);
		cy.get(popupSurface).assertContained({ exempt: ['.suggest-tab-label'] });
	});

	inEveryLocale('keeps the empty suggest view inside the popup', locale => {
		mountPopupView(<SuggestView suggestions={[]} games={[]} openTabs={[]} formatTabLabel={() => ''} onApply={() => {}} onBack={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});
});

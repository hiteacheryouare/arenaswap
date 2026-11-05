import { useRef, useState } from 'react';
import { createDefaultUserPreferences, leagueConfigs } from '@arenaswap/core/constants';
import type { Game, UserPreferences } from '@arenaswap/core/types';
import MainView from '../../../entrypoints/popup/components/mainView';
import { inEveryLocale } from '../../support/safetyNet/locales';
import { mountPopupView, popupSurface } from '../../support/safetyNet/mountInPopup';
import { slateOf, slateSizes, worstCaseGames, worstUserText } from '../../support/safetyNet/worstCase';

const hour = 60 * 60 * 1000;
const day = 24 * hour;

const allLeagues = leagueConfigs.map(config => config.id);

// The slate spread across the three states a list can hold, with the upcoming third spread over the
// whole fourteen-day window so the pager has real pages.
const mixedSlate = (count: number): Game[] => slateOf(count).map((game, index) => {
	if (index % 3 === 0) return game;
	if (index % 3 === 1) {
		return { ...game, status: 'pre', period: 0, clockSeconds: 0, startTime: new Date(Date.now() + hour + (index % 14) * day).toISOString() };
	}
	return { ...game, status: 'post' };
});

const prefs = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
	...createDefaultUserPreferences(),
	enabledLeagues: allLeagues,
	keepFinalGames: true,
	showUpcomingGames: true,
	proTipsEnabled: false,
	...overrides,
});

const viewProps = {
	prefsLoaded: true,
	isLoading: false,
	hasError: false,
	scores: [],
	leagueLogos: {},
	registry: [],
	favoriteTeamIds: new Set<string>(),
	gameBoosts: {},
	openTabs: [],
	onStandbyStream: false,
	onOpenGameDetail: () => {},
	onOpenSetup: () => {},
	onRefresh: () => {},
	showReviewPrompt: false,
	onToggleEnabled: () => {},
	onDismissReviewPrompt: () => {},
	onLeaveReview: () => {},
	onToggleFavoriteTeam: () => {},
	onRegistryChange: () => {},
	onStartWalkthrough: () => {},
	onOpenGuide: () => {},
	onBossButton: () => {},
	formatTabLabel: () => worstUserText.tabTitle,
	suggestionCount: 0,
	onReviewSuggestions: () => {},
	onDismissSuggestions: () => {},
};

const View = ({ games, userPrefs = prefs(), ...rest }: { games: Game[]; userPrefs?: UserPreferences } & Partial<React.ComponentProps<typeof MainView>>) => {
	const scrollOffsetRef = useRef(0);
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	return (
		<MainView
			{...viewProps}
			prefs={userPrefs}
			games={games}
			scrollOffsetRef={scrollOffsetRef}
			selectedDayKey={selectedDayKey}
			onSelectDay={setSelectedDayKey}
			{...rest}
		/>
	);
};

// The header deliberately reaches into the container's padding, and the glow is a decoration painted
// behind the whole popup.
const listOptions = { bleeds: ['.popup-header'], exempt: ['.popup-glow'] };

describe('main list containment', () => {
	for (const [name, size] of Object.entries(slateSizes)) {
		inEveryLocale(`keeps a list of ${name === 'none' ? 'no' : size} games inside the popup`, locale => {
			mountPopupView(<View games={mixedSlate(size)} />, locale);
			cy.get(popupSurface).assertContained(listOptions);
		});
	}

	inEveryLocale('keeps every notice at once inside the popup', locale => {
		mountPopupView(
			<View
				games={mixedSlate(slateSizes.many)}
				suggestionCount={12}
				onStandbyStream
				heldSwitch={{ gameId: worstCaseGames[1].game.id + '-1', sport: 'basketball' }}
				hasError
			/>,
			locale,
		);
		cy.get(popupSurface).assertContained(listOptions);
	});

	inEveryLocale('keeps a held switch between the longest abbreviations inside the popup', locale => {
		const held: Game = { ...worstCaseGames[1].game, id: 'held' };
		mountPopupView(<View games={[held]} heldSwitch={{ gameId: 'held', sport: 'hockey' }} />, locale);
		cy.get('[data-testid="held-switch-banner"]').should('be.visible');
		cy.get(popupSurface).assertContained(listOptions);
	});

	inEveryLocale('keeps the loading screen inside the popup', locale => {
		mountPopupView(<View games={[]} isLoading />, locale);
		cy.get(popupSurface).assertContained(listOptions);
	});

	inEveryLocale('keeps the empty states inside the popup', locale => {
		mountPopupView(<View games={[]} userPrefs={prefs({ enabledLeagues: [] })} />, locale);
		cy.get(popupSurface).assertContained(listOptions);
	});

	it('keeps an unbroken Up Next search inside the popup', () => {
		mountPopupView(<View games={mixedSlate(slateSizes.many)} upcomingQuery={worstUserText.unbroken(200)} />);
		cy.get('[data-testid="upcoming-search-empty"]').should('be.visible');
		cy.get(popupSurface).assertContained(listOptions);
	});

	it('keeps a long Up Next search inside the popup', () => {
		mountPopupView(<View games={mixedSlate(slateSizes.many)} upcomingQuery={'boston celtics philadelphia 76ers '.repeat(8)} />);
		cy.get('[data-testid="upcoming-search-empty"]').should('be.visible');
		cy.get(popupSurface).assertContained(listOptions);
	});

	it('keeps a long Up Next query inside the popup when the field is open', () => {
		mountPopupView(<View games={mixedSlate(slateSizes.many)} upcomingQuery='' />);
		cy.get('[data-testid="upcoming-search-input"]').type(worstUserText.unbroken(200), { delay: 0 });
		cy.get(popupSurface).assertContained(listOptions);
	});
});

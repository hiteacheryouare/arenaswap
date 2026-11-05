import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import SelectDropdown from '@arenaswap/ui/src/components/selectDropdown';
import type { Game } from '@arenaswap/core/types';
import { i18n } from '#i18n';
import { makeScore } from '../../support/fixtures';
import { inEveryLocale } from '../../support/safetyNet/locales';
import { mountInPopup, popupSurface } from '../../support/safetyNet/mountInPopup';
import { worstBroadcasts, worstCaseGames, worstUserText } from '../../support/safetyNet/worstCase';

// The popup's own card wraps this one with the real tab picker (entrypoints/popup/components/
// liveGameCard.tsx), which this group cannot load. The shared picker stands in, holding the longest
// tab title, so the footer is as full as it ever gets.
const tabPicker = (label: string) => (
	<div className='game-card-tab-assign'>
		<SelectDropdown value='tab' options={[{ value: 'tab', label }]} onChange={() => {}} ariaLabel={i18n.t('tabAssign.placeholder')} />
	</div>
);

const cardProps = (game: Game, tabLabel: string) => ({
	game,
	excitementResult: makeScore(game.id, 87),
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
	tabSlot: tabPicker(tabLabel),
});

const card = (game: Game, tabLabel: string) => <LiveGameCard {...cardProps(game, tabLabel)} />;

const upcoming = (game: Game): Game => ({ ...game, status: 'pre', period: 0, clockSeconds: 0, startTime: '2026-10-10T23:30:00Z', broadcasts: worstBroadcasts });
const finished = (game: Game): Game => ({ ...game, status: 'post', finalPeriodSuffix: 'OT' });

describe('game card containment', () => {
	for (const { label, game } of worstCaseGames) {
		inEveryLocale(`keeps the ${label} inside the card`, locale => {
			mountInPopup(card(game, worstUserText.tabTitle), locale);
			cy.get(popupSurface).assertContained();
		});
	}

	it('keeps a tab titled with its bare URL inside the card', () => {
		mountInPopup(card(worstCaseGames[0].game, worstUserText.tabTitleUrl));
		cy.get(popupSurface).assertContained();
	});

	for (const { label, game } of worstCaseGames) {
		inEveryLocale(`keeps the ${label} inside the upcoming card`, locale => {
			mountInPopup(<PreGameCard {...cardProps(upcoming(game), worstUserText.tabTitle)} />, locale);
			cy.get(popupSurface).assertContained();
		});

		inEveryLocale(`keeps the ${label} inside the final card`, locale => {
			mountInPopup(<FinalGameCard {...cardProps(finished(game), worstUserText.tabTitle)} />, locale);
			cy.get(popupSurface).assertContained();
		});
	}

	inEveryLocale('keeps a delayed game\'s status inside the card', locale => {
		const game = { ...worstCaseGames[0].game, delayed: true };
		mountInPopup(card(game, worstUserText.tabTitle), locale);
		cy.get(popupSurface).assertContained();
	});
});

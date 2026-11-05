import type { Game } from '@arenaswap/core/types';
import { inEveryLocale } from '../../support/safetyNet/locales';
import { detailBleeds, detailView, mountDetailView, powerScoreHistoryOf, scoreHistoryOf } from '../../support/safetyNet/detailView';
import { popupSurface } from '../../support/safetyNet/mountInPopup';
import { worstBroadcasts, worstCaseGames } from '../../support/safetyNet/worstCase';

// `mock-` ids make useSummaryData answer from canned data instead of the network, so the records
// row (mock-3 holds the widest real record) and the standings tab are on screen without a fetch.
const mockedGame = (game: Game): Game => ({
	...game,
	id: 'mock-3',
	broadcasts: worstBroadcasts,
	odds: { details: `${game.homeTeam.abbreviation} -12.5`, overUnder: 231.5, provider: { name: 'DraftKings' } },
});

const upcomingOf = (game: Game): Game => ({
	...mockedGame(game),
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	startTime: '2026-10-11T23:30:00Z',
	homeTeam: { ...game.homeTeam, score: 0 },
	awayTeam: { ...game.awayTeam, score: 0 },
});

const withHistory = (game: Game) => ({
	scoreHistory: scoreHistoryOf(game),
	powerScoreHistory: powerScoreHistoryOf(game.id),
});

describe('game detail containment', () => {
	for (const { label, game } of worstCaseGames) {
		inEveryLocale(`keeps a live game with the ${label} inside the popup`, locale => {
			const live = mockedGame(game);
			mountDetailView(detailView(live, withHistory(live)), locale);
			cy.get(popupSurface).assertContained({ bleeds: detailBleeds });
		});

		inEveryLocale(`keeps a final game with the ${label} inside the popup`, locale => {
			const final: Game = { ...mockedGame(game), status: 'post', finalPeriodSuffix: 'OT' };
			mountDetailView(detailView(final, withHistory(final)), locale);
			cy.get(popupSurface).assertContained({ bleeds: detailBleeds });
		});

		inEveryLocale(`keeps an upcoming game with the ${label} inside the popup`, locale => {
			mountDetailView(detailView(upcomingOf(game)), locale);
			cy.get(popupSurface).assertContained({ bleeds: detailBleeds });
		});
	}
});

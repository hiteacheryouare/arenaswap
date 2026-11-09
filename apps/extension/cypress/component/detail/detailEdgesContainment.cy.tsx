import type { Game } from '@arenaswap/core/types';
import { buildPowerScoreOption } from '@arenaswap/ui/src/components/gameDetailChartOptions';
import { detailBleeds, detailView, mountDetailView, powerScoreHistoryOf, scoreHistoryOf } from '../../support/safetyNet/detailView';
import { inEveryLocale } from '../../support/safetyNet/locales';
import { popupSurface } from '../../support/safetyNet/mountInPopup';
import { worstCaseGames } from '../../support/safetyNet/worstCase';

const rankedSeries = (game: Game, id: string): Game => ({
	...game,
	id,
	awayTeam: { ...game.awayTeam, rank: 25, timeouts: 3 },
	homeTeam: { ...game.homeTeam, rank: 25, timeouts: 3 },
});

describe('detail hero edge containment', () => {
	// mock-14 carries a canned playoff series ("BOS leads series 3-2") on top of its record.
	for (const { label, game } of worstCaseGames.filter(entry => ['basketball', 'hockey'].includes(entry.game.sportType))) {
		inEveryLocale(`keeps a ranked ${label} with a series and timeouts inside the hero`, locale => {
			mountDetailView(detailView(rankedSeries(game, 'mock-14')), locale);
			cy.get(popupSurface).assertContained({ bleeds: detailBleeds });
		});
	}

	inEveryLocale('keeps a delayed game with no description inside the hero and the bar', locale => {
		const delayed: Game = { ...worstCaseGames[0].game, id: 'mock-3', delayed: true };
		mountDetailView(detailView(delayed), locale);
		cy.get(popupSurface).assertContained({ bleeds: detailBleeds });
	});

	inEveryLocale('keeps a postponed game\'s reason and makeup day inside the poster and the bar', locale => {
		const postponed: Game = { ...worstCaseGames[0].game, id: 'mock-3', status: 'post', disruption: 'postponed', postponedReason: 'airQuality', makeupDate: '2026-09-30' };
		mountDetailView(detailView(postponed), locale);
		cy.get('.gd-poster-status').should('be.visible');
		cy.get(popupSurface).assertContained({ bleeds: detailBleeds });
	});

	it('keeps a long delay description inside the hero', () => {
		const delayed: Game = { ...worstCaseGames[4].game, id: 'mock-3', delayed: true, delayDescription: 'Delayed: Lightning in the Area' };
		mountDetailView(detailView(delayed));
		cy.get(popupSurface).assertContained({ bleeds: detailBleeds });
	});
});

describe('detail view beside the macOS scrollbar', () => {
	const narrow = { width: 305, height: 560 };

	for (const { label, game } of worstCaseGames) {
		it(`keeps a live game with the ${label} inside the popup at 305px`, () => {
			mountDetailView(detailView({ ...game, id: 'mock-3' }, { powerScoreHistory: powerScoreHistoryOf('mock-3'), scoreHistory: scoreHistoryOf({ ...game, id: 'mock-3' }) }));
			cy.viewport(narrow.width, narrow.height);
			cy.get(popupSurface).assertContained({ bleeds: detailBleeds });
		});
	}
});

describe('detail chart edges', () => {
	it('keeps a single reading and an all-zero history inside the card', () => {
		const game: Game = { ...worstCaseGames[0].game, id: 'mock-3', status: 'in' };
		const zero = { ...game, awayTeam: { ...game.awayTeam, score: 0 }, homeTeam: { ...game.homeTeam, score: 0 } };
		mountDetailView(detailView(zero, { powerScoreHistory: powerScoreHistoryOf('mock-3', [0]), scoreHistory: scoreHistoryOf(zero, 1), excitementResult: undefined }));
		cy.get(popupSurface).assertContained({ bleeds: detailBleeds });
		cy.get('[data-testid="game-detail-chart"]').should('have.length.greaterThan', 0);
	});

	it('lifts the PowerScore axis above a reading past 100, so the line is not drawn off the top', () => {
		const history = powerScoreHistoryOf('g', [90, 187]);
		const option = buildPowerScoreOption(history) as { yAxis: { max: number } };
		expect(option.yAxis.max).to.be.at.least(187);
	});
});

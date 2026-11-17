import type { ReactNode } from 'react';
import GameDetailView from '../../../entrypoints/popup/components/gameDetailView';
import type { Game, LiveScore, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';
import { makeScore } from '../fixtures';
import { english, withLocale, type shippedLocale } from './locales';
import { popupViewport } from './mountInPopup';

export const mountDetailView = (node: ReactNode, locale: shippedLocale = english) => {
	cy.viewport(popupViewport.width, popupViewport.height);
	return cy.mount(withLocale(locale, (
		<div className='popup-root'>
			<div className='popup-view-shell is-opening-view'>{node}</div>
		</div>
	)));
};

export const detailBleeds = ['.game-detail-header'];

const minuteMs = 60_000;
const historyEnd = () => Date.now();

export const wholeScore = (gameId: string, total: number) => makeScore(gameId, total, {
	closeness: Math.round(total * 0.4),
	lateGame: Math.round(total * 0.3),
	momentum: Math.round(total * 0.1),
	leadChanges: Math.round(total * 0.1),
	comeback: Math.round(total * 0.1),
});

export const powerScoreHistoryOf = (gameId: string, totals: readonly number[] = [60, 63, 66, 69, 72, 75]): PowerScoreSnapshot[] => (
	totals.map((total, index) => ({
		...wholeScore(gameId, total),
		signalsSubtotal: total,
		favoriteBonus: 0,
		favoriteTeamCount: 0,
		timestamp: historyEnd() - (totals.length - index) * minuteMs,
	}))
);

export const scoreHistoryOf = (game: Game, length = 6): ScoreSnapshot[] => Array.from({ length }, (_, index) => ({
	gameId: game.id,
	timestamp: historyEnd() - (length - index) * minuteMs,
	awayScore: Math.max(0, game.awayTeam.score - (length - 1 - index)),
	homeScore: Math.max(0, game.homeTeam.score - (length - 1 - index)),
}));

export interface detailViewExtras {
	excitementResult?: LiveScore | undefined;
	scoreHistory?: ScoreSnapshot[];
	powerScoreHistory?: PowerScoreSnapshot[];
	bettingEnabled?: boolean;
}

export const detailView = (game: Game, extras: detailViewExtras = {}) => (
	<GameDetailView
		game={game}
		excitementResult={'excitementResult' in extras ? extras.excitementResult : wholeScore(game.id, 87)}
		scoreHistory={extras.scoreHistory ?? []}
		powerScoreHistory={extras.powerScoreHistory ?? []}
		proTipsEnabled={false}
		gameBoosts={{}}
		bettingPrefs={{ bettingEnabled: extras.bettingEnabled ?? true }}
		weatherPrefs={{ temperatureUnit: 'F' }}
		decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false, holidayChristmasEnabled: false, holidayBuntingEnabled: false, holidayFireworksEnabled: false }}
		onSetGameBoost={() => {}}
		onBack={() => {}}
	/>
);

import type { BasketballTeamSituation } from '@arenaswap/core';
import { sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId, RedCardEvent } from '@arenaswap/core/types';
import { formatGameClock, formatPeriod, isHalftime } from './gameCardShared';

// Injected rather than imported so the resolver stays pure and Jest-testable.
type Translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

export interface GameStatus {
	text: string;
	// Lekton holds a running clock's digits still while it counts down. Everything else, an inning
	// or a "Halftime", takes the body face, since nothing in it moves.
	ticking: boolean;
}

// During an intermission or a delay the period and clock stop meaning anything, so those states
// say what is actually happening instead — except for the inning sports, where the half-inning
// change ESPN can report as an intermission is exactly what the inning line already says.
export const resolveStatus = (game: Game, isInningSport: boolean, t: Translate): GameStatus => {
	if (game.delayed === true) return { text: game.delayDescription ?? t('gameCard.delayFallback'), ticking: false };
	// The same token the list card and the Guide print, so a shootout reads "Final/SO" on all three.
	if (game.status === 'post') {
		return { text: game.finalPeriodSuffix ? `${t('detail.final')}/${game.finalPeriodSuffix}` : t('detail.final'), ticking: false };
	}
	if (game.status === 'pre') return { text: '', ticking: false };
	if (isInningSport) return { text: formatPeriod(game, t), ticking: false };
	if (game.intermission === true) {
		return { text: isHalftime(game) ? t('detail.halftime') : t('detail.intermission'), ticking: false };
	}

	const clockBased = sportTypeConfigMap[game.sportType]?.clockBased ?? false;
	return {
		text: clockBased ? `${formatPeriod(game, t)} • ${formatGameClock(game)}` : formatPeriod(game, t),
		ticking: clockBased,
	};
};

// A full allotment, so the dots can show the ones already spent.
const basketballTimeoutAllotments: Partial<Record<LeagueId, number>> = { nba: 7 };

export const basketballTimeoutAllotment = (league: LeagueId): number => basketballTimeoutAllotments[league] ?? 4;

// Every other league's penalty is two shots from the first foul past the limit, which our sources
// report as DOUBLE. Saying "double bonus" there would describe a rule those leagues don't have.
export const bonusKind = (side: BasketballTeamSituation, league: LeagueId): 'bonus' | 'double' | undefined => {
	if (!side.bonus) return undefined;
	return side.bonus === 'double' && league === 'ncaab' ? 'double' : 'bonus';
};

// The minute as a match clock prints it: 26:20 played is the 27th minute, and stoppage time rides
// on the end of the half it was added to.
export const formatMatchMinute = (card: RedCardEvent, t: Translate): string => {
	const minute = Math.max(1, Math.ceil(card.minute));
	return card.addedMinutes
		? t('detail.matchMinuteAdded', { minute, added: card.addedMinutes })
		: t('detail.matchMinute', { minute });
};

// Built here rather than taken from our sources' sentence, which only ever arrives in English.
export const describeRedCard = (card: RedCardEvent, game: Game, t: Translate): string => {
	const team = card.teamId === game.homeTeam.id ? game.homeTeam : card.teamId === game.awayTeam.id ? game.awayTeam : undefined;
	const teamName = team ? team.name || team.abbreviation : '';
	const minute = formatMatchMinute(card, t);
	if (card.player && teamName) return t('detail.redCardLine', { minute, player: card.player, team: teamName });
	if (card.player) return t('detail.redCardPlayer', { minute, player: card.player });
	return t('detail.redCardTeam', { minute, team: teamName });
};

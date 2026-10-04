import type { BasketballSituation, BasketballTeamSituation } from '@arenaswap/core';
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

// A full allotment, so the dots can show the ones already spent. The NBA's seven is too many to
// draw, and TimeoutDots says it as a number instead.
const basketballTimeoutAllotments: Partial<Record<LeagueId, number>> = { nba: 7 };

export const basketballTimeoutAllotment = (league: LeagueId): number => basketballTimeoutAllotments[league] ?? 4;

// Every other league's penalty is two shots from the first foul past the limit, which our sources
// report as DOUBLE. Saying "double bonus" there would describe a rule those leagues don't have.
const bonusKind = (side: BasketballTeamSituation, league: LeagueId): 'bonus' | 'double' | undefined => {
	if (!side.bonus) return undefined;
	return side.bonus === 'double' && league === 'ncaab' ? 'double' : 'bonus';
};

// The bonus and fouls to give for both teams, as one line under the hero. A team in the bonus is
// one the other side has run out of fouls on, so each team is described by whichever of the two
// applies to it rather than by both.
export const describeBasketballFouls = (situation: BasketballSituation, game: Game, t: Translate): string | undefined => {
	const away = { name: game.awayTeam.abbreviation, side: situation.away, kind: bonusKind(situation.away, game.league) };
	const home = { name: game.homeTeam.abbreviation, side: situation.home, kind: bonusKind(situation.home, game.league) };

	if (away.kind && home.kind) {
		if (away.kind === home.kind) return t(away.kind === 'double' ? 'detail.foulsBothDoubleBonus' : 'detail.foulsBothBonus');
		const [double, single] = away.kind === 'double' ? [away, home] : [home, away];
		return t('detail.foulsMixedBonus', { first: double.name, second: single.name });
	}

	const shooting = away.kind ? away : home.kind ? home : undefined;
	if (shooting) {
		const toGive = shooting.side.foulsToGive;
		const double = shooting.kind === 'double';
		if (!toGive) return t(double ? 'detail.foulsDoubleBonus' : 'detail.foulsBonus', { team: shooting.name });
		return t(double ? 'detail.foulsDoubleBonusToGive' : 'detail.foulsBonusToGive', toGive, { team: shooting.name });
	}

	const awayToGive = away.side.foulsToGive;
	const homeToGive = home.side.foulsToGive;
	if (awayToGive !== undefined && homeToGive !== undefined) {
		if (awayToGive === homeToGive) return t('detail.foulsBothToGive', awayToGive);
		return t('detail.foulsEachToGive', awayToGive, { first: away.name, second: home.name, count: homeToGive });
	}
	const known = awayToGive !== undefined ? away : homeToGive !== undefined ? home : undefined;
	return known ? t('detail.foulsToGive', known.side.foulsToGive, { team: known.name }) : undefined;
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

import type { BasketballTeamSituation } from '@arenaswap/sideline';
import { sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game, GoalEvent, LeagueId, RedCardEvent } from '@arenaswap/core/types';
import { formatBreak, formatGameClock, formatPeriod } from './gameCardShared';
import { formatDisruption } from './gameFormat';
import type { Translator } from './i18nContext';

export interface GameStatus {
	text: string;
	clock?: string;
}

export const resolveStatus = (game: Game, isInningSport: boolean, t: Translator): GameStatus => {
	const disruption = formatDisruption(game, t);
	if (disruption) return { text: disruption };
	if (game.delayed === true) return { text: game.delayDescription ?? t('gameCard.delayFallback') };
	if (game.status === 'post') {
		return { text: game.finalPeriodSuffix ? `${t('detail.final')}/${game.finalPeriodSuffix}` : t('detail.final') };
	}
	if (game.status === 'pre') return { text: '' };
	if (isInningSport) return { text: formatPeriod(game, t) };
	if (game.intermission === true) return { text: formatBreak(game, t) };

	const clockBased = sportTypeConfigMap[game.sportType]?.clockBased ?? false;
	return { text: formatPeriod(game, t), clock: clockBased ? formatGameClock(game) : undefined };
};

// Every other league's penalty is two shots from the first foul past the limit, which our sources
// report as DOUBLE. Saying "double bonus" there would describe a rule those leagues don't have.
export const bonusKind = (side: BasketballTeamSituation, league: LeagueId): 'bonus' | 'double' | undefined => {
	if (!side.bonus) return undefined;
	return side.bonus === 'double' && league === 'ncaab' ? 'double' : 'bonus';
};

export const formatMatchMinute = (event: Pick<RedCardEvent, 'minute' | 'addedMinutes'>, t: Translator): string => {
	const minute = Math.max(1, Math.ceil(event.minute));
	return event.addedMinutes
		? t('detail.matchMinuteAdded', { minute, added: event.addedMinutes })
		: t('detail.matchMinute', { minute });
};

export const describeScorers = (goals: readonly GoalEvent[], t: Translator): string[] => {
	const lines = new Map<string, { player?: string; minutes: string[] }>();
	for (const goal of goals) {
		const key = `${goal.player ?? ''}|${goal.ownGoal ? 'og' : ''}`;
		const minute = formatMatchMinute(goal, t);
		const marked = goal.ownGoal
			? t('detail.goalMinuteOwnGoal', { minute })
			: goal.penalty ? t('detail.goalMinutePenalty', { minute }) : minute;
		const line = lines.get(key) ?? { player: goal.player, minutes: [] };
		line.minutes.push(marked);
		lines.set(key, line);
	}
	return [...lines.values()].map(({ player, minutes }) => [player, minutes.join(', ')].filter(Boolean).join(' '));
};

export const describeRedCard = (card: RedCardEvent, game: Game, t: Translator): string => {
	const team = card.teamId === game.homeTeam.id ? game.homeTeam : card.teamId === game.awayTeam.id ? game.awayTeam : undefined;
	const teamName = team ? team.name || team.abbreviation : '';
	const minute = formatMatchMinute(card, t);
	if (card.player && teamName) return t('detail.redCardLine', { minute, player: card.player, team: teamName });
	if (card.player) return t('detail.redCardPlayer', { minute, player: card.player });
	return t('detail.redCardTeam', { minute, team: teamName });
};

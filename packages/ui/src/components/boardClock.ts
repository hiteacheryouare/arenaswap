import { leagueConfigMap, sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import { formatGameClock, formatPeriod, isHalftime } from './gameFormat';

type Translate = (key: string, subs?: Record<string, string | number>) => string;

export interface boardClock {
	text: string;
	// A word rather than a period and a clock: Halftime, Final, a delay. Nothing in it lines up.
	word: boolean;
	// Inning sports only, for the caret beside the inning.
	topOfInning?: boolean;
	delayed?: boolean;
}

export const formatStartTime = (iso: string | undefined): string => {
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const isInningGame = (game: Pick<Game, 'league'>): boolean => leagueConfigMap[game.league]?.periodFormat === 'innings';

export const hasShootout = (game: Pick<Game, 'awayTeam' | 'homeTeam'>): boolean => (
	game.awayTeam.shootoutScore !== undefined && game.homeTeam.shootoutScore !== undefined
);

// What sits in the clock slot of every stage, tile and row.
export const resolveBoardClock = (game: Game, t: Translate): boardClock => {
	if (game.status === 'pre') return { text: formatStartTime(game.startTime), word: false };
	if (game.status === 'post') {
		const final = t('gameCard.final');
		return { text: game.finalPeriodSuffix ? `${final}/${game.finalPeriodSuffix}` : final, word: true };
	}
	if (game.delayed === true) return { text: game.delayDescription ?? t('gameCard.delayFallback'), word: true, delayed: true };
	if (hasShootout(game)) {
		return { text: t('gameCard.shootout', { away: game.awayTeam.shootoutScore ?? 0, home: game.homeTeam.shootoutScore ?? 0 }), word: false };
	}
	if (isInningGame(game)) return { text: formatPeriod(game), word: false, topOfInning: game.topOfInning };
	if (game.intermission === true) {
		return { text: isHalftime(game) ? t('detail.halftime') : t('detail.intermission'), word: true };
	}
	const clockBased = sportTypeConfigMap[game.sportType]?.clockBased ?? false;
	const clock = clockBased ? formatGameClock(game) : '';
	return { text: clock ? `${formatPeriod(game)} ${clock}` : formatPeriod(game), word: false };
};

export const trailingSide = (game: Pick<Game, 'status' | 'awayTeam' | 'homeTeam'>): 'away' | 'home' | null => {
	if (game.status === 'pre' || hasShootout(game)) return null;
	if (game.awayTeam.score === game.homeTeam.score) return null;
	return game.awayTeam.score < game.homeTeam.score ? 'away' : 'home';
};

export type boardTone = 'pre' | 'live' | 'overtime' | 'delay' | 'final';

export const isOvertime = (game: Pick<Game, 'status' | 'league' | 'period'>): boolean => (
	game.status === 'in' && game.period > (leagueConfigMap[game.league]?.regularPeriods ?? 4)
);

// What the live dot and the status word say: red for live, pink past regulation, a pause for a delay.
export const resolveBoardTone = (game: Game): boardTone => {
	if (game.status === 'pre') return 'pre';
	if (game.status === 'post') return 'final';
	if (game.delayed === true) return 'delay';
	return isOvertime(game) ? 'overtime' : 'live';
};

export const statusWord = (game: Game, tone: boardTone, t: Translate): string | null => {
	if (tone === 'live') return t('gameCard.live');
	if (tone === 'final') return resolveBoardClock(game, t).text;
	if (tone === 'delay') return t('board.delayed');
	if (tone !== 'overtime') return null;
	if (isInningGame(game)) return t('board.extraInnings');
	return game.sportType === 'soccer' ? t('board.extraTime') : t('board.overtime');
};

export interface clockLines {
	main: string;
	// The period under a running clock, as v2 stacked them.
	sub?: string;
	word: boolean;
	topOfInning?: boolean;
}

// The clock slot split into v2's two lines: the clock, then the period under it.
export const resolveClockLines = (game: Game, t: Translate): clockLines => {
	const whole = resolveBoardClock(game, t);
	if (game.status !== 'in' || whole.word || whole.topOfInning !== undefined || hasShootout(game)) {
		return { main: whole.text, word: whole.word, topOfInning: whole.topOfInning };
	}
	const clockBased = sportTypeConfigMap[game.sportType]?.clockBased ?? false;
	const clock = clockBased ? formatGameClock(game) : '';
	return clock ? { main: clock, sub: formatPeriod(game), word: false } : { main: whole.text, word: false };
};

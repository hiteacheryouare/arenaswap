import { SPORT_CONFIG_MAP, SCORE_MAX_CLOSENESS, SCORE_MAX_LATE_GAME, SCORE_MAX_MOMENTUM } from './constants';
import type { SportConfig } from './constants';
import type { Game, ScoreSnapshot, ExcitementResult } from './types';

interface Signal { score: number; reason: string; }

const getCloseness = (game: Game, config: SportConfig): Signal => {
	const [t1, t2, t3] = config.closenessMargins;
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	if (margin === 0) return { score: SCORE_MAX_CLOSENESS, reason: 'tied' };
	if (margin <= t1) return { score: 35, reason: `${margin}-${config.id === 'nhl' ? 'goal' : 'point'} game` };
	if (margin <= t2) return { score: 20, reason: `${margin}-${config.id === 'nhl' ? 'goal' : 'point'} game` };
	if (margin <= t3) return { score: 8, reason: '' };
	return { score: 0, reason: '' };
};

const formatClock = (seconds: number): string => {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
};

const ordinal = (n: number): string => {
	if (n === 1) return '1st';
	if (n === 2) return '2nd';
	if (n === 3) return '3rd';
	return `${n}th`;
};

const getLateGame = (game: Game, config: SportConfig): Signal => {
	const { regularPeriods, clockBased } = config;

	// Overtime / extra innings
	if (game.period > regularPeriods)
		return { score: SCORE_MAX_LATE_GAME, reason: clockBased ? 'overtime' : 'extra innings' };

	if (!clockBased) {
		// MLB: use inning number as a proxy for time pressure
		if (game.period >= regularPeriods)
			return { score: 30, reason: `${ordinal(game.period)} inning` };
		if (game.period >= 7)
			return { score: 20, reason: `${ordinal(game.period)} inning` };
		if (game.period >= 6)
			return { score: 10, reason: '' };
		return { score: 0, reason: '' };
	}

	// Clock-based sports
	const isLastPeriod = game.period === regularPeriods;
	const isPrevPeriod = game.period === regularPeriods - 1;

	if (isLastPeriod && game.clockSeconds <= config.lateGameCriticalSecs)
		return { score: 30, reason: `${formatClock(game.clockSeconds)} left` };
	if (isLastPeriod && game.clockSeconds <= config.lateGameTenseSecs)
		return { score: 20, reason: `under ${config.lateGameTenseSecs / 60} min left` };
	if (isPrevPeriod && game.clockSeconds <= config.lateGamePrevPeriodSecs)
		return { score: 10, reason: '' };
	return { score: 0, reason: '' };
};

const getMomentum = (game: Game, history: ScoreSnapshot[], config: SportConfig): Signal => {
	if (history.length < 3) return { score: 0, reason: '' };

	const oldest = history[0];
	const newest = history[history.length - 1];
	const homeDelta = newest.homeScore - oldest.homeScore;
	const awayDelta = newest.awayScore - oldest.awayScore;
	const run = Math.abs(homeDelta - awayDelta);
	const runTeam = homeDelta > awayDelta ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;

	if (run >= config.momentumBigRun)
		return { score: SCORE_MAX_MOMENTUM, reason: `${runTeam} on a ${run}-0 run` };
	if (run >= config.momentumSmallRun)
		return { score: 10, reason: `${runTeam} rolling` };
	return { score: 0, reason: '' };
};

export const computeExcitement = (
	game: Game,
	history: ScoreSnapshot[],
): ExcitementResult => {
	if (game.intermission)
		return { gameId: game.id, total: 0, closeness: 0, lateGame: 0, momentum: 0, reason: '' };

	const config = SPORT_CONFIG_MAP[game.sport] ?? SPORT_CONFIG_MAP['ncaab'];

	const closeness = getCloseness(game, config);
	const lateGame = getLateGame(game, config);
	const momentum = getMomentum(game, history, config);

	const total = closeness.score + lateGame.score + momentum.score;

	const reason = [momentum.reason, lateGame.reason, closeness.reason]
		.filter(Boolean)
		.slice(0, 2)
		.join(', ') || 'exciting game';

	return {
		gameId: game.id,
		total,
		closeness: closeness.score,
		lateGame: lateGame.score,
		momentum: momentum.score,
		reason,
	};
};

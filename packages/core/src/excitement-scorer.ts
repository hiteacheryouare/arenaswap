import {
	SCORE_MAX_CLOSENESS,
	SCORE_MAX_LATE_GAME,
	SCORE_MAX_MOMENTUM,
	SCORE_MAX_PREFERENCE,
	CLOSENESS_TIER_1_MARGIN,
	CLOSENESS_TIER_2_MARGIN,
	CLOSENESS_TIER_3_MARGIN,
	LATE_GAME_OT_PERIOD,
	LATE_GAME_CRITICAL_SECS,
	LATE_GAME_TENSE_SECS,
	LATE_GAME_FIRST_HALF_SECS,
	MOMENTUM_BIG_RUN,
	MOMENTUM_SMALL_RUN,
} from './constants';
import type { Game, ScoreSnapshot, ExcitementResult, UserPreferences } from './types';

interface Signal { score: number; reason: string; };

const getCloseness = (game: Game): Signal => {
	const margin = Math.abs(game.homeTeam.score - game.awayTeam.score);
	if (margin === 0) return { score: SCORE_MAX_CLOSENESS, reason: 'tied' };
	if (margin <= CLOSENESS_TIER_1_MARGIN) return { score: 35, reason: `${margin}-point game` };
	if (margin <= CLOSENESS_TIER_2_MARGIN) return { score: 20, reason: `${margin}-point game` };
	if (margin <= CLOSENESS_TIER_3_MARGIN) return { score: 8, reason: '' };
	return { score: 0, reason: '' };
};

const formatClock = (seconds: number): string => {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
};

const getLateGame = (game: Game): Signal => {
	if (game.period >= LATE_GAME_OT_PERIOD)
		return { score: SCORE_MAX_LATE_GAME, reason: 'overtime' };
	if (game.period === 2 && game.clockSeconds <= LATE_GAME_CRITICAL_SECS)
		return { score: 30, reason: `${formatClock(game.clockSeconds)} left in 2H` };
	if (game.period === 2 && game.clockSeconds <= LATE_GAME_TENSE_SECS)
		return { score: 20, reason: 'under 5 min in 2H' };
	if (game.period === 1 && game.clockSeconds <= LATE_GAME_FIRST_HALF_SECS)
		return { score: 10, reason: 'under 5 min in 1H' };
	return { score: 0, reason: '' };
};

const getMomentum = (game: Game, history: ScoreSnapshot[]): Signal => {
	if (history.length < 3) return { score: 0, reason: '' };

	const oldest = history[0];
	const newest = history[history.length - 1];
	const homeDelta = newest.homeScore - oldest.homeScore;
	const awayDelta = newest.awayScore - oldest.awayScore;
	const run = Math.abs(homeDelta - awayDelta);
	const runTeam = homeDelta > awayDelta ? game.homeTeam.abbreviation : game.awayTeam.abbreviation;

	if (run >= MOMENTUM_BIG_RUN)
		return { score: SCORE_MAX_MOMENTUM, reason: `${runTeam} on a ${run}-0 run` };
	if (run >= MOMENTUM_SMALL_RUN)
		return { score: 10, reason: `${runTeam} rolling` };
	return { score: 0, reason: '' };
};

const getPreference = (game: Game, prefs: UserPreferences): Signal => {
	const teamIds = [game.homeTeam.id, game.awayTeam.id];
	const isFavorite = prefs.favoriteTeamIds.some(id => teamIds.includes(id));
	return isFavorite
		? { score: SCORE_MAX_PREFERENCE, reason: 'your team is playing' }
		: { score: 0, reason: '' };
};

export const computeExcitement = (
	game: Game,
	history: ScoreSnapshot[],
	prefs: UserPreferences,
): ExcitementResult => {
	const closeness = getCloseness(game);
	const lateGame = getLateGame(game);
	const momentum = getMomentum(game, history);
	const preference = getPreference(game, prefs);

	const total = closeness.score + lateGame.score + momentum.score + preference.score;

	// Build reason string from the most significant signals (momentum first — most surprising)
	const reason = [momentum.reason, lateGame.reason, closeness.reason, preference.reason]
		.filter(Boolean)
		.slice(0, 2)
		.join(', ') || 'exciting game';

	return {
		gameId: game.id,
		total,
		closeness: closeness.score,
		lateGame: lateGame.score,
		momentum: momentum.score,
		preference: preference.score,
		reason,
	};
};

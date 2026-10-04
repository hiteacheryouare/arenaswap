import { clamp } from '../math';
import { getClockSecondsRemaining, isPlayFrozen } from '../progress';
import type { Game, LeagueConfig, Side, SignalInput, SportTypeConfig } from '../types';

export const isLive = (game: Game<string>): boolean => game.status === 'in' && !isPlayFrozen(game);

export const otherSide = (side: Side): Side => (side === 'home' ? 'away' : 'home');

export const teamOf = (game: Game<string>, side: Side) => (side === 'home' ? game.homeTeam : game.awayTeam);

// Positive when `side` leads.
export const leadOf = (game: Game<string>, side: Side): number => teamOf(game, side).score - teamOf(game, otherSide(side)).score;

export const secondsLeftInPeriod = (game: Game<string>, sport: SportTypeConfig, league: LeagueConfig): number | null => (
	getClockSecondsRemaining(game, sport, Math.max(1, league.periodDurationSecs))
);

export const isBaseball = (game: Game<string>): boolean => game.sportType === 'baseball' || game.sportType === 'softball';

export const isPostseason = (game: Game<string>): boolean => game.seasonType === 'postseason' || game.postseasonRound !== undefined;

export const ramp = (value: number, from: number, to: number): number => clamp((value - from) / (to - from), 0, 1);

export const none = { points: 0 };

// A countdown clock at 0:00 in the last regulation period with a winner: the game is over even if the
// feed hasn't said so yet, so nothing is left for a boost to promise. Soccer's clock counts up into
// stoppage time, so it's never over this way.
export const isDecided = ({ game, sport, league, margin }: Pick<SignalInput, 'game' | 'sport' | 'league' | 'margin'>): boolean => (
	sport.clockBased && !sport.clockCountsUp && margin > 0 && (game.period ?? 0) >= league.regularPeriods
	&& secondsLeftInPeriod(game, sport, league) === 0
);

export type BoostInput = Pick<SignalInput, 'game' | 'sport' | 'league' | 'progress' | 'context' | 'margin' | 'now'>;

import { estimatedWrapMs, historyWindowMs, sportTypeConfigMap } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';

// The charts on a live screen are a running read on a game in progress — a partial line is the
// honest shape of a game that is only partly played. A wrap screen makes a different promise: it
// is the record of a game that is over, and a "PowerScore over time" that opens three hours in
// because that is when the service worker happened to wake up is worse than no chart at all.
//
// History only covers the minutes the background was actually polling. MV3 tears the worker down,
// the browser gets closed, leagues get switched on halfway through — so a finished game routinely
// carries a stub of history rather than none, which is exactly the case a length check misses.
//
// This only asks a question worth asking because the background keeps a thinned sample of the
// whole game rather than a rolling window of the last few minutes. Under a rolling window the two
// fractions below are unsatisfiable in every sport by an order of magnitude: basketball's window is
// five minutes against a span of two hours, so no chart could ever have drawn.

// A snapshot inside this share of the game's estimated length counts as "from the start". Polls
// are seconds apart, so the slack is for a late first wake rather than for a sampling gap.
const startToleranceFraction = 0.1;

// And the last one has to reach this far in. Not 1.0: the wrap estimate is generous by design, so
// a game that ran short would never satisfy a line drawn at its very end.
const endCoverageFraction = 0.9;

interface timestamped { timestamp: number }

// The background keeps every snapshot inside the scorer's rolling window at full resolution and a
// thinned sample of everything before it, so a finished game has a line covering the whole game
// rather than the last few minutes of it. A live screen stays on the window it has always drawn:
// the tail exists for the record of a game that is over, and widening a running chart is a
// different decision from making the wrap's charts possible at all.
export const chartHistory = <T extends timestamped>(
	history: readonly T[],
	game: Pick<Game, 'sportType' | 'status'>,
	now: number = Date.now(),
): T[] => {
	if (game.status === 'post') return [...history];
	const windowMs = sportTypeConfigMap[game.sportType]?.historyWindowMs ?? historyWindowMs;
	const recent = history.filter(snapshot => snapshot.timestamp >= now - windowMs);
	return recent.length > 0 ? recent : history.slice(-1);
};

const gameSpan = (game: Pick<Game, 'sportType' | 'startTime'>, now: number): { startMs: number; lengthMs: number } | null => {
	if (!game.startTime) return null;
	const startMs = new Date(game.startTime).getTime();
	if (!Number.isFinite(startMs)) return null;
	const lengthMs = estimatedWrapMs(game, now) - startMs;
	// A zero-length span would make every fraction below meaningless rather than merely wrong.
	return lengthMs > 0 ? { startMs, lengthMs } : null;
};

export const coversWholeGame = (
	history: readonly timestamped[],
	game: Pick<Game, 'sportType' | 'startTime'>,
	now: number = Date.now(),
): boolean => {
	if (history.length < 2) return false;
	const span = gameSpan(game, now);
	// No start time means no way to tell a full history from a fragment. The charts are the thing
	// being gated, so the fragment is what gets dropped.
	if (!span) return false;

	// The caller hands these in already sorted; taking the ends off the array rather than scanning
	// keeps this a comparison rather than a second pass over a few hundred snapshots.
	const first = history[0]!.timestamp;
	const last = history[history.length - 1]!.timestamp;
	if (first - span.startMs > span.lengthMs * startToleranceFraction) return false;
	return last - span.startMs >= span.lengthMs * endCoverageFraction;
};

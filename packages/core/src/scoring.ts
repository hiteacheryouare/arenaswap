import { scoreGame, signalPoints, boostPoints, sportTypeConfigMap } from 'powerscore';
import type { Game as ScoringGame, PowerScore, PowerScoreResult, ScoreOptions, ScoringContext, ScoreSnapshot, Side } from 'powerscore';
import { createFavoriteTeamKey, historyWindowMs, sensitivityThresholds } from './constants';
import type { Game, Team, UserPreferences } from './types';

// Our sources' shape → the engine's neutral one. Everything source-specific (team ids, the
// home-anchored yard line, a seed sitting in the rank field) is resolved here so the engine never
// has to know where a game came from.
const sideOf = (game: Game, teamId: string | undefined): Side | undefined => {
	if (teamId === undefined) return undefined;
	if (teamId === game.homeTeam.id) return 'home';
	if (teamId === game.awayTeam.id) return 'away';
	return undefined;
};

const yardsToEndZone = (yardLine: number | undefined, possession: Side | undefined): number | undefined => {
	if (yardLine === undefined || possession === undefined) return undefined;
	return possession === 'home' ? 100 - yardLine : yardLine;
};

const toTeamState = (team: Team, seeded: boolean): ScoringGame['homeTeam'] => ({
	score: team.score,
	...(team.abbreviation ? { abbreviation: team.abbreviation } : {}),
	...(team.rank !== undefined && !seeded ? { rank: team.rank } : {}),
	...(team.timeouts !== undefined ? { timeouts: team.timeouts } : {}),
});

export const toScoringGame = (game: Game): ScoringGame => {
	const possession = sideOf(game, game.possessionTeamId);
	const seeded = game.collegeSeeded === true;
	const yards = yardsToEndZone(game.yardLine, possession);
	return {
		id: game.id,
		league: game.league,
		sportType: game.sportType,
		homeTeam: toTeamState(game.homeTeam, seeded),
		awayTeam: toTeamState(game.awayTeam, seeded),
		...(game.period !== undefined ? { period: game.period } : {}),
		...(game.clockSeconds !== undefined ? { clockSeconds: game.clockSeconds } : {}),
		...(game.intermission !== undefined ? { intermission: game.intermission } : {}),
		...(game.delayed !== undefined ? { delayed: game.delayed } : {}),
		...(game.status !== undefined ? { status: game.status } : {}),
		...(game.topOfInning !== undefined ? { topOfInning: game.topOfInning } : {}),
		...(game.baseRunners !== undefined ? { baseRunners: game.baseRunners } : {}),
		...(game.bso !== undefined ? { outs: game.bso.outs } : {}),
		...(game.isRedZone !== undefined ? { isRedZone: game.isRedZone } : {}),
		...(game.down !== undefined ? { down: game.down } : {}),
		...(game.distance !== undefined ? { distance: game.distance } : {}),
		...(game.isGoalToGo !== undefined ? { isGoalToGo: game.isGoalToGo } : {}),
		...(possession !== undefined ? { possession } : {}),
		...(yards !== undefined ? { yardsToEndZone: yards } : {}),
		...(game.postseasonRound !== undefined ? { postseasonRound: game.postseasonRound } : {}),
	};
};

export const getHistoryWindowMsForGame = (game: Pick<Game, 'sportType'>): number => (
	(sportTypeConfigMap[game.sportType] ?? sportTypeConfigMap.basketball).historyWindowMs ?? historyWindowMs
);

// Backstop only — the thinning below is the real policy. Stops the arrays growing without bound if
// polling ever runs faster than expected.
export const maxSnapshotsPerGame = 400;

// Snapshots older than the scorer's window are only ever drawn as a chart line, so the tail is
// thinned to this spacing instead of being discarded. Two minutes puts about 100 samples across a
// football game's first three hours, which is more than 300px of chart can resolve anyway.
const coarseSampleIntervalMs = 120_000;

// Dropping the oldest snapshots would take the start of the game with them, and the start is the
// end the chart gate measures from. So the cap is met by thinning the already-coarse tail further.
const thinToCap = <T extends { timestamp: number }>(coarse: T[], recent: T[]): T[] => {
	let kept = coarse;
	while (kept.length + recent.length > maxSnapshotsPerGame && kept.length > 2) {
		kept = kept.filter((_, index) => index % 2 === 0 || index === kept.length - 1);
	}
	return [...kept, ...recent].slice(-maxSnapshotsPerGame);
};

// What the scorer sees.
export const recentSnapshots = <T extends { timestamp: number }>(snapshots: readonly T[], cutoff: number): T[] => {
	const recent = snapshots.filter(snapshot => snapshot.timestamp >= cutoff);
	return recent.length > 0 ? recent : snapshots.slice(-1);
};

// Everything inside the scorer's window is kept exactly as it arrived. Everything before it is
// thinned rather than dropped, but only when a wrap screen can draw it (Keep finished games on).
export const retainSnapshots = <T extends { timestamp: number }>(snapshots: T[], cutoff: number, keepWholeGame: boolean): T[] => {
	if (!keepWholeGame) return recentSnapshots(snapshots, cutoff);
	const coarse: T[] = [];
	const recent: T[] = [];
	for (const snapshot of snapshots) {
		if (snapshot.timestamp >= cutoff) {
			recent.push(snapshot);
			continue;
		}
		const previous = coarse[coarse.length - 1];
		if (!previous || snapshot.timestamp - previous.timestamp >= coarseSampleIntervalMs) coarse.push(snapshot);
	}
	// A game whose entire history predates the window still has to report a current value.
	if (recent.length === 0) {
		const newest = snapshots[snapshots.length - 1];
		if (newest && coarse[coarse.length - 1] !== newest) coarse.push(newest);
	}
	return thinToCap(coarse, recent);
};

export const toScoreSnapshot = (game: Game, timestamp: number): ScoreSnapshot => ({
	gameId: game.id,
	timestamp,
	homeScore: game.homeTeam.score,
	awayScore: game.awayTeam.score,
});

export interface ClockStallEntry {
	lastClock: number;
	stallCount: number;
}

// Consecutive polls with an unchanged clock. Clockless sports never stall.
export const nextClockStall = (game: Game, previous: ClockStallEntry | undefined): ClockStallEntry | undefined => {
	if (!sportTypeConfigMap[game.sportType]?.clockBased) return undefined;
	if (!previous) return { lastClock: game.clockSeconds, stallCount: 0 };
	if (game.clockSeconds === previous.lastClock) return { lastClock: previous.lastClock, stallCount: previous.stallCount + 1 };
	return { lastClock: game.clockSeconds, stallCount: 0 };
};

export const getFavoriteTeamCount = (game: Game, favoriteTeamIds: ReadonlySet<string>): number => (
	(favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id)) ? 1 : 0)
	+ (favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id)) ? 1 : 0)
);

export interface LiveScoringInput {
	game: Game;
	// The whole retained history; windowed here, so the scorer sees exactly the last few minutes.
	history: readonly ScoreSnapshot[];
	stallCount: number;
	winProbability: number[];
	now: number;
	extras?: Omit<ScoringContext, 'history' | 'stallCount' | 'winProbability'>;
}

export const scoringContextFor = ({ game, history, stallCount, winProbability, now, extras }: LiveScoringInput): ScoringContext => ({
	...extras,
	// The window, not the whole retained series: the thinned tail below it exists for the wrap
	// screen's charts, and feeding three hours of a game to a scorer tuned to the last few minutes
	// would change every signal it computes.
	history: recentSnapshots(history, now - getHistoryWindowMsForGame(game)),
	stallCount,
	winProbability,
});

export type ScoringPrefs = Pick<UserPreferences, 'favoriteTeamIds' | 'favoriteTeamBonusPoints' | 'postseasonBoostPoints' | 'disabledSignals'>;

export const scoreOptionsFor = (game: Game, prefs: ScoringPrefs, gameBoost: number, favoriteTeamIds = new Set(prefs.favoriteTeamIds)): ScoreOptions => ({
	mode: 'classic',
	disabledSignals: prefs.disabledSignals,
	favoriteTeamCount: getFavoriteTeamCount(game, favoriteTeamIds),
	favoriteBoostPoints: prefs.favoriteTeamBonusPoints,
	postseasonBoostPoints: prefs.postseasonBoostPoints,
	gameBoost,
});

export const scoreLiveGame = (input: LiveScoringInput, prefs: ScoringPrefs, gameBoost: number, favoriteTeamIds?: Set<string>): PowerScore => (
	scoreGame(toScoringGame(input.game), scoringContextFor(input), scoreOptionsFor(input.game, prefs, gameBoost, favoriteTeamIds))
);

// The flat 2.x shape the popup still reads.
export const toLegacyPowerScoreResult = (score: PowerScore): PowerScoreResult => ({
	gameId: score.gameId,
	total: score.total,
	closeness: signalPoints(score, 'closeness'),
	lateGame: signalPoints(score, 'lateGame'),
	momentum: signalPoints(score, 'momentum'),
	leadChanges: signalPoints(score, 'leadChanges'),
	comeback: signalPoints(score, 'comeback'),
	...(score.winProbabilityVariance !== undefined ? { winProbabilityVariance: score.winProbabilityVariance } : {}),
	reason: score.reason,
	stalled: score.stalled,
	...(score.frozen ? {} : { stallPenalty: score.stallPenalty }),
	signalsSubtotal: score.scaledSubtotal,
	favoriteBonus: boostPoints(score, 'favoriteBoost'),
	favoriteTeamCount: score.boosts.find(boost => boost.id === 'favoriteBoost')?.meta?.teams ?? 0,
	gameBoost: boostPoints(score, 'gameBoost'),
	scoringOpportunityBoost: boostPoints(score, 'scoringOpportunity'),
	postseasonBoost: boostPoints(score, 'postseasonBoost'),
});

export interface SwitchCandidateTab {
	tabId: number;
	gameId: string;
}

export interface SwitchPolicyInput {
	// Registered game tabs that are still open.
	registry: readonly SwitchCandidateTab[];
	scores: readonly { gameId: string; total: number; reason?: string }[];
	activeTabId: number;
	sensitivity: UserPreferences['sensitivity'];
	cooldownSeconds: number;
	lastSwitchTime: number;
	now: number;
}

export interface SwitchTarget {
	tabId: number;
	gameId: string;
	reason?: string;
}

export const chooseSwitchTarget = ({ registry, scores, activeTabId, sensitivity, cooldownSeconds, lastSwitchTime, now }: SwitchPolicyInput): SwitchTarget | null => {
	const activeReg = registry.find(reg => reg.tabId === activeTabId);
	const activeScore = scores.find(s => s.gameId === activeReg?.gameId)?.total ?? 0;

	const registeredGameIds = new Set(registry.map(reg => reg.gameId));
	const candidates = scores.filter(s => registeredGameIds.has(s.gameId));
	if (candidates.length === 0) return null;

	const best = candidates.reduce((a, b) => (a.total > b.total ? a : b));
	// With several tabs on the same game, picking any but the focused one would switch the user
	// between two tabs of the game they are already watching.
	const bestReg = activeReg?.gameId === best.gameId ? activeReg : registry.find(reg => reg.gameId === best.gameId)!;
	if (bestReg.tabId === activeTabId) return null;

	const threshold = sensitivityThresholds[sensitivity] ?? 0;
	// With no game tab in focus the threshold has nothing to measure against, so the best game wins
	// by default. Every frozen game scores 0, so without the `> 0` guard a league at halftime would
	// pull the user off whatever they were actually doing.
	const notWatchingAGame = !activeReg && best.total > 0;
	if (!notWatchingAGame && best.total < activeScore + threshold) return null;
	if (cooldownSeconds > 0 && now - lastSwitchTime <= cooldownSeconds * 1000) return null;

	return { tabId: bestReg.tabId, gameId: best.gameId, ...(best.reason !== undefined ? { reason: best.reason } : {}) };
};

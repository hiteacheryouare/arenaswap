import {
	chooseSwitchTarget,
	getHistoryWindowMsForGame,
	nextClockStall,
	retainSnapshots,
	toScoreSnapshot,
	type ClockStallEntry,
	type LiveScoringInput,
} from '../../../packages/core/src/scoring';
import type { Game, LeagueId, UserPreferences } from '../../../packages/core/src/types';
import type { ScoreSnapshot } from '../../../packages/powerscore/src/types';
import type { ReplayEvent } from './recording';

export interface ReplayScore {
	gameId: string;
	total: number;
	reason: string;
	// Moment boosts that fired, for shading and the timeline.
	boosts?: Record<string, number>;
}

export interface Scorer {
	name: string;
	score: (input: LiveScoringInput, extras: GameExtrasRecord) => ReplayScore;
}

// Whatever the replay has heard about a game beyond the scoreboard, keyed by kind.
export interface GameExtrasRecord {
	summary?: Record<string, unknown>;
	situation?: Record<string, unknown>;
	situationHistory?: Record<string, unknown>[];
	standings?: unknown;
}

export interface Frame {
	ts: number;
	league: LeagueId;
	games: Map<string, Game>;
	// Best first, per scorer.
	rankings: Map<string, ReplayScore[]>;
	// The game each simulated viewer is watching after this poll.
	watching: Map<string, string | undefined>;
	switched: Map<string, boolean>;
}

interface Viewer {
	watching?: string;
	lastSwitchTime: number;
	switches: number;
	// Switches made while the game being watched was still on.
	voluntarySwitches: number;
}

// Plays a recording through the same steps background.ts takes after each league poll: count clock
// stalls for that league, score every live game against the history so far, then record the poll.
export const createReplaySession = (scorers: Scorer[], prefs: Pick<UserPreferences, 'sensitivity' | 'cooldownSeconds'>) => {
	const liveByLeague = new Map<LeagueId, Game[]>();
	const history = new Map<string, ScoreSnapshot[]>();
	const stalls = new Map<string, ClockStallEntry>();
	const winProbability = new Map<string, number[]>();
	const extras = new Map<string, GameExtrasRecord>();
	const standingsByLeague = new Map<LeagueId, unknown>();
	const viewers = new Map(scorers.map(scorer => [scorer.name, { lastSwitchTime: 0, switches: 0, voluntarySwitches: 0 } as Viewer]));

	const extrasFor = (gameId: string): GameExtrasRecord => {
		let record = extras.get(gameId);
		if (!record) {
			record = {};
			extras.set(gameId, record);
		}
		return record;
	};

	const handle = (event: ReplayEvent): Frame | null => {
		if (event.kind === 'summary') {
			if (event.winProbability.length > 0) winProbability.set(event.gameId, event.winProbability);
			extrasFor(event.gameId).summary = event.raw;
			return null;
		}
		if (event.kind === 'situation') {
			const record = extrasFor(event.gameId);
			record.situation = event.raw;
			record.situationHistory = [...(record.situationHistory ?? []).slice(-3), event.raw];
			return null;
		}
		if (event.kind === 'standings') {
			standingsByLeague.set(event.league, event.raw);
			return null;
		}

		const { ts, league, live } = event;
		liveByLeague.set(league, live);
		for (const game of live) {
			const stall = nextClockStall(game, stalls.get(game.id));
			if (stall) stalls.set(game.id, stall);
		}

		const allLive = [...liveByLeague.values()].flat();
		const games = new Map(allLive.map(game => [game.id, game]));
		const rankings = new Map<string, ReplayScore[]>();
		const watching = new Map<string, string | undefined>();
		const switched = new Map<string, boolean>();

		for (const scorer of scorers) {
			const scores = allLive.map(game => {
				const record = extrasFor(game.id);
				record.standings = standingsByLeague.get(game.league);
				return scorer.score({
					game,
					history: history.get(game.id) ?? [],
					stallCount: stalls.get(game.id)?.stallCount ?? 0,
					winProbability: winProbability.get(game.id) ?? [],
					now: ts,
				}, record);
			}).toSorted((a, b) => b.total - a.total);
			rankings.set(scorer.name, scores);

			const viewer = viewers.get(scorer.name)!;
			const registry = allLive.map((game, index) => ({ tabId: index + 1, gameId: game.id }));
			const activeTabId = registry.find(tab => tab.gameId === viewer.watching)?.tabId ?? -1;
			const target = chooseSwitchTarget({ registry, scores, activeTabId, sensitivity: prefs.sensitivity, cooldownSeconds: prefs.cooldownSeconds, lastSwitchTime: viewer.lastSwitchTime, now: ts });
			if (target) {
				if (viewer.watching !== undefined && games.has(viewer.watching)) viewer.voluntarySwitches++;
				if (viewer.watching !== undefined) viewer.switches++;
				viewer.watching = target.gameId;
				viewer.lastSwitchTime = ts;
			}
			watching.set(scorer.name, viewer.watching);
			switched.set(scorer.name, target !== null);
		}

		for (const game of live) {
			const snapshots = history.get(game.id) ?? [];
			snapshots.push(toScoreSnapshot(game, ts));
			history.set(game.id, retainSnapshots(snapshots, ts - getHistoryWindowMsForGame(game), false));
		}

		return { ts, league, games, rankings, watching, switched };
	};

	return { handle, viewers };
};

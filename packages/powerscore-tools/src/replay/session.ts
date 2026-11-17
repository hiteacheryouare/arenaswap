import {
	chooseSwitchTarget,
	getHistoryWindowMsForGame,
	nextClockStall,
	nextCommercialBreak,
	retainSnapshots,
	toScoreSnapshot,
	type ClockStallEntry,
	type CommercialBreakEntry,
	type LiveScoringInput,
	type FantasyRosterEntry,
	type Game,
	type LeagueId,
	type UserPreferences,
} from '@arenaswap/core';
import { createLiveExtras } from '@arenaswap/sideline';
import { leagueConfigMap, sportTypeConfigMap, type ScoreSnapshot } from 'powerscore';
import type { ReplayEvent } from './recording';

export interface ReplayScore {
	gameId: string;
	total: number;
	reason: string;
	boosts?: Record<string, number>;
}

export interface ReplayScoringInput extends LiveScoringInput {
	stallCount: number;
}

export interface Scorer {
	name: string;
	score: (input: ReplayScoringInput) => ReplayScore;
}

export interface Frame {
	ts: number;
	league: LeagueId;
	games: Map<string, Game>;
	rankings: Map<string, ReplayScore[]>;
	watching: Map<string, string | undefined>;
	switched: Map<string, boolean>;
	switchedAway: Map<string, boolean>;
	firstSeen: ReadonlyMap<string, number>;
	commercialBreaks: ReadonlyMap<string, CommercialBreakEntry>;
}

interface Viewer {
	watching?: string;
	lastSwitchTime: number;
	switches: number;
	voluntarySwitches: number;
}

const sportOf = (league: LeagueId) => leagueConfigMap[league]?.sportType ?? 'basketball';

export const createReplaySession = (scorers: Scorer[], prefs: Pick<UserPreferences, 'sensitivity' | 'cooldownSeconds'>, roster: FantasyRosterEntry[] = []) => {
	const liveByLeague = new Map<LeagueId, Game[]>();
	const history = new Map<string, ScoreSnapshot[]>();
	const stalls = new Map<string, ClockStallEntry>();
	const commercialBreaks = new Map<string, CommercialBreakEntry>();
	const firstSeen = new Map<string, number>();
	const winProbability = new Map<string, number[]>();
	const liveExtras = createLiveExtras();
	liveExtras.setRoster(roster);
	const viewers = new Map(scorers.map(scorer => [scorer.name, { lastSwitchTime: 0, switches: 0, voluntarySwitches: 0 } as Viewer]));

	const handle = (event: ReplayEvent): Frame | null => {
		if (event.kind === 'summary') {
			if (event.winProbability.length > 0) winProbability.set(event.gameId, event.winProbability);
			const game = liveByLeague.get(event.league)?.find(live => live.id === event.gameId);
			liveExtras.ingestSummary(game ?? { id: event.gameId, sportType: sportOf(event.league) }, event.raw, event.ts);
			return null;
		}
		if (event.kind === 'situation') {
			const game = liveByLeague.get(event.league)?.find(live => live.id === event.gameId);
			const margin = game ? Math.abs(game.homeTeam.score - game.awayTeam.score) : Infinity;
			if (game && game.league === 'nhl' && !game.intermission && !game.delayed && margin <= (sportTypeConfigMap.hockey?.closenessMargins[2] ?? 3)) liveExtras.ingestSituation(event.gameId, event.raw);
			return null;
		}
		if (event.kind === 'standings') {
			liveExtras.ingestStandings(event.league, sportOf(event.league), event.raw);
			return null;
		}

		const { ts, league, live } = event;
		liveByLeague.set(league, live);
		for (const game of live) if (!firstSeen.has(game.id)) firstSeen.set(game.id, ts);
		for (const game of live) {
			const stall = nextClockStall(game, stalls.get(game.id));
			if (stall) stalls.set(game.id, stall);
			commercialBreaks.set(game.id, nextCommercialBreak(game, commercialBreaks.get(game.id), { now: ts, powerPlay: liveExtras.contextFor(game, ts).powerPlay }));
		}

		const allLive = [...liveByLeague.values()].flat();
		const games = new Map(allLive.map(game => [game.id, game]));
		const rankings = new Map<string, ReplayScore[]>();
		const watching = new Map<string, string | undefined>();
		const switched = new Map<string, boolean>();
		const switchedAway = new Map<string, boolean>();

		for (const scorer of scorers) {
			const scores = allLive.map(game => scorer.score({
				game,
				history: history.get(game.id) ?? [],
				stallCount: stalls.get(game.id)?.stallCount ?? 0,
				onBreak: commercialBreaks.get(game.id)?.kind !== undefined,
				winProbability: winProbability.get(game.id) ?? [],
				now: ts,
				extras: liveExtras.contextFor(game, ts),
			})).toSorted((a, b) => b.total - a.total);
			rankings.set(scorer.name, scores);

			const viewer = viewers.get(scorer.name)!;
			const registry = allLive.map((game, index) => ({ tabId: index + 1, gameId: game.id }));
			const activeTabId = registry.find(tab => tab.gameId === viewer.watching)?.tabId ?? -1;
			const target = chooseSwitchTarget({ registry, scores, activeTabId, sensitivity: prefs.sensitivity, cooldownSeconds: prefs.cooldownSeconds, lastSwitchTime: viewer.lastSwitchTime, now: ts });
			if (target) {
				const away = viewer.watching !== undefined && games.has(viewer.watching);
				if (away) viewer.voluntarySwitches++;
				switchedAway.set(scorer.name, away);
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

		return { ts, league, games, rankings, watching, switched, switchedAway, firstSeen, commercialBreaks };
	};

	return { handle, viewers };
};

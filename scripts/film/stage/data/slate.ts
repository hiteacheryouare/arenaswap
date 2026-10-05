import type { BackgroundState, Game, GuideSlate, LiveScore, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot } from '../../../../packages/core/src/types';
import type { FilmSlate, ScoreEntry, ScoreTotal } from './slateTypes';

// The popup's live charts keep this much history, the same windows as core's scoring config.
const historyWindowMs: Record<string, number> = { basketball: 5 * 60_000, hockey: 16 * 60_000, soccer: 20 * 60_000 };
const windowFor = (game: Game) => historyWindowMs[game.sportType] ?? 12 * 60_000;

export type Profile = 'plain' | 'fan';

const lastAtOrBefore = <T>(entries: [number, T][], ts: number): number => {
	let low = 0;
	let high = entries.length - 1;
	let found = -1;
	while (low <= high) {
		const middle = (low + high) >> 1;
		if (entries[middle]![0] <= ts) {
			found = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}
	return found;
};

const isFull = (value: LiveScore | ScoreTotal): value is LiveScore => 'gameId' in value;

const expandScore = (gameId: string, value: LiveScore | ScoreTotal): LiveScore => (isFull(value) ? value : {
	gameId,
	total: value.total,
	closeness: 0,
	lateGame: 0,
	momentum: 0,
	leadChanges: 0,
	comeback: 0,
	reason: value.reason,
	stalled: value.stalled ?? false,
	signalsSubtotal: value.total,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
} as PowerScoreResult);

// The same flattening background.ts does before it stores a PowerScore snapshot.
const toPowerScoreSnapshot = (score: LiveScore, timestamp: number, newest: boolean): PowerScoreSnapshot => ({
	gameId: score.gameId,
	timestamp,
	total: score.total,
	closeness: score.closeness,
	lateGame: score.lateGame,
	momentum: score.momentum,
	leadChanges: score.leadChanges,
	comeback: score.comeback,
	...(score.winProbabilityVariance !== undefined ? { winProbabilityVariance: score.winProbabilityVariance } : {}),
	signalsSubtotal: score.signalsSubtotal ?? score.total,
	favoriteBonus: score.favoriteBonus ?? 0,
	favoriteTeamCount: score.favoriteTeamCount ?? 0,
	gameBoost: score.gameBoost ?? 0,
	scoringOpportunityBoost: score.scoringOpportunityBoost ?? 0,
	postseasonBoost: score.postseasonBoost ?? 0,
	stalled: score.stalled ?? false,
	reason: score.reason,
	...(score.breakdown ? {
		modeId: score.breakdown.modeId,
		boosts: Object.fromEntries(score.breakdown.boosts.filter(boost => boost.points > 0).map(boost => [boost.id, boost.points])),
		...(newest ? { reasons: score.breakdown.reasons } : {}),
	} : {}),
});

export interface Slate {
	raw: FilmSlate;
	gameAt: (gameId: string, ts: number) => Game | undefined;
	scoreAt: (profile: Profile, gameId: string, ts: number) => LiveScore | undefined;
	stateAt: (profile: Profile, ts: number) => BackgroundState;
	guideAt: (ts: number) => GuideSlate;
	summaryAt: (gameId: string, ts: number) => Record<string, unknown> | undefined;
}

const createSlate = (raw: FilmSlate): Slate => {
	// Every frame of every game, applied once up front, so any moment is a binary search away.
	const states = new Map<string, [number, Game][]>();
	for (const [gameId, track] of Object.entries(raw.games)) {
		const applied: [number, Game][] = [];
		let current = {} as Game;
		for (const [ts, delta] of track.frames) {
			const next = { ...current } as Record<string, unknown>;
			for (const [key, value] of Object.entries(delta)) {
				if (value === null) delete next[key];
				else next[key] = value;
			}
			current = next as unknown as Game;
			applied.push([ts, current]);
		}
		states.set(gameId, applied);
	}

	const gameAt = (gameId: string, ts: number) => {
		const applied = states.get(gameId);
		if (!applied) return undefined;
		const index = lastAtOrBefore(applied, ts);
		return index >= 0 ? applied[index]![1] : undefined;
	};

	const entriesFor = (profile: Profile, gameId: string): ScoreEntry[] => raw.scores[profile]?.[gameId] ?? raw.scores.plain?.[gameId] ?? [];

	const scoreAt = (profile: Profile, gameId: string, ts: number) => {
		const entries = entriesFor(profile, gameId);
		for (let index = lastAtOrBefore(entries, ts); index >= 0; index--) {
			const value = entries[index]![1];
			if (value) return expandScore(gameId, value);
		}
		return undefined;
	};

	const powerScoreHistory = (profile: Profile, game: Game, ts: number): PowerScoreSnapshot[] => {
		const entries = entriesFor(profile, game.id);
		const cutoff = ts - windowFor(game);
		const snapshots: PowerScoreSnapshot[] = [];
		let latest: LiveScore | undefined;
		const end = lastAtOrBefore(entries, ts);
		for (let index = 0; index <= end; index++) {
			const [at, value] = entries[index]!;
			if (value) latest = expandScore(game.id, value);
			if (at >= cutoff && latest) snapshots.push(toPowerScoreSnapshot(latest, at, index === end));
		}
		return snapshots;
	};

	const scoreHistory = (game: Game, ts: number): ScoreSnapshot[] => {
		const applied = states.get(game.id) ?? [];
		const cutoff = ts - windowFor(game);
		const end = lastAtOrBefore(applied, ts);
		const snapshots: ScoreSnapshot[] = [];
		for (let index = 0; index <= end; index++) {
			const [at, state] = applied[index]!;
			if (at >= cutoff && state.status === 'in') snapshots.push({ gameId: game.id, timestamp: at, homeScore: state.homeTeam.score, awayScore: state.awayTeam.score });
		}
		return snapshots;
	};

	const stateAt = (profile: Profile, ts: number): BackgroundState => {
		const games = Object.keys(raw.games)
			.map(gameId => gameAt(gameId, ts))
			.filter((game): game is Game => game !== undefined && game.status !== 'post');
		const live = games.filter(game => game.status === 'in');
		return {
			games,
			scores: live.map(game => scoreAt(profile, game.id, ts)).filter((score): score is LiveScore => score !== undefined),
			leagueLogos: raw.leagueLogos,
			scoreHistory: Object.fromEntries(live.map(game => [game.id, scoreHistory(game, ts)])),
			powerScoreHistory: Object.fromEntries(live.map(game => [game.id, powerScoreHistory(profile, game, ts)])),
			gameBoosts: {},
			onStandbyStream: false,
			standbyStreamTabId: null,
			slateShedLeagues: [],
		};
	};

	const guideAt = (ts: number): GuideSlate => ({
		...raw.guide,
		games: raw.guide.games.map(game => gameAt(game.id, ts) ?? game),
	});

	// The recorded box score from the last moment kept before `ts`, carrying the win probability
	// recorded at `ts` itself.
	const summaryAt = (gameId: string, ts: number) => {
		const summaries = raw.summaries[gameId] ?? [];
		if (summaries.length === 0) return undefined;
		const index = Math.max(0, lastAtOrBefore(summaries, ts));
		const summary = { ...(summaries[index]![1] as Record<string, unknown>) };
		const probabilities = raw.winProbabilities[gameId] ?? [];
		const probability = lastAtOrBefore(probabilities, ts);
		if (probability >= 0) summary.winprobability = probabilities[probability]![1].map(homeWinPercentage => ({ homeWinPercentage }));
		return summary;
	};

	return { raw, gameAt, scoreAt, stateAt, guideAt, summaryAt };
};

export default createSlate;

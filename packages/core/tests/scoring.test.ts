import {
	chooseSwitchTarget,
	getFavoriteTeamCount,
	getHistoryWindowMsForGame,
	maxSnapshotsPerGame,
	nextClockStall,
	recentSnapshots,
	retainSnapshots,
	scoreLiveGame,
	toLegacyPowerScoreResult,
	toScoreSnapshot,
	toScoringGame,
} from '../src/scoring';
import { sensitivityThresholds } from '../src/constants';
import { normalizeScores } from '../src/typeGuards';
import type { ClockStallEntry, ScoringPrefs, SwitchCandidateTab } from '../src/scoring';
import type { Game, PowerScoreResult, ScoreSnapshot, Team } from '../src/types';

const team = (id: string, abbreviation: string, name: string, score: number, extra: Partial<Team> = {}): Team => ({
	id, name, abbreviation, score, ...extra,
});

const chiefsBills = (overrides: Partial<Game> = {}): Game => ({
	id: '401772981',
	league: 'nfl',
	sportType: 'football',
	homeTeam: team('12', 'KC', 'Kansas City Chiefs', 17),
	awayTeam: team('2', 'BUF', 'Buffalo Bills', 24),
	period: 4,
	clockSeconds: 300,
	status: 'in',
	...overrides,
});

const cowboysEagles = (overrides: Partial<Game> = {}): Game => ({
	id: '401772990',
	league: 'nfl',
	sportType: 'football',
	homeTeam: team('6', 'DAL', 'Dallas Cowboys', 38),
	awayTeam: team('21', 'PHI', 'Philadelphia Eagles', 10),
	period: 4,
	clockSeconds: 360,
	status: 'in',
	...overrides,
});

const noPrefs: ScoringPrefs = { favoriteTeamIds: [], favoriteTeamBonusPoints: 10, postseasonBoostPoints: 0, disabledSignals: [] };

const kickoff = Date.UTC(2026, 9, 4, 20, 25);
const pollMs = 15_000;

// What the background worker does on every poll, in its order: stall tracking, then scoring
// against the history gathered so far, then this poll's snapshot is added and the window trimmed.
const createPoller = (prefs: ScoringPrefs, keepWholeGame = false) => {
	const history = new Map<string, ScoreSnapshot[]>();
	const stalls = new Map<string, ClockStallEntry>();
	const poll = (games: Game[], now: number, gameBoosts: Record<string, number> = {}): PowerScoreResult[] => {
		for (const game of games) {
			const stall = nextClockStall(game, stalls.get(game.id));
			if (stall) stalls.set(game.id, stall);
		}
		const scores = games.map(game => toLegacyPowerScoreResult(scoreLiveGame(
			{ game, history: history.get(game.id) ?? [], stallCount: stalls.get(game.id)?.stallCount ?? 0, winProbability: [], now },
			prefs,
			gameBoosts[game.id] ?? 0,
		)));
		for (const game of games) {
			const snapshots = [...(history.get(game.id) ?? []), toScoreSnapshot(game, now)];
			history.set(game.id, retainSnapshots(snapshots, now - getHistoryWindowMsForGame(game), keepWholeGame));
		}
		return scores;
	};
	return { poll, history };
};

describe('translating our sources\' game into the engine\'s', () => {
	// Both situations were transcribed off the live college-football scoreboard on 2026-09-04 (see
	// apiClient.test.ts): the yard line is measured from the home goal line whoever has the ball.
	test('UTEP on its own 18 as the away side is 82 yards from scoring', () => {
		const game = chiefsBills({ possessionTeamId: '2', yardLine: 82, down: 3, distance: 17 });
		expect(toScoringGame(game)).toMatchObject({ possession: 'away', yardsToEndZone: 82, down: 3, distance: 17 });
	});

	test('Stanford at the 94 as the home side is 6 yards from scoring', () => {
		const game = chiefsBills({ possessionTeamId: '12', yardLine: 94, down: 4, distance: 6, isGoalToGo: true, isRedZone: true });
		expect(toScoringGame(game)).toMatchObject({ possession: 'home', yardsToEndZone: 6, isRedZone: true, isGoalToGo: true });
	});

	test('a possession id that matches neither team leaves possession and field position unknown', () => {
		const scoring = toScoringGame(chiefsBills({ possessionTeamId: '99999', yardLine: 40 }));
		expect(scoring.possession).toBeUndefined();
		expect(scoring.yardsToEndZone).toBeUndefined();
	});

	test('a bracket seed is not passed off as a poll ranking', () => {
		const marchMadness: Partial<Game> = {
			league: 'ncaab',
			sportType: 'basketball',
			homeTeam: team('2250', 'GONZ', 'Gonzaga Bulldogs', 61, { rank: 3 }),
			awayTeam: team('2305', 'KU', 'Kansas Jayhawks', 58, { rank: 6 }),
		};
		const seeded = toScoringGame(chiefsBills({ ...marchMadness, collegeSeeded: true }));
		const polled = toScoringGame(chiefsBills(marchMadness));
		expect(seeded.homeTeam.rank).toBeUndefined();
		expect(seeded.awayTeam.rank).toBeUndefined();
		expect(polled.homeTeam.rank).toBe(3);
		expect(polled.awayTeam.rank).toBe(6);
	});

	test('a baseball count hands the engine its outs and nothing else', () => {
		const game = chiefsBills({
			league: 'mlb',
			sportType: 'baseball',
			period: 9,
			topOfInning: false,
			bso: { balls: 3, strikes: 2, outs: 2 },
			baseRunners: { first: true, second: true, third: true },
		});
		const scoring = toScoringGame(game);
		expect(scoring.outs).toBe(2);
		expect(scoring.baseRunners).toEqual({ first: true, second: true, third: true });
		expect(scoring.topOfInning).toBe(false);
	});

	test('carries timeouts and abbreviations, and drops an empty abbreviation', () => {
		const scoring = toScoringGame(chiefsBills({
			homeTeam: team('12', 'KC', 'Kansas City Chiefs', 24, { timeouts: 2 }),
			awayTeam: team('2', '', 'Buffalo Bills', 24, { timeouts: 0 }),
		}));
		expect(scoring.homeTeam).toEqual({ score: 24, abbreviation: 'KC', timeouts: 2 });
		expect(scoring.awayTeam).toEqual({ score: 24, timeouts: 0 });
	});
});

describe('a fourth quarter in Kansas City, poll by poll', () => {
	// Buffalo leads by seven with five minutes left; Kansas City ties it at 3:30, the clock sits at
	// the two-minute warning through a long TV break, then the Chiefs drive into the red zone.
	const chiefsAtPoll = (poll: number): Game => {
		if (poll <= 5) return chiefsBills({ clockSeconds: 300 - poll * 15, possessionTeamId: '2', yardLine: 60, down: 1, distance: 10 });
		const tied = { homeTeam: team('12', 'KC', 'Kansas City Chiefs', 24, { timeouts: 2 }), awayTeam: team('2', 'BUF', 'Buffalo Bills', 24, { timeouts: 3 }) };
		if (poll <= 12) return chiefsBills({ ...tied, clockSeconds: 210 - (poll - 6) * 15, possessionTeamId: '2', yardLine: 70, down: 2, distance: 6 });
		if (poll <= 23) return chiefsBills({ ...tied, clockSeconds: 120, possessionTeamId: '2', yardLine: 55, down: 3, distance: 4 });
		const clockSeconds = 115 - (poll - 24) * 12.5;
		if (poll < 30) return chiefsBills({ ...tied, clockSeconds, possessionTeamId: '12', yardLine: 50 + (poll - 24) * 6, down: 1, distance: 10 });
		return chiefsBills({ ...tied, clockSeconds: 40, possessionTeamId: '12', yardLine: 88, down: 3, distance: 2, isRedZone: true });
	};
	const cowboysAtPoll = (poll: number): Game => cowboysEagles({ clockSeconds: Math.max(0, 360 - poll * 15) });

	const registry: SwitchCandidateTab[] = [
		{ tabId: 11, gameId: '401772981' },
		{ tabId: 21, gameId: '401772990' },
		{ tabId: 12, gameId: '401772981' },
	];

	const watch = () => {
		const { poll } = createPoller(noPrefs);
		let activeTabId = 21;
		let lastSwitchTime = 0;
		const switches: Array<{ poll: number; tabId: number }> = [];
		const chiefs: PowerScoreResult[] = [];
		const cowboys: PowerScoreResult[] = [];
		for (let i = 0; i <= 30; i++) {
			const now = kickoff + i * pollMs;
			const [kc, dal] = poll([chiefsAtPoll(i), cowboysAtPoll(i)], now);
			chiefs.push(kc!);
			cowboys.push(dal!);
			const target = chooseSwitchTarget({ registry, scores: [kc!, dal!], activeTabId, sensitivity: 4, cooldownSeconds: 60, lastSwitchTime, now });
			if (target) {
				switches.push({ poll: i, tabId: target.tabId });
				activeTabId = target.tabId;
				lastSwitchTime = now;
			}
		}
		return { switches, chiefs, cowboys, activeTabId };
	};

	test('leaves the blowout for the one-score game at once, then stays there the whole quarter', () => {
		const { switches, activeTabId } = watch();
		expect(switches).toEqual([{ poll: 0, tabId: 11 }]);
		expect(activeTabId).toBe(11);
	});

	test('rates the game higher the moment it is tied', () => {
		const { chiefs } = watch();
		expect(chiefs[6]!.total).toBeGreaterThan(chiefs[5]!.total);
		expect(chiefs[6]!.closeness).toBeGreaterThan(chiefs[5]!.closeness);
	});

	test('docks the game through a long break at the two-minute warning and restores it when play resumes', () => {
		const { chiefs } = watch();
		expect(chiefs[19]!.stalled).toBe(false);
		expect(chiefs[20]!.stalled).toBe(true);
		expect(chiefs[20]!.stallPenalty).toBe(15);
		expect(chiefs[20]!.total).toBeLessThanOrEqual(chiefs[19]!.total - 10);
		expect(chiefs[24]!.stalled).toBe(false);
		expect(chiefs[24]!.stallPenalty).toBe(0);
	});

	test('pays the red-zone boost on third and short with the game tied in the final minute', () => {
		const { chiefs, cowboys } = watch();
		const redZone = chiefs[30]!;
		expect(redZone.scoringOpportunityBoost).toBe(12);
		expect(redZone.total).toBeGreaterThan(90);
		expect(redZone.total - cowboys[30]!.total).toBeGreaterThan(sensitivityThresholds[1]!);
	});
});

describe('the history the scorer sees', () => {
	const nuggetsSuns = (home: number, away: number, clockSeconds: number): Game => ({
		id: '401810001',
		league: 'nba',
		sportType: 'basketball',
		homeTeam: team('7', 'DEN', 'Denver Nuggets', home),
		awayTeam: team('21', 'PHX', 'Phoenix Suns', away),
		period: 3,
		clockSeconds,
		status: 'in',
	});

	// Twenty minutes of polls: Denver's 12-0 run comes in the first five, then both sides trade
	// baskets evenly.
	const playThirdQuarter = (keepWholeGame: boolean) => {
		const { poll, history } = createPoller(noPrefs, keepWholeGame);
		let home = 60;
		let away = 62;
		let last: PowerScoreResult | undefined;
		for (let i = 0; i < 80; i++) {
			if (i < 20 && i % 3 === 0) home += 2;
			if (i >= 20 && i % 6 === 0) home += 2;
			if (i >= 20 && i % 6 === 3) away += 2;
			last = poll([nuggetsSuns(home, away, Math.max(0, 720 - i * 9))], kickoff + i * pollMs)[0];
		}
		return { last: last!, retained: history.get('401810001')! };
	};

	test('a run that ended fifteen minutes ago no longer reads as momentum, even with the whole game kept for charts', () => {
		const keptForCharts = playThirdQuarter(true);
		const windowOnly = playThirdQuarter(false);
		expect(keptForCharts.retained.length).toBeGreaterThan(windowOnly.retained.length);
		expect(keptForCharts.last.momentum).toBe(0);
		expect(keptForCharts.last).toEqual(windowOnly.last);
	});

	test('after a long gap in polling the scorer still sees the current score but no stale history', () => {
		const old: ScoreSnapshot[] = [
			{ gameId: 'g', timestamp: kickoff, homeScore: 50, awayScore: 40 },
			{ gameId: 'g', timestamp: kickoff + 15_000, homeScore: 52, awayScore: 40 },
		];
		expect(recentSnapshots(old, kickoff + 3_600_000)).toEqual([old[1]]);
	});
});

describe('keeping a whole game for the wrap screen', () => {
	const pollFootballGame = (hours: number, intervalMs: number, keepWholeGame: boolean) => {
		const game = chiefsBills();
		const windowMs = getHistoryWindowMsForGame(game);
		let retained: ScoreSnapshot[] = [];
		let now = kickoff;
		const end = kickoff + hours * 3_600_000;
		for (; now <= end; now += intervalMs) {
			retained = retainSnapshots([...retained, toScoreSnapshot(game, now)], now - windowMs, keepWholeGame);
		}
		return { retained, cutoff: now - intervalMs - windowMs, last: now - intervalMs };
	};

	test('without it, only the scorer\'s window survives', () => {
		const { retained, cutoff, last } = pollFootballGame(3, pollMs, false);
		expect(retained.every(snapshot => snapshot.timestamp >= cutoff)).toBe(true);
		expect(retained[retained.length - 1]!.timestamp).toBe(last);
	});

	test('with it, kickoff survives, the live window is untouched, and the rest is thinned to two-minute spacing', () => {
		const { retained, cutoff, last } = pollFootballGame(3.5, pollMs, true);
		const coarse = retained.filter(snapshot => snapshot.timestamp < cutoff);
		const recent = retained.filter(snapshot => snapshot.timestamp >= cutoff);
		expect(retained[0]!.timestamp).toBe(kickoff);
		expect(recent.map(snapshot => snapshot.timestamp)).toEqual(
			Array.from({ length: recent.length }, (_, index) => last - (recent.length - 1 - index) * pollMs),
		);
		expect(recent.length).toBe(getHistoryWindowMsForGame(chiefsBills()) / pollMs + 1);
		for (let i = 1; i < coarse.length; i++) expect(coarse[i]!.timestamp - coarse[i - 1]!.timestamp).toBeGreaterThanOrEqual(120_000);
		expect(retained.length).toBeLessThanOrEqual(maxSnapshotsPerGame);
	});

	test('a marathon session hits the cap by thinning the tail, never by losing kickoff or the live window', () => {
		const { retained, cutoff } = pollFootballGame(16, 6_000, true);
		const recent = retained.filter(snapshot => snapshot.timestamp >= cutoff);
		expect(retained.length).toBeLessThanOrEqual(maxSnapshotsPerGame);
		expect(retained[0]!.timestamp).toBe(kickoff);
		expect(recent.length).toBe(getHistoryWindowMsForGame(chiefsBills()) / 6_000 + 1);
	});

	test('a game whose every snapshot predates the window still reports its current score', () => {
		const stale: ScoreSnapshot[] = [
			{ gameId: 'g', timestamp: kickoff, homeScore: 0, awayScore: 0 },
			{ gameId: 'g', timestamp: kickoff + 600_000, homeScore: 7, awayScore: 0 },
		];
		const retained = retainSnapshots(stale, kickoff + 7_200_000, true);
		expect(retained[0]).toEqual(stale[0]);
		expect(retained[retained.length - 1]).toEqual(stale[1]);
	});
});

describe('clock stalls', () => {
	test('a sport with no clock never stalls', () => {
		const game = chiefsBills({ league: 'mlb', sportType: 'baseball', period: 7, clockSeconds: 0 });
		expect(nextClockStall(game, undefined)).toBeUndefined();
		expect(nextClockStall(game, { lastClock: 0, stallCount: 30 })).toBeUndefined();
	});
});

describe('favorite teams', () => {
	test('count per league, so the same team id in another league is not a favorite', () => {
		const game = chiefsBills();
		expect(getFavoriteTeamCount(game, new Set(['nfl:12']))).toBe(1);
		expect(getFavoriteTeamCount(game, new Set(['nfl:12', 'nfl:2']))).toBe(2);
		expect(getFavoriteTeamCount(game, new Set(['nba:12', 'mlb:2']))).toBe(0);
	});

	test('reach the score the popup reads as a bonus with its team count', () => {
		const prefs: ScoringPrefs = { ...noPrefs, favoriteTeamIds: ['nfl:12', 'nba:2'], favoriteTeamBonusPoints: 8 };
		const result = toLegacyPowerScoreResult(scoreLiveGame(
			{ game: chiefsBills({ period: 2, clockSeconds: 600 }), history: [], stallCount: 0, winProbability: [], now: kickoff },
			prefs,
			0,
		));
		expect(result.favoriteBonus).toBe(8);
		expect(result.favoriteTeamCount).toBe(1);
		expect(result.reason).toMatch(/favorite bonus \(\+8\)/);
	});
});

describe('the flat score the popup reads', () => {
	const tiedRedZone = chiefsBills({
		homeTeam: team('12', 'KC', 'Kansas City Chiefs', 24, { timeouts: 1 }),
		awayTeam: team('2', 'BUF', 'Buffalo Bills', 24),
		clockSeconds: 30,
		possessionTeamId: '12',
		yardLine: 92,
		down: 4,
		distance: 8,
		isGoalToGo: true,
		isRedZone: true,
	});

	test('matches the full score field for field', () => {
		const prefs: ScoringPrefs = { ...noPrefs, favoriteTeamIds: ['nfl:2'], favoriteTeamBonusPoints: 10 };
		const input = { game: tiedRedZone, history: [], stallCount: 0, winProbability: [], now: kickoff };
		const full = scoreLiveGame(input, prefs, 25);
		const flat = toLegacyPowerScoreResult(full);
		expect(flat.total).toBe(full.total);
		expect(flat.total).toBeGreaterThan(100);
		expect(flat.gameBoost).toBe(25);
		expect(flat.favoriteBonus).toBe(10);
		expect(flat.favoriteTeamCount).toBe(1);
		expect(flat.signalsSubtotal).toBe(full.scaledSubtotal);
		expect(flat.closeness + flat.lateGame + flat.momentum + flat.leadChanges + flat.comeback).toBe(full.signalsSubtotal);
		expect(flat.reason).toBe(full.reason);
	});

	test('survives the trip to the popup unchanged, boosted past 100 or frozen at halftime', () => {
		const prefs: ScoringPrefs = { ...noPrefs, favoriteTeamIds: ['nfl:2'] };
		const live = toLegacyPowerScoreResult(scoreLiveGame({ game: tiedRedZone, history: [], stallCount: 9, winProbability: [], now: kickoff }, prefs, 25));
		const halftime = toLegacyPowerScoreResult(scoreLiveGame(
			{ game: chiefsBills({ period: 2, clockSeconds: 0, intermission: true }), history: [], stallCount: 30, winProbability: [], now: kickoff },
			prefs,
			25,
		));
		expect(halftime.total).toBe(0);
		expect(halftime).not.toHaveProperty('stallPenalty');
		expect(halftime.favoriteTeamCount).toBe(1);

		const received = normalizeScores(JSON.parse(JSON.stringify([live, halftime])));
		expect(received).toEqual([live, halftime]);
	});

	test('a switched-off signal reads as zero while the subtotal carries the rescale', () => {
		const prefs: ScoringPrefs = { ...noPrefs, disabledSignals: ['closeness'] };
		const flat = toLegacyPowerScoreResult(scoreLiveGame({ game: tiedRedZone, history: [], stallCount: 0, winProbability: [], now: kickoff }, prefs, 0));
		const rawSum = flat.closeness + flat.lateGame + flat.momentum + flat.leadChanges + flat.comeback;
		expect(flat.closeness).toBe(0);
		expect(flat.signalsSubtotal).toBeGreaterThan(rawSum);
	});
});

describe('choosing when to switch tabs', () => {
	const tabs: SwitchCandidateTab[] = [
		{ tabId: 1, gameId: 'kc-buf' },
		{ tabId: 2, gameId: 'dal-phi' },
		{ tabId: 3, gameId: 'kc-buf' },
	];
	const now = kickoff + 3_600_000;
	const decide = (overrides: Partial<Parameters<typeof chooseSwitchTarget>[0]> = {}) => chooseSwitchTarget({
		registry: tabs,
		scores: [{ gameId: 'kc-buf', total: 70, reason: 'tied — overtime looming' }, { gameId: 'dal-phi', total: 40 }],
		activeTabId: 2,
		sensitivity: 4,
		cooldownSeconds: 60,
		lastSwitchTime: 0,
		now,
		...overrides,
	});

	test.each(Object.entries(sensitivityThresholds))('sensitivity %s switches at a lead of exactly %i and not one point short', (level, threshold) => {
		const sensitivity = Number(level) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
		const atThreshold = [{ gameId: 'kc-buf', total: 40 + threshold }, { gameId: 'dal-phi', total: 40 }];
		const shortOfIt = [{ gameId: 'kc-buf', total: 39 + threshold }, { gameId: 'dal-phi', total: 40 }];
		expect(decide({ sensitivity, scores: atThreshold })).toEqual({ tabId: 1, gameId: 'kc-buf' });
		expect(decide({ sensitivity, scores: shortOfIt })).toBeNull();
	});

	test('carries the reason so the notification can say why', () => {
		expect(decide()).toEqual({ tabId: 1, gameId: 'kc-buf', reason: 'tied — overtime looming' });
	});

	test('holds off until the cooldown has fully passed', () => {
		expect(decide({ lastSwitchTime: now - 30_000 })).toBeNull();
		expect(decide({ lastSwitchTime: now - 60_000 })).toBeNull();
		expect(decide({ lastSwitchTime: now - 61_000 })).not.toBeNull();
		expect(decide({ cooldownSeconds: 0, lastSwitchTime: now })).not.toBeNull();
	});

	test('with no game tab in focus, the best live game wins without clearing the threshold', () => {
		const scores = [{ gameId: 'kc-buf', total: 3 }, { gameId: 'dal-phi', total: 1 }];
		expect(decide({ activeTabId: 999, scores, sensitivity: 1 })).toEqual({ tabId: 1, gameId: 'kc-buf' });
	});

	test('with no game tab in focus, a slate frozen at halftime leaves the user where they are', () => {
		const scores = [{ gameId: 'kc-buf', total: 0 }, { gameId: 'dal-phi', total: 0 }];
		expect(decide({ activeTabId: 999, scores })).toBeNull();
	});

	test('never moves the user between two tabs of the game they are already watching', () => {
		expect(decide({ activeTabId: 3 })).toBeNull();
		expect(decide({ activeTabId: 1 })).toBeNull();
	});

	test('ignores scores for games that have no open tab', () => {
		const scores = [{ gameId: 'nyj-mia', total: 99 }, { gameId: 'kc-buf', total: 45 }, { gameId: 'dal-phi', total: 40 }];
		expect(decide({ scores })).toBeNull();
		expect(decide({ registry: [], scores })).toBeNull();
	});

	test('a tab whose game has gone final counts as a zero that a live game has to clear', () => {
		expect(decide({ scores: [{ gameId: 'kc-buf', total: 37 }], sensitivity: 1 })).toEqual({ tabId: 1, gameId: 'kc-buf' });
		expect(decide({ scores: [{ gameId: 'kc-buf', total: 36 }], sensitivity: 1 })).toBeNull();
	});
});

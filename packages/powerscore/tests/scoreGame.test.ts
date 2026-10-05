import {
	boostPoints,
	defineMode,
	renderReasonsEnglish,
	scoreGame,
	scoreMaxTotal,
	signalPoints,
} from '../src';
import type {
	BoostDefinition,
	Game,
	PowerScoreMode,
	ReasonFragment,
	ScoreSnapshot,
	ScoringContext,
	SignalDefinition,
} from '../src';

const fixedSignal = (id: string, ceiling: number, points: number, reason?: ReasonFragment): SignalDefinition => ({
	id,
	ceiling,
	compute: () => (reason ? { points, reason } : { points }),
});

const fixedBoost = (id: string, points: number): BoostDefinition => ({ id, compute: () => ({ points }) });

const testMode = (overrides: Partial<PowerScoreMode> = {}): PowerScoreMode => defineMode({
	id: 'test-mode',
	signals: [fixedSignal('alpha', 50, 30), fixedSignal('beta', 50, 20)],
	boosts: [],
	reasonPriority: ['alpha', 'beta'],
	reasonLimit: 2,
	usesStallPenalty: false,
	usesWinProbability: false,
	...overrides,
});

const thirdQuarter = (overrides: Partial<Game> = {}): Game => ({
	id: 'bos-mia',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { abbreviation: 'BOS', score: 81 },
	awayTeam: { abbreviation: 'MIA', score: 77 },
	period: 3,
	clockSeconds: 300,
	status: 'in',
	...overrides,
});

// Denver erase a nine-point deficit and tie it with 40 seconds left.
const tiedFinalMinute = (): Game => ({
	id: 'den-phx',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { abbreviation: 'DEN', score: 98 },
	awayTeam: { abbreviation: 'PHX', score: 98 },
	period: 4,
	clockSeconds: 40,
	status: 'in',
});

const pollStart = Date.UTC(2026, 9, 3, 2, 10);

const snapshots = (gameId: string, rows: Array<[number, number]>, start = pollStart): ScoreSnapshot[] => (
	rows.map(([homeScore, awayScore], index) => ({ gameId, timestamp: start + index * 20_000, homeScore, awayScore }))
);

const denverRun = (start = pollStart): ScoringContext => ({
	history: snapshots('den-phx', [[87, 96], [91, 96], [93, 98], [96, 98], [98, 98]], start),
});

const balancedLine = [0.48, 0.52, 0.5, 0.47, 0.53, 0.5];
const lopsidedLine = [0.95, 0.96, 0.97, 0.97, 0.98, 0.98];

describe('a custom mode scores a game with its own signals', () => {
	test('reports its own id and adds up only its own signals', () => {
		const score = scoreGame(thirdQuarter(), {}, { mode: testMode() });
		expect(score.modeId).toBe('test-mode');
		expect(score.signals.map(signal => signal.id)).toEqual(['alpha', 'beta']);
		expect(score.signalCeiling).toBe(100);
		expect(score.total).toBe(50);
	});

	test('clamps each signal to the ceiling it declared and rounds it to a whole point', () => {
		const mode = testMode({
			signals: [fixedSignal('alpha', 50, 80), fixedSignal('beta', 30, -10), fixedSignal('gamma', 20, 12.6)],
		});
		const score = scoreGame(thirdQuarter(), {}, { mode });
		expect(score.signals.map(signal => signal.points)).toEqual([50, 0, 13]);
		expect(score.total).toBe(63);
	});

	test('refuses a mode that could never be scored', () => {
		expect(() => testMode({ signals: [fixedSignal('alpha', 50, 1), fixedSignal('alpha', 50, 1)] })).toThrow(/twice/);
		expect(() => testMode({ signals: [fixedSignal('alpha', 0, 0)] })).toThrow(/positive ceiling/);
		expect(() => testMode({ signals: [] })).toThrow(/no signals/);
	});
});

describe('switching signals off', () => {
	test('rescales the survivors to the mode\'s own ceiling, not to 100', () => {
		const mode = testMode({ signals: [fixedSignal('alpha', 30, 20), fixedSignal('beta', 30, 30)] });
		const score = scoreGame(thirdQuarter(), {}, { mode, disabledSignals: ['beta'] });
		expect(score.signals.find(signal => signal.id === 'beta')).toEqual({ id: 'beta', points: 0, ceiling: 30, disabled: true });
		expect(score.signalsSubtotal).toBe(20);
		expect(score.scaledSubtotal).toBe(40);
		expect(score.total).toBe(40);
	});

	test('switching every signal off switches none of them off', () => {
		const everything = ['closeness', 'lateGame', 'momentum', 'leadChanges', 'comeback'];
		const allOff = scoreGame(tiedFinalMinute(), denverRun(), { disabledSignals: everything });
		const allOn = scoreGame(tiedFinalMinute(), denverRun());
		expect(allOff.signals.every(signal => !signal.disabled)).toBe(true);
		expect(allOff.total).toBe(allOn.total);
		expect(allOff.reasons).toEqual(allOn.reasons);
	});

	test('drops a switched-off signal\'s reason and lets the next one take its place', () => {
		const allOn = scoreGame(tiedFinalMinute(), denverRun());
		expect(allOn.reasons.map(reason => reason.key)).toEqual(['outscoring', 'cuttingIn']);

		const noMomentum = scoreGame(tiedFinalMinute(), denverRun(), { disabledSignals: ['momentum'] });
		expect(noMomentum.reasons.map(reason => reason.key)).toEqual(['cuttingIn', 'overtimeLooming']);
		expect(noMomentum.reason).not.toMatch(/outscoring/);
	});

	test('scales the stall penalty with the subtotal so a stalled game keeps its proportion', () => {
		const mode = testMode({ signals: [fixedSignal('alpha', 50, 40), fixedSignal('beta', 50, 0)], usesStallPenalty: true });
		const allOn = scoreGame(thirdQuarter(), { stallCount: 8 }, { mode });
		const betaOff = scoreGame(thirdQuarter(), { stallCount: 8 }, { mode, disabledSignals: ['beta'] });
		expect(allOn.stallPenalty).toBe(15);
		expect(allOn.baseTotal).toBe(25);
		expect(betaOff.stallPenalty).toBe(30);
		expect(betaOff.baseTotal).toBe(50);
	});
});

describe('the stall penalty and the win-probability line', () => {
	test('a mode that opts out of the stall penalty ignores a frozen clock', () => {
		const score = scoreGame(thirdQuarter(), { stallCount: 20 }, { mode: testMode() });
		expect(score.stalled).toBe(false);
		expect(score.stallPenalty).toBe(0);
		expect(score.total).toBe(50);
	});

	test('a mode that opts out of win probability ignores the line entirely', () => {
		const optedOut = scoreGame(thirdQuarter(), { winProbability: balancedLine }, { mode: testMode() });
		const optedIn = scoreGame(thirdQuarter(), { winProbability: balancedLine }, { mode: testMode({ usesWinProbability: true }) });
		expect(optedOut.winProbabilityVariance).toBeUndefined();
		expect(optedOut.total).toBe(50);
		expect(optedIn.winProbabilityVariance).toBe(5);
		expect(optedIn.total).toBe(55);
	});

	test('a coin-flip line still lifts a game the stall penalty has floored', () => {
		const mode = testMode({ signals: [fixedSignal('alpha', 100, 10)], usesStallPenalty: true, usesWinProbability: true });
		const balanced = scoreGame(thirdQuarter(), { stallCount: 8, winProbability: balancedLine }, { mode });
		const lopsided = scoreGame(thirdQuarter(), { stallCount: 8, winProbability: lopsidedLine }, { mode });
		expect(balanced.stallPenalty).toBe(15);
		expect(balanced.baseTotal).toBe(5);
		expect(lopsided.winProbabilityVariance).toBe(-5);
		expect(lopsided.baseTotal).toBe(0);
	});

	test('the line cannot lift a maxed-out game past 100 before any boost', () => {
		const mode = testMode({ signals: [fixedSignal('alpha', 100, 100)], usesWinProbability: true });
		const score = scoreGame(thirdQuarter(), { winProbability: balancedLine }, { mode });
		expect(score.baseTotal).toBe(scoreMaxTotal);
		expect(score.total).toBe(scoreMaxTotal);
	});
});

describe('boosts stack in a fixed order', () => {
	const ninety = () => testMode({ signals: [fixedSignal('alpha', 50, 50), fixedSignal('beta', 50, 40)] });

	test('a mode\'s own boosts fill a game up to 100 and no further', () => {
		const score = scoreGame(thirdQuarter(), {}, { mode: { ...ninety(), boosts: [fixedBoost('rally', 25)] } });
		expect(boostPoints(score, 'rally')).toBe(25);
		expect(score.total).toBe(100);
	});

	test('a mode boost that comes back negative takes nothing away', () => {
		const score = scoreGame(thirdQuarter(), {}, { mode: { ...ninety(), boosts: [fixedBoost('rally', -20)] } });
		expect(boostPoints(score, 'rally')).toBe(0);
		expect(score.total).toBe(90);
	});

	test('favorite and postseason points share the same 100 ceiling as the mode\'s boosts', () => {
		const score = scoreGame(thirdQuarter({ postseasonRound: 0 }), {}, {
			mode: { ...ninety(), boosts: [fixedBoost('rally', 5)] },
			favoriteTeamCount: 2,
			favoriteBoostPoints: 10,
			postseasonBoostPoints: 20,
		});
		expect(boostPoints(score, 'favoriteBoost')).toBe(20);
		expect(boostPoints(score, 'postseasonBoost')).toBe(20);
		expect(score.total).toBe(100);
	});

	test('only the manual game boost carries a game past 100', () => {
		const score = scoreGame(thirdQuarter(), {}, {
			mode: { ...ninety(), boosts: [fixedBoost('rally', 25)] },
			favoriteTeamCount: 1,
			favoriteBoostPoints: 10,
			gameBoost: 15,
		});
		expect(score.total).toBe(115);
		expect(score.boosts.map(boost => boost.id)).toEqual(['favoriteBoost', 'gameBoost', 'rally']);
	});
});

describe('blending a mode with Classic', () => {
	// A mode with almost nothing to say about a tied finish, which Classic rates highly.
	const indifferent = (overrides: Partial<PowerScoreMode> = {}) => testMode({
		signals: [fixedSignal('alpha', 50, 10), fixedSignal('beta', 50, 0)],
		...overrides,
	});
	const classicTotal = () => scoreGame(tiedFinalMinute(), denverRun()).total;

	test('the tied finish is one Classic rates far above the indifferent mode', () => {
		expect(classicTotal()).toBeGreaterThan(60);
	});

	test('a floor keeps a game the mode ignores in the running', () => {
		const score = scoreGame(tiedFinalMinute(), denverRun(), { mode: indifferent({ classicBlend: { kind: 'floor', factor: 0.8 } }) });
		expect(score.classicTotal).toBe(classicTotal());
		expect(score.total).toBe(Math.round(0.8 * classicTotal()));
		expect(score.modeId).toBe('test-mode');
	});

	test('a floor never drags down a game the mode rates highly', () => {
		const keen = testMode({ signals: [fixedSignal('alpha', 50, 50), fixedSignal('beta', 50, 48)], classicBlend: { kind: 'floor', factor: 0.5 } });
		expect(scoreGame(tiedFinalMinute(), denverRun(), { mode: keen }).total).toBe(98);
	});

	test('a mix weighs the mode against Classic', () => {
		const score = scoreGame(tiedFinalMinute(), denverRun(), { mode: indifferent({ classicBlend: { kind: 'mix', weight: 0.25 } }) });
		expect(score.total).toBe(Math.round(0.25 * 10 + 0.75 * classicTotal()));
	});

	test('a caller\'s blend, like a user\'s slider, overrides the mode\'s own', () => {
		const mode = indifferent({ classicBlend: { kind: 'floor', factor: 0.8 } });
		const score = scoreGame(tiedFinalMinute(), denverRun(), { mode, classicBlend: { kind: 'mix', weight: 1 } });
		expect(score.total).toBe(10);
	});

	test('blend factors outside 0 to 1 are held to the range', () => {
		const overFloor = scoreGame(tiedFinalMinute(), denverRun(), { mode: indifferent(), classicBlend: { kind: 'floor', factor: 3 } });
		const underMix = scoreGame(tiedFinalMinute(), denverRun(), { mode: indifferent(), classicBlend: { kind: 'mix', weight: -2 } });
		expect(overFloor.total).toBe(classicTotal());
		expect(underMix.total).toBe(classicTotal());
	});

	test('classicDisabledSignals shape the blended Classic run and nothing else', () => {
		const score = scoreGame(thirdQuarter(), {}, {
			mode: indifferent(),
			classicBlend: { kind: 'mix', weight: 0 },
			classicDisabledSignals: ['closeness'],
		});
		const classicWithoutCloseness = scoreGame(thirdQuarter(), {}, { disabledSignals: ['closeness'] }).total;
		expect(classicWithoutCloseness).not.toBe(scoreGame(thirdQuarter()).total);
		expect(score.total).toBe(classicWithoutCloseness);
		expect(score.signals.every(signal => !signal.disabled)).toBe(true);
	});

	test('favorite points land after the blend rather than being blended away', () => {
		const score = scoreGame(tiedFinalMinute(), denverRun(), {
			mode: indifferent({ classicBlend: { kind: 'mix', weight: 0.5 } }),
			favoriteTeamCount: 1,
			favoriteBoostPoints: 10,
		});
		expect(score.total).toBe(Math.min(100, Math.round(0.5 * 10 + 0.5 * classicTotal()) + 10));
	});

	test('Classic does not blend with itself', () => {
		const score = scoreGame(tiedFinalMinute(), denverRun(), { mode: 'classic', classicBlend: { kind: 'mix', weight: 0 } });
		expect(score.classicTotal).toBeUndefined();
		expect(score.total).toBe(classicTotal());
	});
});

const hasRosteredPlayer = (_game: Game<string>, context: ScoringContext) => (context.fantasy ?? []).some(player => player.active !== false);

describe('a mode that has nothing to say about a game', () => {
	const rosterMode = (appliesTo: PowerScoreMode['appliesTo']) => testMode({
		id: 'roster',
		appliesTo,
		classicBlend: { kind: 'floor', factor: 0.5 },
	});

	test('hands the game to Classic and reports Classic as the mode that scored it', () => {
		const score = scoreGame(tiedFinalMinute(), denverRun(), { mode: rosterMode(hasRosteredPlayer) });
		const classic = scoreGame(tiedFinalMinute(), denverRun());
		expect(score.modeId).toBe('classic');
		expect(score.classicTotal).toBeUndefined();
		expect(score.signals.map(signal => signal.id)).toEqual(classic.signals.map(signal => signal.id));
		expect(score.total).toBe(classic.total);
	});

	test('scores the game itself once a player it cares about is on the floor', () => {
		const context: ScoringContext = { ...denverRun(), fantasy: [{ id: 'jokic', side: 'home', position: 'player', pointEvents: [{ at: 0, points: 41 }] }] };
		const score = scoreGame(tiedFinalMinute(), context, { mode: rosterMode(hasRosteredPlayer) });
		expect(score.modeId).toBe('roster');
		expect(score.classicTotal).toBeDefined();
	});

	test('a player ruled out of the game no longer counts', () => {
		const context: ScoringContext = { ...denverRun(), fantasy: [{ id: 'jokic', side: 'home', position: 'player', active: false }] };
		expect(scoreGame(tiedFinalMinute(), context, { mode: rosterMode(hasRosteredPlayer) }).modeId).toBe('classic');
	});
});

describe('a game with play stopped', () => {
	test('halftime zeroes a custom mode but keeps the shape a breakdown draws', () => {
		const mode = testMode({ boosts: [fixedBoost('rally', 25)] });
		const score = scoreGame(thirdQuarter({ intermission: true }), {}, {
			mode,
			disabledSignals: ['beta'],
			favoriteTeamCount: 2,
			favoriteBoostPoints: 10,
			gameBoost: 15,
		});
		expect(score.frozen).toBe(true);
		expect(score.total).toBe(0);
		expect(score.signals).toEqual([
			{ id: 'alpha', points: 0, ceiling: 50, disabled: false },
			{ id: 'beta', points: 0, ceiling: 50, disabled: true },
		]);
		expect(score.boosts).toEqual([
			{ id: 'favoriteBoost', points: 0, meta: { teams: 2 } },
			{ id: 'gameBoost', points: 0 },
			{ id: 'rally', points: 0 },
		]);
		expect(score.reasons).toEqual([]);
		expect(score.reason).toBe('');
	});

	test('a weather delay freezes a blended mode before Classic is consulted', () => {
		const mode = testMode({ classicBlend: { kind: 'floor', factor: 1 } });
		const score = scoreGame({ ...tiedFinalMinute(), delayed: true }, denverRun(), { mode });
		expect(score.total).toBe(0);
		expect(score.classicTotal).toBeUndefined();
	});
});

describe('reasons', () => {
	test('each fragment carries what a translation needs, and the English line is built from them', () => {
		const score = scoreGame(tiedFinalMinute(), denverRun(), { favoriteTeamCount: 1, favoriteBoostPoints: 10 });
		expect(score.reasons[0]).toEqual({ key: 'outscoring', params: { team: 'DEN', other: 'PHX', scoredFor: 11, scoredAgainst: 2 } });
		expect(score.reasons[1]).toEqual({ key: 'cuttingIn', params: { team: 'DEN' } });
		expect(score.reasons[score.reasons.length - 1]).toEqual({ key: 'favoriteBoost', params: { points: 10 } });
		expect(score.reason).toBe(renderReasonsEnglish(score.reasons));
		expect(score.reason).toBe('DEN outscoring PHX 11-2, DEN cutting into it, favorite bonus (+10)');
	});

	test('a custom mode\'s reasons follow its priority rather than its signal order, and stop at its limit', () => {
		const mode = testMode({
			signals: [
				fixedSignal('alpha', 30, 10, { key: 'alphaSays' }),
				fixedSignal('beta', 30, 10, { key: 'betaSays' }),
				fixedSignal('gamma', 30, 10, { key: 'gammaSays' }),
			],
			reasonPriority: ['gamma', 'alpha', 'beta'],
			reasonLimit: 2,
		});
		const score = scoreGame(thirdQuarter(), {}, { mode });
		expect(score.reasons).toEqual([{ key: 'gammaSays' }, { key: 'alphaSays' }]);
		expect(score.reason).toBe('gammaSays, alphaSays');
	});

	test('a game with nothing to say still names the boosts that moved it', () => {
		const score = scoreGame(thirdQuarter(), {}, { mode: testMode(), gameBoost: 5 });
		expect(score.reasons).toEqual([{ key: 'fallback' }, { key: 'gameBoost', params: { points: 5 } }]);
		expect(score.reason).toBe('best game available, game boost (+5)');
	});
});

describe('replaying a recorded poll', () => {
	test('scores identically whenever it is replayed, because event ages run from the newest snapshot', () => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2026-10-03T02:12:00Z'));
		const live = scoreGame(tiedFinalMinute(), denverRun(), { favoriteTeamCount: 1, favoriteBoostPoints: 10 });

		jest.setSystemTime(new Date('2031-04-01T12:00:00Z'));
		const replayed = scoreGame(tiedFinalMinute(), denverRun(), { favoriteTeamCount: 1, favoriteBoostPoints: 10 });
		const shifted = scoreGame(tiedFinalMinute(), denverRun(pollStart + 86_400_000), { favoriteTeamCount: 1, favoriteBoostPoints: 10 });

		expect(replayed).toEqual(live);
		expect(shifted).toEqual(live);
		expect(signalPoints(live, 'momentum')).toBeGreaterThan(0);
	});
});

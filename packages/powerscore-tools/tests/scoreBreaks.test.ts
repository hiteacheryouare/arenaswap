import type { DeadInterval, Play } from '../src/breaks/groundTruth';
import { feedLagMs, scoreBreaks, type GameTrace, type PollFlag } from '../src/breaks/scoreBreaks';

// These numbers decided whether commercial detection shipped, so each test is one way the scorer
// could flatter or punish a detector: a catch, a miss, a false alarm, and what gets left out.

const minute = 60_000;
const at = (minutes: number) => minutes * minute;

const play = (minutes: number, id = `p${minutes}`): Play => ({ at: at(minutes), id, type: 'Rush', typeKey: 'rush', text: '' });

const dead = (fromMinute: number, toMinute: number, kind: DeadInterval['kind'] = 'tvTimeout'): DeadInterval => (
	{ start: at(fromMinute), end: at(toMinute), kind, after: play(fromMinute) }
);

// A poll every half minute from `from` to `to`, flagged wherever `flagged` says.
const polls = (from: number, to: number, flagged: (minute: number) => string | undefined = () => undefined): PollFlag[] => {
	const out: PollFlag[] = [];
	for (let m = from; m <= to; m += 0.5) out.push({ at: at(m), kind: flagged(m) });
	return out;
};

const trace = (over: Partial<GameTrace>): GameTrace => ({
	gameId: 'g1',
	polls: [],
	intervals: [],
	action: [play(0), play(60)],
	plays: [],
	...over,
});

const between = (from: number, to: number, kind = 'timeout') => (m: number) => (m >= from && m <= to ? kind : undefined);

test('a break the detector flags is caught, and how late it noticed is measured from the break', () => {
	const result = scoreBreaks([trace({ intervals: [dead(10, 13)], polls: polls(0, 60, between(11, 13)) })], { excludeIntermissions: false });

	expect([result.breaks, result.caught, result.missed]).toEqual([1, 1, []]);
	expect(result.falseAlarms).toEqual([]);
	expect(result.latencyMedian).toBe(60);
	expect(result.releaseMedian).toBe(30);
	expect(result.pollPrecision).toBe(1);
});

test('a break the detector sleeps through is missed, with how long it lasted', () => {
	const result = scoreBreaks([trace({ intervals: [dead(10, 13)], polls: polls(0, 60) })], { excludeIntermissions: false });

	expect(result.caught).toBe(0);
	expect(result.missed).toEqual([{ gameId: 'g1', start: at(10), seconds: 180, kind: 'tvTimeout' }]);
});

test('a flag during live play is a false alarm, counted once per run of flagged polls', () => {
	const flagged = (m: number) => between(11, 13)(m) ?? between(30, 31, 'lull')(m);
	const result = scoreBreaks([trace({ intervals: [dead(10, 13)], polls: polls(0, 60, flagged) })], { excludeIntermissions: false });

	expect(result.runs).toBe(2);
	expect(result.falseAlarms).toEqual([{ gameId: 'g1', at: at(30), seconds: 60, kind: 'lull' }]);
	expect(result.falseAlarmShare).toBe(0.5);
	expect(result.byKind).toEqual({ timeout: { runs: 1, falseAlarms: 0 }, lull: { runs: 1, falseAlarms: 1 } });
});

test('pregame and postgame polls are outside the game and count for nothing', () => {
	const result = scoreBreaks([trace({ polls: polls(-20, 80, m => (m < 0 || m > 60 ? 'timeout' : undefined)) })], { excludeIntermissions: false });

	expect(result.runs).toBe(0);
	expect(result.hours).toBe(1);
});

// Flagged just before halftime and just after it, and not in between.
const aroundHalftime = (m: number) => ((m >= 28 && m <= 28.5) || (m >= 46.5 && m <= 47) ? 'timeout' : undefined);

test('with intermissions excluded, halftime and the minute either side neither catch nor alarm', () => {
	const result = scoreBreaks([trace({ intervals: [dead(30, 45, 'intermission')], polls: polls(0, 60, aroundHalftime) })], { excludeIntermissions: true });

	expect([result.breaks, result.caught]).toEqual([0, 0]);
	expect(result.falseAlarms.every(alarm => alarm.at < at(29) || alarm.at > at(46))).toBe(true);
});

// The polls dropped around halftime are dropped before runs are found, so the flags either side of it
// end up adjacent and are joined into one run that spans the whole break.
test('flags on either side of an excluded halftime are two false alarms, not one that spans it', () => {
	const result = scoreBreaks([trace({ intervals: [dead(30, 45, 'intermission')], polls: polls(0, 60, aroundHalftime) })], { excludeIntermissions: true });

	expect(result.falseAlarms.map(alarm => [alarm.at, alarm.seconds])).toEqual([[at(28), 30], [at(46.5), 30]]);
	expect(result.runs).toBe(2);
});

// Flagged inside a stretch the feed did not record as it happened, and either side of it.
const aroundGap = (m: number) => ((m >= 18 && m <= 18.5) || (m >= 21 && m <= 31) || (m >= 33.5 && m <= 34) ? 'timeout' : undefined);

test('an unrecorded stretch is left out even where intermissions count, and splits the runs around it', () => {
	const result = scoreBreaks([trace({ intervals: [dead(20, 32, 'unrecorded')], polls: polls(0, 60, aroundGap) })], { excludeIntermissions: false });

	expect([result.breaks, result.caught, result.missed]).toEqual([0, 0, []]);
	expect(result.falseAlarms.map(alarm => [alarm.at, alarm.seconds])).toEqual([[at(18), 30], [at(33.5), 30]]);
});

test('shifting the truth by the feed\'s lag turns a late flag into a catch', () => {
	const lateFlag = trace({ intervals: [dead(10, 12)], polls: polls(0, 60, between(12.5, 13)) });

	expect(scoreBreaks([lateFlag], { excludeIntermissions: false }).caught).toBe(0);
	expect(scoreBreaks([lateFlag], { excludeIntermissions: false, shiftMs: minute }).caught).toBe(1);
});

test('a game with no action logged is left out rather than scored as all dead air', () => {
	const result = scoreBreaks([trace({ action: [], polls: polls(0, 60, () => 'timeout') })], { excludeIntermissions: false });

	expect([result.games, result.runs, result.falseAlarmShare, result.pollPrecision]).toEqual([0, 0, 0, 0]);
});

test('the feed lag is how long after a play the polls first carried it', () => {
	const plays = [play(10, 'a'), play(20, 'b'), play(30, 'c')];
	const seen: PollFlag[] = [
		{ at: at(10) + 30_000, lastPlayId: 'a' },
		{ at: at(10) + 60_000, lastPlayId: 'a' },
		{ at: at(20) + 40_000, lastPlayId: 'b' },
		{ at: at(30) + 20_000, lastPlayId: 'c' },
	];

	expect(feedLagMs([trace({ plays, polls: seen })])).toBe(30_000);
});

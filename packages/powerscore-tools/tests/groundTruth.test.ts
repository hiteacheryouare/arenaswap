import { join } from 'node:path';
import { deadIntervals, playByPlayPath, readPlays } from '../src/breaks/groundTruth';

// Indianapolis at Washington in London, 2026-10-04: the post-game play-by-play, trimmed to the fields
// the reader uses. The same game is the NFL scoreboard capture in packages/sideline.
const plays = readPlays(playByPlayPath(join(__dirname, '../fixtures/playByPlay'), 'nfl', '401872965'));
const { intervals, action } = deadIntervals('football', plays);
const ofKind = (kind: string) => intervals.filter(interval => interval.kind === kind);
const minutes = (ms: number) => ms / 60_000;

test('reads the whole game in the order it was played', () => {
	expect(plays).toHaveLength(183);
	expect(plays.every((play, index) => index === 0 || play.at >= plays[index - 1]!.at)).toBe(true);
});

test('timeouts, warnings and period ends are not action', () => {
	expect(action.some(play => /timeout|two-minute|end period|end of/i.test(play.type))).toBe(false);
	expect(action.some(play => play.type === 'Kickoff')).toBe(true);
});

test('finds halftime as the one intermission, and it lasts a halftime', () => {
	const [halftime, ...others] = ofKind('intermission');

	expect(others).toEqual([]);
	expect(minutes(halftime!.end - halftime!.start)).toBeGreaterThan(12);
	expect(halftime!.after.type).toBe('Field Goal Good');
});

test('finds both two-minute warnings and both quarter breaks', () => {
	expect(ofKind('twoMinuteWarning')).toHaveLength(2);
	expect(ofKind('periodEnd')).toHaveLength(2);
});

test('every official timeout that stopped play for long enough is a TV timeout', () => {
	const officialTimeouts = plays.filter(play => play.type === 'Official Timeout');
	const covering = officialTimeouts.map(timeout => intervals.find(interval => timeout.at >= interval.start && timeout.at <= interval.end));

	expect(covering.filter(Boolean).map(interval => interval!.kind).every(kind => kind === 'tvTimeout')).toBe(true);
	expect(ofKind('tvTimeout').length).toBeGreaterThanOrEqual(officialTimeouts.length - 1);
});

test('a lull after a touchdown and after a kickoff is labelled by the play before it', () => {
	expect(ofKind('afterScore').map(interval => interval.after.type)).toEqual(['Rushing Touchdown']);
	expect(ofKind('afterKickoff').every(interval => interval.after.type === 'Kickoff')).toBe(true);
});

test('no dead interval is shorter than the minimum gap', () => {
	expect(Math.min(...intervals.map(interval => interval.end - interval.start))).toBeGreaterThanOrEqual(90_000);
});

test('a game with no play-by-play on disk has no plays rather than an error', () => {
	expect(readPlays(join(__dirname, 'nowhere.json'))).toEqual([]);
});

// Sacramento at the Lakers, 2026-10-05 preseason, third and fourth quarters. The feed entered the last
// 4:09 of the third under one timestamp, 14 minutes after the turnover before it.
describe('a quarter the feed backfilled', () => {
	const backfilled = deadIntervals('basketball', readPlays(playByPlayPath(join(__dirname, '../fixtures/playByPlay'), 'nba', '401898716'))).intervals;
	const unrecorded = backfilled.filter(interval => interval.kind === 'unrecorded');

	test('the stretch before it is unrecorded, not an intermission', () => {
		expect(unrecorded).toHaveLength(1);
		expect(unrecorded[0]!.after.type).toBe('Lost Ball Turnover');
		expect(Math.round(minutes(unrecorded[0]!.end - unrecorded[0]!.start))).toBe(14);
		expect(backfilled.some(interval => interval.kind === 'intermission' && interval.start === unrecorded[0]!.start)).toBe(false);
	});

	test('substitutions logged together at a stopped clock are not a backfill', () => {
		expect(backfilled.filter(interval => interval.kind !== 'unrecorded').length).toBeGreaterThan(0);
		expect(intervals.some(interval => interval.kind === 'unrecorded')).toBe(false);
	});
});

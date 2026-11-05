import type { Game } from '@arenaswap/core/types';
import { makeGame } from '../cypress/support/fixtures';
import { everyTimeEdge, timeEdges } from '../cypress/support/safetyNet/timeEdges';
import { gameEndTimes, recordGameEnds, type gameEndRecords } from '../utils/gameEndTimes';
import { buildBar, buildHeatCurve, resolveRunMinutes } from '../entrypoints/guide/guideHeat';
import { axisBounds, fillAxis, hourMarks } from '../entrypoints/guide/guideLayout';

const minute = 60_000;
const hour = 60 * minute;

const nfl = (status: Game['status']) => makeGame('nfl-401872988', {
	league: 'nfl', sportType: 'football', status, startTime: '2026-10-11T17:00:00Z',
});

const laliga = (status: Game['status']) => makeGame('laliga-401882849', {
	league: 'laliga', sportType: 'soccer', status, startTime: '2026-10-10T12:00:00Z',
});

const barsAt = (games: Game[], now: number) => games.map(game => buildBar(game, false, now)!);

describe('a final the guide never saw end', () => {
	// ncaaf 401864516 ended 2 h 40 min after kickoff, against a 210-minute estimate. Seen the moment
	// the slate loaded, with nobody having watched it finish.
	const { game, now } = timeEdges.endsEarly;

	test('is not drawn ending after the present', () => {
		const bar = buildBar(game, false, now);
		expect(bar!.endMs).toBeLessThanOrEqual(now);
	});

	test('does not push the axis past the half hour after the present', () => {
		const bar = buildBar(game, false, now)!;
		const { toMs } = axisBounds([bar])!;
		expect(toMs).toBeLessThanOrEqual(Math.ceil((now + 30 * minute) / hour) * hour);
	});

	test('on a day of results only, no best window is offered', () => {
		const bar = buildBar(game, false, now)!;
		const { band } = buildHeatCurve([bar], { weightFavorites: false, favoriteBonusPoints: 0, notBeforeMs: now });
		expect(band).toBeNull();
	});
});

describe('a live game that has not started play', () => {
	// ncaaf 401868347, ETSU at CIT, 2026-10-10: STATUS_DELAYED with state 'in', period 0 and a clock of
	// zero, seen 12 minutes after its 16:00Z kickoff time. The recorder saw it so for 26 snapshots.
	const delayed = makeGame('ncaaf-401868347', {
		league: 'ncaaf', sportType: 'football', status: 'in', period: 0, clockSeconds: 0, startTime: '2026-10-10T16:00:00Z',
		awayTeam: { id: '2193', name: 'East Tennessee State Buccaneers', abbreviation: 'ETSU', score: 0 },
		homeTeam: { id: '2643', name: 'The Citadel Bulldogs', abbreviation: 'CIT', score: 0 },
	});
	const now = 1791648740572;

	test('is drawn running a full game from now, because none of it has been played', () => {
		const bar = buildBar(delayed, false, now)!;
		expect(bar.endMs - now).toBeGreaterThanOrEqual(resolveRunMinutes(delayed).bar * minute * 0.99);
	});
});

describe('the end the guide records for a final', () => {
	const kickoff = Date.parse('2026-10-11T17:00:00Z');

	test('is not the moment it was found, when the browser was closed for the night', () => {
		const seenLive = kickoff + 30 * minute;
		const foundFinal = kickoff + 11 * hour;
		const afterLive = recordGameEnds({}, [nfl('in')], seenLive)!;
		const afterFinal = recordGameEnds(afterLive, [nfl('post')], foundFinal);
		const endedAt = gameEndTimes(afterFinal ?? afterLive)['nfl-401872988'];
		expect(endedAt === undefined || endedAt <= kickoff + resolveRunMinutes(nfl('post')).p99 * minute).toBe(true);
	});

	// laliga 401882849, ATH at RAY, 2026-10-10: STATUS_SUSPENDED arrives as state 'post' at 31'
	// of the first half, and fifteen minutes later the same game is back to 'in' at 28'.
	test('moves to the real final when a suspended game resumes', () => {
		const start = Date.parse('2026-10-10T12:00:00Z');
		const suspendedAt = 1791635652656;
		const resumedAt = 1791636552815;
		const finalAt = resumedAt + 80 * minute;
		let records: gameEndRecords = recordGameEnds({}, [laliga('in')], start + minute)!;
		records = recordGameEnds(records, [laliga('in')], suspendedAt - minute) ?? records;
		records = recordGameEnds(records, [laliga('post')], suspendedAt) ?? records;
		records = recordGameEnds(records, [laliga('in')], resumedAt) ?? records;
		records = recordGameEnds(records, [laliga('in')], finalAt - minute) ?? records;
		records = recordGameEnds(records, [laliga('post')], finalAt) ?? records;
		expect(gameEndTimes(records)['laliga-401882849']).toBe(finalAt);
	});
});

describe('the axis', () => {
	test.each(everyTimeEdge.filter(edge => edge.game.startTime))('holds every bar, with half an hour either side, when $label', ({ game, now, endedAt }) => {
		const bar = buildBar(game, false, now, endedAt)!;
		const { fromMs, toMs } = axisBounds([bar])!;
		expect(fromMs).toBeLessThanOrEqual(bar.startMs - 30 * minute);
		expect(toMs).toBeGreaterThanOrEqual(bar.endMs + 30 * minute);
		expect(fromMs % hour === 0 || new Date(fromMs).getMinutes() === 0).toBe(true);
	});

	test('draws nothing for a day whose games have no start time', () => {
		const { game, now } = timeEdges.noStart;
		expect(buildBar(game, false, now)).toBeNull();
		expect(axisBounds([])).toBeNull();
	});

	test('runs through midnight when a late game does', () => {
		const lateNight = makeGame('nba-late', { startTime: '2026-10-11T03:30:00Z', status: 'pre' });
		const [bar] = barsAt([lateNight], Date.parse('2026-10-11T00:00:00Z'));
		const { toMs } = axisBounds([bar!])!;
		expect(toMs).toBeGreaterThan(Date.parse('2026-10-11T06:00:00Z'));
	});

	test('never shortens a long day when it is stretched to fill a wide screen', () => {
		const bounds = { fromMs: Date.parse('2026-10-11T12:00:00Z'), toMs: Date.parse('2026-10-12T04:00:00Z') };
		expect(fillAxis(bounds, 400).toMs).toBe(bounds.toMs);
	});

	test('lands its last hour mark on its own end', () => {
		const filled = fillAxis({ fromMs: Date.parse('2026-10-11T17:00:00Z'), toMs: Date.parse('2026-10-11T19:00:00Z') }, 1500);
		expect(hourMarks(filled.fromMs, filled.toMs).at(-1)).toBe(filled.toMs);
	});
});

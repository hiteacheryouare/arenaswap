import { BackgroundStateSchema } from '../src/backgroundSchema';
import {
	isPowerScoreSnapshotLike,
	isScoreSnapshotLike,
	normalizeGameBoosts,
	normalizePowerScoreHistory,
	normalizeScoreHistory,
	normalizeScores,
} from '../src/typeGuards';
import type { BackgroundState, PowerScoreSnapshot, ScoreSnapshot } from '../src/types';

/* MV3 ends the background worker about thirty seconds after the last event, so everything below is
   the same journey over and over: the worker writes its state out, dies, wakes, and reads it back.
   The write goes through `JSON.stringify` on the way into extension storage, which is why every
   round trip here goes through JSON rather than handing the same object back — `NaN` and
   `undefined` do not survive that trip, and the guards are what decide whether the loss is noticed.

   The stakes are the whole reason these guards are strict: `powerScoreHistory` is what draws the
   game's excitement chart and what the wrap screen reads, and there is no second copy of it
   anywhere. A guard that rejects too much deletes a user's game silently. */

const reload = <T>(value: T): unknown => JSON.parse(JSON.stringify(value));

// Exactly the shape `updatePowerScoreHistory` in the extension's background worker writes today,
// field for field. If this ever stops loading, every user loses their history on the next upgrade.
const snapshotAsShipped = (over: Partial<PowerScoreSnapshot> = {}): PowerScoreSnapshot => ({
	gameId: 'game-1',
	timestamp: 1_764_000_000_000,
	total: 78,
	closeness: 22,
	lateGame: 18,
	momentum: 14,
	leadChanges: 9,
	comeback: 5,
	signalsSubtotal: 68,
	favoriteBonus: 10,
	favoriteTeamCount: 1,
	gameBoost: 0,
	scoringOpportunityBoost: 0,
	postseasonBoost: 0,
	stalled: false,
	reason: 'best game available',
	...over,
});

const scoreSnapshot = (over: Partial<ScoreSnapshot> = {}): ScoreSnapshot => ({
	gameId: 'game-1',
	timestamp: 1_764_000_000_000,
	homeScore: 88,
	awayScore: 85,
	...over,
});

describe('a worker restart with everything intact', () => {
	test('the whole state comes back the way it went in', () => {
		const written: BackgroundState = {
			games: [],
			scores: [],
			leagueLogos: { nba: 'https://a.espncdn.com/nba.png' },
			scoreHistory: { 'game-1': [scoreSnapshot()] },
			powerScoreHistory: { 'game-1': [snapshotAsShipped()] },
			gameBoosts: { 'game-1': 12 },
			onStandbyStream: true,
			standbyStreamTabId: 41,
			slateShedLeagues: ['nba', 'nhl'],
		};

		expect(BackgroundStateSchema.parse(reload(written))).toEqual(written);
	});

	test('a power score snapshot as the worker writes it today survives the trip', () => {
		expect(isPowerScoreSnapshotLike(reload(snapshotAsShipped()))).toBe(true);
	});

	test('a score snapshot as the worker writes it today survives the trip', () => {
		expect(isScoreSnapshotLike(reload(scoreSnapshot()))).toBe(true);
	});

	test('tab id zero is a real tab, not an absent one', () => {
		// The one number in the state that is falsy and still means something. Read with a
		// truthiness check instead of a type check and the first tab a user ever registers is lost.
		const parsed = BackgroundStateSchema.parse(reload({ standbyStreamTabId: 0 }));

		expect(parsed.standbyStreamTabId).toBe(0);
	});
});

describe('an upgrade, reading what an older release wrote', () => {
	test('a snapshot from before the boosts existed still loads', () => {
		const old = {
			gameId: 'game-1', timestamp: 1_764_000_000_000, total: 55,
			closeness: 20, lateGame: 15, momentum: 10, leadChanges: 5, comeback: 5,
			signalsSubtotal: 55, favoriteBonus: 0, favoriteTeamCount: 0,
			stalled: false, reason: 'best game available',
		};

		expect(isPowerScoreSnapshotLike(reload(old))).toBe(true);
	});

	test('a snapshot carrying fields a newer release added is not rejected for them', () => {
		const future = { ...snapshotAsShipped(), somethingNobodyHasWrittenYet: 'x' };

		expect(isPowerScoreSnapshotLike(reload(future))).toBe(true);
	});

	/* The upgrade cliff, pinned deliberately rather than discovered in the field. Every field the
	   guard does not mark optional is mandatory, so promoting one new field to required deletes
	   every snapshot every existing user has, with no migration, no warning and no way back — the
	   chart simply comes up empty and the wrap screen has nothing to show. The convention that keeps
	   this safe is "new fields are optional", and this is the test that makes breaking it visible. */
	test('a snapshot missing a required field is dropped in full, taking the game\'s chart with it', () => {
		const { favoriteTeamCount: _dropped, ...withoutRequiredField } = snapshotAsShipped();

		expect(isPowerScoreSnapshotLike(reload(withoutRequiredField))).toBe(false);
		expect(normalizePowerScoreHistory(reload({ 'game-1': [withoutRequiredField] }))).toEqual({ 'game-1': [] });
	});

	test('one bad snapshot costs its own point rather than the whole game', () => {
		const history = { 'game-1': [snapshotAsShipped(), { gameId: 'game-1' }, snapshotAsShipped({ total: 80 })] };

		expect(normalizePowerScoreHistory(reload(history))['game-1']).toHaveLength(2);
	});
});

describe('values that do not survive JSON', () => {
	test('a NaN timestamp becomes null in storage and the snapshot is dropped', () => {
		// Worth knowing because nothing upstream rejects a NaN clock, so a snapshot can be written
		// with one. It does not come back, and it does not say that it did not.
		const written = { 'game-1': [scoreSnapshot({ timestamp: Number.NaN })] };

		expect(reload(written)).toEqual({ 'game-1': [{ ...scoreSnapshot(), timestamp: null }] });
		expect(normalizeScoreHistory(reload(written))).toEqual({ 'game-1': [] });
	});

	test('an Infinity score does not come back either', () => {
		expect(normalizeScoreHistory(reload({ g: [scoreSnapshot({ homeScore: Number.POSITIVE_INFINITY })] })))
			.toEqual({ g: [] });
	});
});

describe('storage that came back corrupt', () => {
	// Nothing in here is allowed to throw: a throw during hydration takes the worker down on every
	// single wake, which is an extension that never starts again until storage is cleared by hand.
	test.each([
		['a string where the state should be', '{"games":[]}'],
		['an array', []],
		['null', null],
		['a number', 7],
		['undefined', undefined],
	])('%s falls back to an empty state rather than throwing', (_label, value) => {
		const parsed = BackgroundStateSchema.parse(value);

		expect(parsed).toEqual({
			games: [], scores: [], leagueLogos: {}, scoreHistory: {}, powerScoreHistory: {},
			gameBoosts: {}, onStandbyStream: false, standbyStreamTabId: null, slateShedLeagues: [],
		});
	});

	test('a half-written state keeps the fields that made it and defaults the rest', () => {
		const parsed = BackgroundStateSchema.parse({ gameBoosts: { 'game-1': 5 }, onStandbyStream: true });

		expect(parsed.gameBoosts).toEqual({ 'game-1': 5 });
		expect(parsed.onStandbyStream).toBe(true);
		expect(parsed.scoreHistory).toEqual({});
		expect(parsed.standbyStreamTabId).toBeNull();
	});

	test.each([
		['a history map that is an array', []],
		['a history map that is a string', 'nope'],
		['a history map that is null', null],
	])('%s reads as no history rather than crashing the hydrate', (_label, value) => {
		expect(normalizeScoreHistory(value)).toEqual({});
		expect(normalizePowerScoreHistory(value)).toEqual({});
	});

	test('a game whose snapshots are not an array is skipped, and its neighbours are kept', () => {
		const corrupt = { 'game-1': 'not an array', 'game-2': [scoreSnapshot({ gameId: 'game-2' })] };

		expect(Object.keys(normalizeScoreHistory(corrupt))).toEqual(['game-2']);
	});
});

describe('the per-game boost the user set by hand', () => {
	test('keeps a real boost and drops the noise around it', () => {
		const stored = { kept: 15, zero: 0, negative: -5, stringy: '10', nullish: null, nan: Number.NaN };

		expect(normalizeGameBoosts(stored)).toEqual({ kept: 15 });
	});

	test('reads as no boosts at all when storage handed back a primitive', () => {
		expect(normalizeGameBoosts('15')).toEqual({});
		expect(normalizeGameBoosts(null)).toEqual({});
		expect(normalizeGameBoosts(7)).toEqual({});
	});

	/* An array gets through `isObjectRecord`, because an array is an object, and comes back keyed
	   by index rather than empty. Harmless in practice — no ESPN game is filed under the id "0" — so
	   this pins what actually happens rather than claiming a defect. The same guard sits under both
	   history maps, so if the answer should be an empty map it is one change in one place. */
	test('an array of boosts comes back keyed by index rather than discarded', () => {
		expect(normalizeGameBoosts([15, 20])).toEqual({ '0': 15, '1': 20 });
	});
});

describe('the scores the popup draws from', () => {
	test('a score missing everything but its id is filled in rather than dropped', () => {
		/* Deliberately the opposite policy from the history guard above, and worth seeing side by
		   side: a score is the current standing and is rewritten on the next poll a few seconds
		   later, so filling the gaps costs one stale frame. A history snapshot is a permanent record
		   with nothing to replace it, so a doubtful one is thrown away. */
		const [score] = normalizeScores([{ gameId: 'game-1' }]);

		expect(score).toMatchObject({ gameId: 'game-1', total: 0, closeness: 0 });
	});

	test('an entry with no game id is dropped, because nothing could ever match it to a game', () => {
		expect(normalizeScores([{ total: 90 }, { gameId: 'game-1' }, null, 'nope'])).toHaveLength(1);
	});

	test('reads as no scores when storage handed back something that is not a list', () => {
		expect(normalizeScores({ 'game-1': { total: 90 } })).toEqual([]);
	});
});

describe('the leagues ESPN refused on the last slate fetch', () => {
	test('survives the round trip, because an empty slate alongside it means something different', () => {
		expect(BackgroundStateSchema.parse(reload({ slateShedLeagues: ['nba', 'ncaaf'] })).slateShedLeagues)
			.toEqual(['nba', 'ncaaf']);
	});

	test('drops entries that are not ids and keeps the ones that are', () => {
		expect(BackgroundStateSchema.parse({ slateShedLeagues: ['nba', 7, null, { id: 'nhl' }] }).slateShedLeagues)
			.toEqual(['nba']);
	});
});

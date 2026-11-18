import { sportWrapAllowanceMs } from '../src/constants';
import { isStuckLive, stuckQuietMs, stuckSinceOf, trackProgress } from '../src/stuckGames';
import type { Game } from '../src/types';

const start = Date.UTC(2026, 10, 17, 0, 0);
const minute = 60_000;
const pastWrap = start + sportWrapAllowanceMs.basketball + minute;

const live = (over: Partial<Game> = {}): Game => ({
	id: 'g1',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period: 4,
	clockSeconds: 0,
	startTime: new Date(start).toISOString(),
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 110 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 104 },
	...over,
});

describe('trackProgress', () => {
	test('keeps the moment a game last moved while nothing on the scoreboard changes', () => {
		const first = trackProgress({}, [live()], start);
		const later = trackProgress(first, [live()], start + (20 * minute));
		expect(later.g1!.since).toBe(start);
	});

	test('restarts the clock on a score, a period or a clock tick', () => {
		const first = trackProgress({}, [live()], start);
		expect(trackProgress(first, [live({ homeTeam: { ...live().homeTeam, score: 112 } })], start + minute).g1!.since).toBe(start + minute);
		expect(trackProgress(first, [live({ period: 5 })], start + minute).g1!.since).toBe(start + minute);
		expect(trackProgress(first, [live({ clockSeconds: 12 })], start + minute).g1!.since).toBe(start + minute);
	});

	test('forgets a game once it is no longer live', () => {
		const first = trackProgress({}, [live()], start);
		expect(trackProgress(first, [], start + minute)).toEqual({});
	});
});

describe('isStuckLive', () => {
	test('a game past its expected end with nothing moving for half an hour is stuck', () => {
		const progress = { key: 'k', since: pastWrap - stuckQuietMs };
		expect(isStuckLive(live(), progress, pastWrap)).toBe(true);
		expect(isStuckLive(live(), { ...progress, since: progress.since + 1 }, pastWrap)).toBe(false);
	});

	test('a quiet game still inside its expected window is not stuck, however long the quiet', () => {
		const insideWindow = start + sportWrapAllowanceMs.basketball - minute;
		expect(isStuckLive(live(), { key: 'k', since: start }, insideWindow)).toBe(false);
	});

	test('a delayed game is never stuck, because a delay is meant to be quiet', () => {
		expect(isStuckLive(live({ delayed: true }), { key: 'k', since: start }, pastWrap + stuckQuietMs)).toBe(false);
	});

	test('a game nobody has watched move yet is not stuck', () => {
		expect(isStuckLive(live(), undefined, pastWrap + stuckQuietMs)).toBe(false);
	});
});

test('stuckSinceOf reports when each stuck game last moved, and only those', () => {
	const now = pastWrap + stuckQuietMs;
	const moving = live({ id: 'g2' });
	const progress = { g1: { key: 'k', since: start }, g2: { key: 'k', since: now - minute } };
	expect(stuckSinceOf([live(), moving], progress, now)).toEqual({ g1: start });
});

import { checkHeldSwitch, holdSwitch, isDecisiveMoment, type HeldSwitch, type HoldVerdict } from '../src/playBreaks';
import type { CommercialBreakEntry } from '../src/commercialBreaks';
import type { Game } from '../src/types';

const start = Date.UTC(2026, 9, 10, 1, 0);
const at = (seconds: number): number => start + seconds * 1000;
const target = { gameId: 'other', tabId: 2, reason: 'leadChange' };
const quiet: CommercialBreakEntry = { lastPlaySeenAt: start };

const game = (overrides: Partial<Game>): Game => ({
	id: 'watched',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
	period: 2,
	clockSeconds: 400,
	status: 'in',
	lastPlayId: '1',
	lastPlayType: 'Jump Shot',
	...overrides,
});

const atBat = (batter: string, pitcher = 'p1') => ({ batter: { id: batter, name: batter }, pitcher: { id: pitcher, name: pitcher } });

// The background worker's loop while a switch waits: one fresh poll of the game being left at a time.
const replay = (first: Game, polls: [seconds: number, game: Partial<Game>][], entry: CommercialBreakEntry = quiet): { seconds: number; verdict: HoldVerdict } | undefined => {
	let held = holdSwitch(target, first, entry, start);
	if (!held) return undefined;
	for (const [seconds, overrides] of polls) {
		const verdict = checkHeldSwitch(held, { ...first, ...overrides }, entry, { now: at(seconds), observed: true, watching: true });
		if (verdict.release) return { seconds, verdict };
		held = verdict.held;
	}
	return undefined;
};

describe('content-aware switching', () => {
	describe('baseball waits for the plate appearance to end', () => {
		const midAtBat = game({
			league: 'mlb', sportType: 'baseball', period: 6, topOfInning: true, clockSeconds: 0,
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 3 }, awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 2 },
			atBat: atBat('b1'), bso: { balls: 1, strikes: 1, outs: 1 }, lastPlayId: '10', lastPlayType: 'Strike Looking',
		});

		test('sits through the pitches and switches once the ball is in play', () => {
			expect(replay(midAtBat, [
				[15, { lastPlayId: '11', lastPlayType: 'Ball', bso: { balls: 2, strikes: 1, outs: 1 } }],
				[30, { lastPlayId: '12', lastPlayType: 'Foul Ball', bso: { balls: 2, strikes: 2, outs: 1 } }],
				[45, { lastPlayId: '13', lastPlayType: 'Play Result', bso: { balls: 0, strikes: 0, outs: 2 } }],
			])).toEqual({ seconds: 45, verdict: { release: true, waitedFor: 'baseball' } });
		});

		test('switches when the next batter steps in, even if the result itself was missed between polls', () => {
			expect(replay(midAtBat, [
				[15, { lastPlayId: '11', lastPlayType: 'Ball' }],
				[30, { lastPlayId: '20', lastPlayType: 'Strike Swinging', atBat: atBat('b2'), bso: { balls: 0, strikes: 0, outs: 2 } }],
			])?.seconds).toBe(30);
		});

		test('keeps waiting through a pinch hitter who inherits the count', () => {
			expect(replay(midAtBat, [
				[15, { atBat: atBat('pinch') }],
				[30, { lastPlayId: '12', lastPlayType: 'Ball', atBat: atBat('pinch'), bso: { balls: 2, strikes: 1, outs: 1 } }],
			])).toBeUndefined();
		});

		test('switches on an out or a run, a pitching change and the end of the half', () => {
			expect(replay(midAtBat, [[15, { bso: { balls: 1, strikes: 1, outs: 2 } }]])?.seconds).toBe(15);
			expect(replay(midAtBat, [[15, { awayTeam: { ...midAtBat.awayTeam, score: 3 } }]])?.seconds).toBe(15);
			expect(replay(midAtBat, [[15, { atBat: atBat('b1', 'reliever') }]])?.seconds).toBe(15);
			expect(replay(midAtBat, [[15, { inningBreak: true }]])?.seconds).toBe(15);
		});
	});

	describe('football waits for the play to end', () => {
		const snap = game({ league: 'nfl', sportType: 'football', period: 2, clockSeconds: 600, lastPlayId: '100', lastPlayType: 'Rush' });

		test('switches on the next play the feed reports', () => {
			expect(replay(snap, [
				[12, { clockSeconds: 590 }],
				[24, { lastPlayId: '101', lastPlayType: 'Pass Reception', clockSeconds: 585 }],
			])?.seconds).toBe(24);
		});

		test('college football switches straight away: its feed runs too late to time a snap by', () => {
			expect(holdSwitch(target, { ...snap, league: 'ncaaf' }, quiet, start)).toBeNull();
		});
	});

	describe('basketball waits for a dead ball', () => {
		test('plays through made baskets and steals, then switches once the clock has held for three polls', () => {
			expect(replay(game({}), [
				[12, { clockSeconds: 388, lastPlayId: '2', lastPlayType: 'Layup Shot', homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 52 } }],
				[24, { clockSeconds: 376, lastPlayId: '3', lastPlayType: 'Bad Pass Turnover' }],
				[36, { clockSeconds: 376 }],
				[48, { clockSeconds: 376 }],
			])).toEqual({ seconds: 48, verdict: { release: true, waitedFor: 'basketball' } });
		});

		test('switches on a foul, but not on the feed saying there was no foul', () => {
			expect(replay(game({}), [[12, { clockSeconds: 389, lastPlayId: '2', lastPlayType: 'Shooting Foul' }]])?.seconds).toBe(12);
			expect(replay(game({}), [[12, { clockSeconds: 389, lastPlayId: '2', lastPlayType: 'No Foul' }]])).toBeUndefined();
		});
	});

	describe('hockey waits for the whistle', () => {
		const flow = game({ league: 'nhl', sportType: 'hockey', period: 1, clockSeconds: 900, lastPlayType: 'Shot' });

		test('plays through shots and hits, then switches on the stoppage', () => {
			expect(replay(flow, [
				[12, { clockSeconds: 888, lastPlayId: '2', lastPlayType: 'Hit' }],
				[24, { clockSeconds: 876, lastPlayId: '3', lastPlayType: 'Blocked' }],
				[36, { clockSeconds: 865, lastPlayId: '4', lastPlayType: 'Stoppage' }],
			])?.seconds).toBe(36);
		});

		test('college hockey switches straight away: its feed carries no plays and a clock that skips', () => {
			expect(holdSwitch(target, { ...flow, league: 'ncaamh' }, quiet, start)).toBeNull();
		});

		test('switches on a goal', () => {
			expect(replay(flow, [[12, { clockSeconds: 888, lastPlayId: '2', lastPlayType: 'Goal', homeTeam: { ...flow.homeTeam, score: 51 } }]])?.seconds).toBe(12);
		});
	});

	describe('the cap', () => {
		test('switches anyway once a long possession outlasts it, without claiming it waited for a break', () => {
			const polls: [number, Partial<Game>][] = Array.from({ length: 8 }, (_, i) => [(i + 1) * 12, { clockSeconds: 400 - (i + 1) * 12 }]);
			expect(replay(game({}), polls)).toEqual({ seconds: 96, verdict: { release: true } });
		});

		test('is longest in baseball, where a plate appearance runs about two minutes', () => {
			const held = holdSwitch(target, game({ league: 'mlb', sportType: 'baseball' }), quiet, start) as HeldSwitch;
			expect(held.holdUntil - start).toBe(120_000);
		});
	});

	describe('when not to wait at all', () => {
		test('soccer plays straight through, so there is never a break to wait for', () => {
			expect(holdSwitch(target, game({ league: 'epl', sportType: 'soccer' }), quiet, start)).toBeNull();
		});

		test('a game already at halftime, between innings, in a delay or in a commercial has nothing to cut off', () => {
			expect(holdSwitch(target, game({ intermission: true }), quiet, start)).toBeNull();
			expect(holdSwitch(target, game({ league: 'mlb', sportType: 'baseball', inningBreak: true }), quiet, start)).toBeNull();
			expect(holdSwitch(target, game({ delayed: true }), quiet, start)).toBeNull();
			expect(holdSwitch(target, game({}), { ...quiet, kind: 'tvTimeout' }, start)).toBeNull();
		});

		test('a blowout is not worth holding a switch for', () => {
			expect(holdSwitch(target, game({ homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 90 } }), quiet, start)).toBeNull();
		});

		test('a last shot in a one-possession game elsewhere goes straight through, unless this game is at one too', () => {
			const lastShot = game({ id: 'other', period: 4, clockSeconds: 20 });
			expect(isDecisiveMoment(lastShot)).toBe(true);
			expect(holdSwitch(target, game({}), quiet, start, lastShot)).toBeNull();
			expect(holdSwitch(target, game({ period: 4, clockSeconds: 15 }), quiet, start, lastShot)).not.toBeNull();
		});

		test('a walk-off chance in the bottom of the ninth is decisive; a three-run deficit with the bases empty is not', () => {
			const ninth = { league: 'mlb' as const, sportType: 'baseball' as const, period: 9, topOfInning: false, clockSeconds: 0 };
			const tied = game({ ...ninth, homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 3 }, awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 3 } });
			const down3 = game({ ...ninth, homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 1 }, awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 4 } });
			expect(isDecisiveMoment(tied)).toBe(true);
			expect(isDecisiveMoment(down3)).toBe(false);
			expect(isDecisiveMoment({ ...down3, baseRunners: { first: true, second: true, third: false } })).toBe(true);
		});

		test('a fourth down in field goal range late in a one-score game is decisive', () => {
			const drive = game({ league: 'nfl', sportType: 'football', period: 4, clockSeconds: 90, possessionTeamId: 'h', yardLine: 50, down: 3 });
			expect(isDecisiveMoment(drive)).toBe(false);
			expect(isDecisiveMoment({ ...drive, down: 4 })).toBe(true);
			expect(isDecisiveMoment({ ...drive, yardLine: 70 })).toBe(true);
		});
	});

	describe('while a switch waits', () => {
		const held = holdSwitch(target, game({}), quiet, start) as HeldSwitch;

		test('lets it go at once, without a break to mention, if the user moved off the game', () => {
			expect(checkHeldSwitch(held, game({}), quiet, { now: at(12), observed: true, watching: false })).toEqual({ release: true });
		});

		test('reads nothing into passes that only polled another league', () => {
			const check = { now: at(30), observed: false, watching: true };
			const after = checkHeldSwitch(held, game({}), quiet, check);
			expect(after).toEqual({ release: false, held });
			expect(checkHeldSwitch(held, game({}), quiet, { ...check, now: at(45) })).toEqual({ release: false, held });
		});

		test('goes straight through when the game it waits on cuts to a commercial', () => {
			expect(checkHeldSwitch(held, game({}), { ...quiet, kind: 'tvTimeout' }, { now: at(12), observed: true, watching: true })).toEqual({ release: true, waitedFor: 'basketball' });
		});
	});
});

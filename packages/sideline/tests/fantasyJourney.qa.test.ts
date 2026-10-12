import { computeFantasyPoints, scoreGame } from 'powerscore';
import { toScoringGame } from '@arenaswap/core';
import type { FantasyRosterEntry, Game } from '@arenaswap/core';
import { readFantasyBoxScore } from '../src/fantasyBoxScore';
import { createLiveExtras } from '../src/liveExtras';
import london from './fixtures/liveExtras/nflLondonPolls.qa.json';

const taylor: FantasyRosterEntry = { league: 'nfl', athleteId: '4242335', name: 'Jonathan Taylor', teamId: '11', position: 'RB' };
const jones: FantasyRosterEntry = { league: 'nfl', athleteId: '3917792', name: 'Daniel Jones', teamId: '11', position: 'QB' };
const washingtonDefense: FantasyRosterEntry = { league: 'nfl', athleteId: 'dst:28', name: 'Commanders D/ST', teamId: '28', position: 'DST' };

type Poll = typeof london.polls[number];

const [beforeTaylorTd, afterTaylorTd, beforeJonesTd, afterJonesTd] = london.polls as [Poll, Poll, Poll, Poll];

const gameAt = (poll: Poll, period: number): Game => ({
	id: '401872965',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period,
	clockSeconds: 420,
	homeTeam: { id: '28', name: 'Washington', abbreviation: 'WSH', score: poll.home },
	awayTeam: { id: '11', name: 'Indianapolis', abbreviation: 'IND', score: poll.away },
});

describe('fantasy points read off a real London box score', () => {
	// Full PPR: 0.1 a rushing or receiving yard, 1 a catch, 6 a rushing touchdown.
	test('scores a running back across his rushing and receiving rows', () => {
		const before = readFantasyBoxScore(beforeTaylorTd.summary, gameAt(beforeTaylorTd, 2)).lines.get(taylor.athleteId)!;
		const after = readFantasyBoxScore(afterTaylorTd.summary, gameAt(afterTaylorTd, 2)).lines.get(taylor.athleteId)!;

		// 6 carries for 23, 1 catch for 2.
		expect(computeFantasyPoints('football', before)).toBe(3.5);
		// 7 carries for 28 and a touchdown, the same catch.
		expect(computeFantasyPoints('football', after)).toBe(10);
	});

	// 0.04 a passing yard, -2 an interception, -2 a fumble lost.
	test('scores a quarterback who throws, runs, and gives the ball away', () => {
		const before = readFantasyBoxScore(beforeJonesTd.summary, gameAt(beforeJonesTd, 4)).lines.get(jones.athleteId)!;
		const after = readFantasyBoxScore(afterJonesTd.summary, gameAt(afterJonesTd, 4)).lines.get(jones.athleteId)!;

		// 128 passing yards, 1 interception, 1 carry for 1, 1 fumble lost.
		expect(computeFantasyPoints('football', before)).toBe(1.22);
		// 135 passing yards, the same pick and fumble, 2 carries for 5 and a rushing touchdown.
		expect(computeFantasyPoints('football', after)).toBe(7.9);
	});

	test('does not read a sack the quarterback took as a sack for his own defense', () => {
		const lines = readFantasyBoxScore(afterJonesTd.summary, gameAt(afterJonesTd, 4)).lines;
		expect(lines.get('dst:11')?.sacks ?? 0).toBe(0);
		expect(lines.get(jones.athleteId)).not.toHaveProperty('sacks');
	});
});

describe('a rostered player scoring between two polls', () => {
	const pollTwice = (roster: FantasyRosterEntry[], first: Poll, second: Poll, period: number) => {
		const extras = createLiveExtras();
		extras.setRoster(roster);
		extras.ingestSummary(gameAt(first, period), first.summary, first.ts);
		extras.ingestSummary(gameAt(second, period), second.summary, second.ts);
		return extras;
	};

	test('records the touchdown as one event worth exactly what it added', () => {
		const extras = pollTwice([taylor, jones], beforeTaylorTd, afterTaylorTd, 2);
		const fantasy = extras.contextFor(gameAt(afterTaylorTd, 2), afterTaylorTd.ts).fantasy!;

		expect(fantasy.find(player => player.id === taylor.athleteId)?.pointEvents).toEqual([{ at: afterTaylorTd.ts, points: 6.5 }]);
		// Jones's line did not move, so he has nothing to show.
		expect(fantasy.find(player => player.id === jones.athleteId)).not.toHaveProperty('pointEvents');
	});

	test('treats the first box score it sees as a baseline, not as points just scored', () => {
		const extras = createLiveExtras();
		extras.setRoster([taylor]);
		extras.ingestSummary(gameAt(afterTaylorTd, 2), afterTaylorTd.summary, afterTaylorTd.ts);

		expect(extras.contextFor(gameAt(afterTaylorTd, 2), afterTaylorTd.ts).fantasy).toEqual([
			expect.not.objectContaining({ pointEvents: expect.anything() }),
		]);
	});

	test('lifts the game under Fantasy and names the player who did it', () => {
		const extras = pollTwice([taylor], beforeTaylorTd, afterTaylorTd, 2);
		const game = gameAt(afterTaylorTd, 2);
		const result = scoreGame(toScoringGame(game), extras.contextFor(game, afterTaylorTd.ts), { mode: 'fantasy' });
		const classic = scoreGame(toScoringGame(game), {}, { mode: 'classic' });

		expect(result.signals.find(signal => signal.id === 'production')?.points).toBeGreaterThan(0);
		expect(result.reasons).toContainEqual({ key: 'fantasyPoints', params: { name: 'Jonathan Taylor', points: 6.5 } });
		expect(result.total).toBeGreaterThan(classic.total);
	});

	test('does not count a defense giving up a touchdown as fantasy production', () => {
		// Washington's defense drops from the 14-20 tier to 21-27 when Jones scores.
		const extras = pollTwice([washingtonDefense], beforeJonesTd, afterJonesTd, 4);
		const game = gameAt(afterJonesTd, 4);
		const context = extras.contextFor(game, afterJonesTd.ts);

		expect(context.fantasy?.[0]?.pointEvents).toEqual([{ at: afterJonesTd.ts, points: -1 }]);
		const result = scoreGame(toScoringGame(game), context, { mode: 'fantasy' });
		expect(result.signals.find(signal => signal.id === 'production')?.points ?? 0).toBe(0);
	});

	test('a scoring rule changed mid-game rescores both polls rather than reading as points scored', () => {
		const extras = createLiveExtras();
		extras.setRoster([jones]);
		extras.ingestSummary(gameAt(beforeJonesTd, 4), beforeJonesTd.summary, beforeJonesTd.ts);
		// Six-point passing touchdowns and harsher picks, set between the two polls.
		extras.setFantasyScoring({ football: { passingTouchdowns: 6, interceptionsThrown: -4 } });
		extras.ingestSummary(gameAt(afterJonesTd, 4), afterJonesTd.summary, afterJonesTd.ts);

		// Only the rushing touchdown and the extra yards: (7.9 - 2) - (1.22 - 2).
		const events = extras.contextFor(gameAt(afterJonesTd, 4), afterJonesTd.ts).fantasy?.[0]?.pointEvents;
		expect(events).toHaveLength(1);
		expect(events![0]!.at).toBe(afterJonesTd.ts);
		// The difference of two rounded totals is not itself rounded, so it carries float noise.
		expect(events![0]!.points).toBeCloseTo(6.68, 10);
	});
});

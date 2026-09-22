import { buildGameCardStyle, formatClock, formatGameClock, formatPeriod, isHalftime, oddsSummary, powerScoreColor } from '../src/components/gameCardShared';
import { leagueConfigs, scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';

const makeGame = (league: LeagueId, overrides: Partial<Game> = {}): Game => ({
	id: 'g1',
	league,
	sportType: 'basketball',
	status: 'in',
	period: 1,
	clockSeconds: 0,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
	...overrides,
});

describe('formatPeriod', () => {
	test('labels quarters, halves, periods and innings by league format', () => {
		expect(formatPeriod(makeGame('nba', { period: 3 }))).toBe('Q3');
		expect(formatPeriod(makeGame('epl', { period: 1 }))).toBe('1H');
		expect(formatPeriod(makeGame('epl', { period: 2 }))).toBe('2H');
		expect(formatPeriod(makeGame('nhl', { period: 2 }))).toBe('P2');
		expect(formatPeriod(makeGame('mlb', { period: 7 }))).toBe('Inn 7');
	});

	test('numbers overtime past regulation, and leaves hockey OT unnumbered', () => {
		expect(formatPeriod(makeGame('nba', { period: 5 }))).toBe('OT1');
		expect(formatPeriod(makeGame('nba', { period: 6 }))).toBe('OT2');
		expect(formatPeriod(makeGame('nhl', { period: 4 }))).toBe('OT');
	});

	// ESPN encodes the shootout as period 5 — verified against the 2016 UCL and 2022 WC finals.
	describe('soccer extra time and penalties', () => {
		const soccer = (period: number) => formatPeriod(makeGame('ucl', { sportType: 'soccer', period }));

		test('labels the two extra-time halves ET1 and ET2, not OT1/OT2', () => {
			expect(soccer(3)).toBe('ET1');
			expect(soccer(4)).toBe('ET2');
		});

		test('labels a penalty shootout PENS rather than a third extra-time period', () => {
			expect(soccer(5)).toBe('PENS');
		});

		test('still reads PENS past period 5, since nothing but penalties follows extra time', () => {
			expect(soccer(6)).toBe('PENS');
		});

		test('leaves NCAA basketball halves on OT numbering — the rule is per sport, not per format', () => {
			expect(formatPeriod(makeGame('ncaab', { period: 3 }))).toBe('OT1');
			expect(formatPeriod(makeGame('ncaab', { period: 4 }))).toBe('OT2');
		});
	});

	test('keeps counting innings into extras', () => {
		expect(formatPeriod(makeGame('mlb', { period: 11 }))).toBe('Inn 11');
	});
});

describe('formatClock', () => {
	test('renders minutes and zero-padded seconds', () => {
		expect(formatClock(402)).toBe('6:42');
		expect(formatClock(65)).toBe('1:05');
		expect(formatClock(0)).toBe('0:00');
	});
});

describe('formatGameClock', () => {
	test('renders soccer as elapsed minutes', () => {
		expect(formatGameClock(makeGame('epl', { sportType: 'soccer', clockSeconds: 2_700 }))).toBe("45'");
	});

	test('renders clock sports as mm:ss', () => {
		expect(formatGameClock(makeGame('nba', { clockSeconds: 402 }))).toBe('6:42');
	});
});

describe('powerScoreColor', () => {
	test('runs from muted slate at zero to brand orange at the ceiling', () => {
		expect(powerScoreColor(0, scoreMaxTotal)).toBe('rgb(139,148,158)');
		expect(powerScoreColor(scoreMaxTotal, scoreMaxTotal)).toBe('rgb(247,92,3)');
	});

	// A manual game boost can push a total past 100, and the gradient has to hold at the top.
	test('clamps above the ceiling', () => {
		expect(powerScoreColor(140, scoreMaxTotal)).toBe('rgb(247,92,3)');
	});

	test('always produces a parseable rgb triple', () => {
		for (const score of [0, 17, 42, 73, 99, 100]) {
			expect(powerScoreColor(score, scoreMaxTotal)).toMatch(/^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/);
		}
	});
});

// The soccer clock keeps counting through stoppage, so nothing here may assume 45 or 90.
describe('formatGameClock through stoppage time', () => {
	test('keeps counting a soccer clock past the end of the half', () => {
		expect(formatGameClock(makeGame('epl', { sportType: 'soccer', clockSeconds: 2_880 }))).toBe("48'");
		expect(formatGameClock(makeGame('epl', { sportType: 'soccer', clockSeconds: 5_700 }))).toBe("95'");
	});

	test('rounds a soccer clock down, so the 44th minute is not reported as the 45th', () => {
		expect(formatGameClock(makeGame('epl', { sportType: 'soccer', clockSeconds: 2_699 }))).toBe("44'");
	});
});

// Every league ArenaSwap tracks, rather than the handful anyone remembers to add a case for. A
// league added with a period format nobody wrote a branch for renders a label all the same — it is
// just the wrong one, on a card somebody is deciding whether to switch to.
describe('formatPeriod labels every league we ship', () => {
	test.each(leagueConfigs.map(config => [config.id, config] as const))('%s', (_id, config) => {
		const label = (period: number) => formatPeriod(makeGame(config.id, {
			sportType: config.sportType,
			period,
		}));
		for (let period = 1; period <= config.regularPeriods + 3; period++) {
			const rendered = label(period);
			expect(rendered).not.toBe('');
			expect(rendered).not.toMatch(/undefined|NaN|null/);
		}
	});

	test.each(leagueConfigs.filter(config => config.sportType === 'soccer').map(config => [config.id, config] as const))(
		'%s runs extra time into a shootout rather than into overtime',
		(_id, config) => {
			const label = (period: number) => formatPeriod(makeGame(config.id, { sportType: 'soccer', period }));
			expect(label(config.regularPeriods + 1)).toBe('ET1');
			expect(label(config.regularPeriods + 2)).toBe('ET2');
			expect(label(config.regularPeriods + 3)).toBe('PENS');
		},
	);

	test.each(leagueConfigs.filter(config => config.periodFormat === 'innings').map(config => [config.id, config] as const))(
		'%s keeps counting innings rather than calling extras overtime',
		(_id, config) => {
			expect(formatPeriod(makeGame(config.id, {
				sportType: config.sportType,
				period: config.regularPeriods + 2,
			}))).toBe(`Inn ${config.regularPeriods + 2}`);
		},
	);

	// An id ESPN starts sending that we have no config for still has to render something.
	test('falls back to a bare period for a league it has never seen', () => {
		expect(formatPeriod(makeGame('not-a-league' as LeagueId, { period: 2 }))).toBe('P2');
	});
});

// A predicate about the calendar of a game, not about its state: the caller ands it with
// `game.intermission`, because period 2 of 4 is the second quarter right up until the whistle.
describe('isHalftime', () => {
	test('finds the midpoint of a sport played in an even number of periods', () => {
		expect(isHalftime(makeGame('nba', { period: 2 }))).toBe(true);
		expect(isHalftime(makeGame('epl', { sportType: 'soccer', period: 1 }))).toBe(true);
		expect(isHalftime(makeGame('nfl', { sportType: 'football', period: 2 }))).toBe(true);
	});

	test('is false anywhere else in a game that has a half', () => {
		expect(isHalftime(makeGame('nba', { period: 1 }))).toBe(false);
		expect(isHalftime(makeGame('nba', { period: 3 }))).toBe(false);
		expect(isHalftime(makeGame('nba', { period: 5 }))).toBe(false);
	});

	// Hockey breaks twice and baseball never, so neither has a half to be at the middle of. Calling
	// the first intermission "Halftime" is the mistake this guards.
	test('never reports a half in a sport that has none', () => {
		for (const period of [1, 2, 3, 4, 5, 6, 7]) {
			expect(isHalftime(makeGame('nhl', { period }))).toBe(false);
			expect(isHalftime(makeGame('mlb', { sportType: 'baseball', period }))).toBe(false);
		}
	});

	test('reports no half for a league it has never seen', () => {
		expect(isHalftime(makeGame('not-a-league' as LeagueId, { period: 1 }))).toBe(false);
	});
});

describe('oddsSummary', () => {
	const withOdds = (odds: Game['odds']) => oddsSummary(makeGame('nfl', { sportType: 'football', odds }));

	test('prints the spread and the total together', () => {
		expect(withOdds({ details: 'PHI -3.5', overUnder: 47.5 })).toBe('PHI -3.5 • O/U 47.5');
	});

	test('prints whichever half of it ESPN actually sent', () => {
		expect(withOdds({ details: 'PHI -3.5' })).toBe('PHI -3.5');
		expect(withOdds({ overUnder: 47.5 })).toBe('O/U 47.5');
	});

	// A whole-number total is published as `44`, and `44.0` reads as a line that moved.
	test('prints a whole total without a decimal, and a half with one', () => {
		expect(withOdds({ overUnder: 44 })).toBe('O/U 44');
		expect(withOdds({ overUnder: 44.5 })).toBe('O/U 44.5');
	});

	test('says nothing at all when there is nothing to say', () => {
		expect(withOdds(undefined)).toBeNull();
		expect(withOdds({})).toBeNull();
	});

	// A sportsbook with no numbers behind it is an attribution, not a line. The card renders the
	// logo from elsewhere; this string must not claim odds exist.
	test('says nothing for a provider that sent no numbers', () => {
		expect(withOdds({ provider: { name: 'ESPN BET' } })).toBeNull();
	});

	// A pick'em really does arrive as zero, and dropping it would lose the most interesting line
	// on the board.
	test('keeps a total of zero, which is a real line rather than a missing one', () => {
		expect(withOdds({ overUnder: 0 })).toBe('O/U 0');
	});
});

// The two rails down the sides of a card are the only thing distinguishing one matchup from the
// next in a list of thirty.
describe('buildGameCardStyle', () => {
	test('paints each rail in the colour resolved for that side', () => {
		const game = makeGame('nba', {
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0, color: '#FF0000' },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0, color: '#00FF00' },
		});
		const style = buildGameCardStyle(game);
		expect(style.borderLeft).toBe('5px solid #FF0000');
		expect(style.borderRight).toBe('5px solid #00FF00');
		expect(style.background).toBe('linear-gradient(to right, #FF000028, #00FF0028), #ffffff');
	});

	test('falls back to the neutral rail for a team with no published colour', () => {
		const style = buildGameCardStyle(makeGame('nba'));
		expect(style.borderLeft).toBe('5px solid #dee2e6');
		expect(style.borderRight).toBe('5px solid #dee2e6');
	});

	// Two clubs who publish near-identical navies would otherwise get two rails nobody can tell
	// apart, which is the whole reason the pair is resolved rather than read straight off.
	test('keeps the two rails distinguishable when both clubs publish the same navy', () => {
		const derby = makeGame('mlb', {
			sportType: 'baseball',
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'NYY', score: 0, color: '#0C2340', alternateColor: '#FFFFFF' },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'DET', score: 0, color: '#0C2340', alternateColor: '#FA4616' },
		});
		const style = buildGameCardStyle(derby);
		expect(style.borderLeft).not.toBe(style.borderRight);
	});
});

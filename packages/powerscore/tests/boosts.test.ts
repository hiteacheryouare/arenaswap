import { boostPoints, boostBucketCaps, scoreGame, signalPoints } from '../src';
import type { Game, PowerScore, RedCard, ScoringContext, Side } from '../src';

const momentBoostIds = ['scoringOpportunity', 'goAheadRun', 'twoMinuteDrill', 'redCard'];

const momentTotal = (score: PowerScore): number => momentBoostIds.reduce((total, id) => total + boostPoints(score, id), 0);

const classic = (game: Game<string>, context: ScoringContext = {}): PowerScore => scoreGame(game, context, { mode: 'classic' });

interface Diamond {
	inning: number;
	half: 'top' | 'bottom';
	home: number;
	away: number;
	outs?: number;
	on?: [boolean, boolean, boolean];
	homeHits?: number;
	awayHits?: number;
	sportType?: 'baseball' | 'softball';
}

const ballgame = ({ inning, half, home, away, outs = 0, on = [false, false, false], homeHits = 7, awayHits = 7, sportType = 'baseball' }: Diamond): Game<string> => ({
	id: 'sea-hou',
	league: sportType === 'baseball' ? 'mlb' : 'csoft',
	sportType,
	homeTeam: { abbreviation: 'HOU', score: home, hits: homeHits },
	awayTeam: { abbreviation: 'SEA', score: away, hits: awayHits },
	period: inning,
	topOfInning: half === 'top',
	outs,
	baseRunners: { first: on[0], second: on[1], third: on[2] },
	status: 'in',
});

describe('the go-ahead run on base', () => {
	test('bases loaded, down two, bottom of the 9th fills the moment bucket exactly', () => {
		const score = classic(ballgame({ inning: 9, half: 'bottom', home: 3, away: 5, outs: 1, on: [true, true, true] }));
		expect(boostPoints(score, 'scoringOpportunity')).toBe(10);
		expect(boostPoints(score, 'goAheadRun')).toBe(10);
		expect(momentTotal(score)).toBe(boostBucketCaps.moment);
	});

	test('a bottom-of-the-9th rally pays more with every runner, until the third out strands them', () => {
		const down2 = (on: [boolean, boolean, boolean], outs = 0) => classic(ballgame({ inning: 9, half: 'bottom', home: 2, away: 4, outs, on }));

		const leadoffWalk = down2([true, false, false]);
		expect([boostPoints(leadoffWalk, 'scoringOpportunity'), boostPoints(leadoffWalk, 'goAheadRun')]).toEqual([3, 0]);

		// Tying run on, go-ahead run at the plate: 5 × 1.25.
		const single = down2([true, true, false]);
		expect([boostPoints(single, 'scoringOpportunity'), boostPoints(single, 'goAheadRun')]).toEqual([6, 6]);

		const loaded = down2([true, true, true], 1);
		expect([boostPoints(loaded, 'scoringOpportunity'), boostPoints(loaded, 'goAheadRun')]).toEqual([10, 10]);

		const tyingSingle = classic(ballgame({ inning: 9, half: 'bottom', home: 4, away: 4, outs: 1, on: [true, true, false] }));
		expect([boostPoints(tyingSingle, 'scoringOpportunity'), boostPoints(tyingSingle, 'goAheadRun')]).toEqual([6, 10]);

		const stranded = classic(ballgame({ inning: 9, half: 'bottom', home: 4, away: 4, outs: 3, on: [true, true, false] }));
		expect(momentTotal(stranded)).toBe(0);

		expect(leadoffWalk.total).toBeLessThan(single.total);
		expect(single.total).toBeLessThan(loaded.total);
	});

	test('the same go-ahead threat is worth half in the 3rd and grows through the late innings', () => {
		const tiedRunnerOn = (inning: number) => boostPoints(classic(ballgame({ inning, half: 'top', home: 1, away: 1, on: [true, false, false] })), 'goAheadRun');
		expect(tiedRunnerOn(3)).toBe(4);
		expect(tiedRunnerOn(6)).toBe(4);
		expect(tiedRunnerOn(7)).toBe(5);
		// A tied road team in the 9th is guaranteed nothing extra: the home team still bats.
		expect(tiedRunnerOn(9)).toBe(8);
	});

	test('a trailing road team in the 9th gets the last-chance factor', () => {
		const score = classic(ballgame({ inning: 9, half: 'top', home: 3, away: 2, on: [false, true, false] }));
		expect(boostPoints(score, 'goAheadRun')).toBe(6);
	});

	test('an extra-inning automatic runner pays 13 in the bottom half and 11 in the top', () => {
		const ghostRunner = (half: 'top' | 'bottom') => momentTotal(classic(ballgame({ inning: 10, half, home: 3, away: 3, on: [false, true, false] })));
		expect(ghostRunner('bottom')).toBe(13);
		expect(ghostRunner('top')).toBe(11);
	});

	test('down three with the bases loaded is the tying run on base, not the go-ahead', () => {
		const score = classic(ballgame({ inning: 9, half: 'bottom', home: 1, away: 4, on: [true, true, true] }));
		expect(boostPoints(score, 'goAheadRun')).toBe(6);
	});

	test('the leading team with runners on gets only the runner count', () => {
		const score = classic(ballgame({ inning: 9, half: 'bottom', home: 5, away: 2, on: [true, true, true] }));
		expect(boostPoints(score, 'goAheadRun')).toBe(0);
		expect(boostPoints(score, 'scoringOpportunity')).toBe(10);
	});
});

describe('a no-hit bid', () => {
	// Houston (home, pitching the tops) leads 2-0 and Seattle has no hits.
	const bid = (inning: number, half: 'top' | 'bottom', outs = 0, awayHits = 0) => (
		classic(ballgame({ inning, half, home: 2, away: 0, outs, awayHits, homeHits: 6 }))
	);

	test('grows inning by inning and out by out, eases while the staff bats, and ends on the first hit', () => {
		const innings: Array<[number, 'top' | 'bottom', number, number]> = [
			[5, 'top', 0, 0],
			[5, 'bottom', 0, 7],
			[6, 'top', 0, 10],
			[6, 'top', 1, 14],
			[6, 'top', 2, 18],
			[6, 'bottom', 1, 15],
			[7, 'top', 0, 22],
			[7, 'top', 1, 27],
			[7, 'top', 2, 33],
			[7, 'bottom', 0, 27],
			[8, 'top', 0, 38],
			[8, 'top', 1, 43],
			[8, 'top', 2, 47],
			[8, 'bottom', 2, 36],
			[9, 'top', 0, 52],
			[9, 'top', 1, 57],
			[9, 'top', 2, 62],
		];
		expect(innings.map(([inning, half, outs]) => boostPoints(bid(inning, half, outs), 'noHitter')))
			.toEqual(innings.map(([, , , expected]) => expected));

		const brokenUp = bid(9, 'top', 2, 1);
		expect(boostPoints(brokenUp, 'noHitter')).toBe(0);
		expect(brokenUp.total).toBe(brokenUp.baseTotal);
		expect(bid(9, 'top', 2).total).toBe(100);
	});

	test('a 6-0 no-hitter reaches 49 in the 8th and 77 with two outs in the 9th, level with a tied 9th', () => {
		const sixNothing = (inning: number, outs: number) => classic(ballgame({ inning, half: 'top', home: 6, away: 0, outs, awayHits: 0 }));
		expect(sixNothing(8, 0).total).toBe(49);
		expect(sixNothing(9, 2).total).toBe(77);

		const tiedNinth = classic(ballgame({ inning: 9, half: 'bottom', home: 3, away: 3 }));
		expect(Math.abs(sixNothing(9, 2).total - tiedNinth.total)).toBeLessThanOrEqual(2);
		expect(sixNothing(8, 0).total).toBeGreaterThan(classic(ballgame({ inning: 6, half: 'top', home: 3, away: 3 })).total);
	});

	test('the road staff pitches the bottoms, so its bid counts innings the same way', () => {
		const roadBid = (inning: number, half: 'top' | 'bottom', outs: number) => (
			boostPoints(classic(ballgame({ inning, half, home: 0, away: 1, outs, homeHits: 0, awayHits: 4 })), 'noHitter')
		);
		expect(roadBid(6, 'top', 0)).toBe(7);
		expect(roadBid(6, 'bottom', 0)).toBe(10);
		expect(roadBid(9, 'bottom', 2)).toBe(62);
	});

	test('pays in full while the pitching team is losing', () => {
		const losingBid = classic(ballgame({ inning: 8, half: 'top', home: 0, away: 1, homeHits: 5, awayHits: 0 }));
		expect(boostPoints(losingBid, 'noHitter')).toBe(38);
	});

	test('two hitless lineups pay the larger bid and half the smaller, inside the no-hitter cap', () => {
		const doubleBid = (inning: number, outs: number) => classic(ballgame({ inning, half: 'top', home: 0, away: 0, outs, homeHits: 0, awayHits: 0 }));
		// Houston pitching through 6 with an out (22 + 5.3), Seattle batting through 6 (22 × 0.7).
		expect(boostPoints(doubleBid(7, 1), 'noHitter')).toBe(35);
		expect(boostPoints(doubleBid(9, 2), 'noHitter')).toBe(boostBucketCaps.noHitter);
	});

	test('the moment cap leaves the no-hitter alone', () => {
		const score = classic(ballgame({ inning: 9, half: 'top', home: 1, away: 0, outs: 2, on: [true, true, true], homeHits: 4, awayHits: 0 }));
		expect(boostPoints(score, 'noHitter')).toBe(62);
		expect(momentTotal(score)).toBe(boostBucketCaps.moment);
	});

	test('softball starts after three hitless innings and pays 60%', () => {
		const softball = (inning: number, outs: number) => (
			boostPoints(classic(ballgame({ inning, half: 'top', home: 1, away: 0, outs, awayHits: 0, sportType: 'softball' })), 'noHitter')
		);
		expect(softball(4, 0)).toBe(6);
		expect(softball(7, 2)).toBe(37);
	});

	test('comes back when a hit is changed to an error', () => {
		expect(boostPoints(bid(8, 'top', 1, 1), 'noHitter')).toBe(0);
		expect(boostPoints(bid(8, 'top', 1, 0), 'noHitter')).toBe(43);
	});

	test('pays nothing when the feed does not report hits', () => {
		const unknownHits: Game<string> = { ...ballgame({ inning: 9, half: 'top', home: 2, away: 0, outs: 2 }), awayTeam: { abbreviation: 'SEA', score: 0 } };
		expect(boostPoints(classic(unknownHits), 'noHitter')).toBe(0);
	});
});

interface Possession {
	secs: number;
	yards: number;
	trailBy: number;
	timeouts?: number;
	period?: number;
	league?: string;
	down?: number;
}

// Kansas City (home) has the ball.
const drive = ({ secs, yards, trailBy, timeouts = 3, period = 4, league = 'nfl', down = 1 }: Possession): Game<string> => ({
	id: 'buf-kc',
	league,
	sportType: 'football',
	homeTeam: { abbreviation: 'KC', score: 20, timeouts },
	awayTeam: { abbreviation: 'BUF', score: 20 + trailBy, timeouts: 3 },
	period,
	clockSeconds: secs,
	status: 'in',
	possession: 'home',
	yardsToEndZone: yards,
	down,
	distance: 10,
	isRedZone: yards <= 20,
});

describe('the two-minute drill', () => {
	test('peaks at 12: tied, inside the 35, under 0:40, three timeouts', () => {
		expect(boostPoints(classic(drive({ secs: 35, yards: 34, trailBy: 0 })), 'twoMinuteDrill')).toBe(12);
	});

	test('a drive from the 4:00 mark builds until the touchdown ends it', () => {
		const drill = (possession: Possession) => boostPoints(classic(drive(possession)), 'twoMinuteDrill');
		expect(drill({ secs: 241, yards: 75, trailBy: 4 })).toBe(0);
		expect(drill({ secs: 240, yards: 75, trailBy: 4 })).toBe(2);
		expect(drill({ secs: 120, yards: 50, trailBy: 4, timeouts: 2 })).toBe(5);
		expect(drill({ secs: 60, yards: 30, trailBy: 4, timeouts: 1 })).toBe(8);
		expect(drill({ secs: 28, yards: 12, trailBy: 4, timeouts: 1 })).toBe(9);

		const afterTouchdown: Game<string> = { ...drive({ secs: 22, yards: 2, trailBy: 4 }), homeTeam: { abbreviation: 'KC', score: 27, timeouts: 1 }, down: -1 };
		expect(boostPoints(classic(afterTouchdown), 'twoMinuteDrill')).toBe(0);
	});

	test('the red zone and the drill stack, and the moment cap pays the red zone first', () => {
		const goalLineFourth = classic(drive({ secs: 10, yards: 3, trailBy: 4, down: 4 }));
		const goalLineFourthGoalToGo = classic({ ...drive({ secs: 10, yards: 3, trailBy: 4, down: 4 }), isGoalToGo: true });
		expect(boostPoints(goalLineFourth, 'scoringOpportunity')).toBe(14);
		expect(boostPoints(goalLineFourth, 'twoMinuteDrill')).toBe(6);
		expect(boostPoints(goalLineFourthGoalToGo, 'scoringOpportunity')).toBe(15);
		expect(boostPoints(goalLineFourthGoalToGo, 'twoMinuteDrill')).toBe(5);
		expect(momentTotal(goalLineFourthGoalToGo)).toBe(boostBucketCaps.moment);
	});

	test('a tied game waits for the two-minute mark; a trailing one starts at four', () => {
		expect(boostPoints(classic(drive({ secs: 150, yards: 60, trailBy: 0 })), 'twoMinuteDrill')).toBe(0);
		expect(boostPoints(classic(drive({ secs: 150, yards: 60, trailBy: 3 })), 'twoMinuteDrill')).toBeGreaterThan(0);
	});

	test('the leader running out the clock earns nothing', () => {
		expect(boostPoints(classic(drive({ secs: 90, yards: 40, trailBy: -3 })), 'twoMinuteDrill')).toBe(0);
	});

	test('more than one score down is no drill in the NFL, but nine is one score in the UFL', () => {
		expect(boostPoints(classic(drive({ secs: 30, yards: 30, trailBy: 9 })), 'twoMinuteDrill')).toBe(0);
		expect(boostPoints(classic(drive({ secs: 30, yards: 30, trailBy: 9, league: 'ufl' })), 'twoMinuteDrill')).toBe(8);
	});

	test('pays in NFL overtime but not in college overtime, which has no clock', () => {
		expect(boostPoints(classic(drive({ secs: 30, yards: 30, trailBy: 0, period: 5 })), 'twoMinuteDrill')).toBe(12);
		expect(boostPoints(classic(drive({ secs: 30, yards: 20, trailBy: 0, period: 5, league: 'ncaaf' })), 'twoMinuteDrill')).toBe(0);
	});

	test('college gives less credit for the same midfield spot, since its kickers need to get closer', () => {
		expect(boostPoints(classic(drive({ secs: 30, yards: 50, trailBy: 0 })), 'twoMinuteDrill')).toBe(10);
		expect(boostPoints(classic(drive({ secs: 30, yards: 50, trailBy: 0, league: 'ncaaf' })), 'twoMinuteDrill')).toBe(9);
		expect(boostPoints(classic(drive({ secs: 30, yards: 30, trailBy: 0, league: 'ncaaf' })), 'twoMinuteDrill')).toBe(12);
	});

	test('nothing in the 3rd quarter, and nothing at halftime', () => {
		expect(boostPoints(classic(drive({ secs: 30, yards: 30, trailBy: 0, period: 3 })), 'twoMinuteDrill')).toBe(0);
		expect(classic({ ...drive({ secs: 30, yards: 30, trailBy: 0 }), intermission: true }).total).toBe(0);
	});
});

interface Match {
	minute: number;
	home: number;
	away: number;
	cards?: RedCard[];
	league?: string;
}

// Arsenal at home to Chelsea, on a full-game elapsed clock.
const match = ({ minute, home, away, cards, league = 'epl' }: Match): Game<string> => ({
	id: 'che-ars',
	league,
	sportType: 'soccer',
	homeTeam: { abbreviation: 'ARS', score: home },
	awayTeam: { abbreviation: 'CHE', score: away },
	period: minute > 45 ? 2 : 1,
	clockSeconds: minute * 60,
	status: 'in',
	...(cards ? { redCards: cards } : {}),
});

const card = (side: Side, minute: number): RedCard => ({ side, minute });

describe('a red card', () => {
	test('in a level game pays 10, then fades to nothing over the next ten minutes', () => {
		const cards = [card('away', 60)];
		const fade = [60, 61, 62, 63, 66, 69, 70, 75].map(minute => boostPoints(classic(match({ minute, home: 0, away: 0, cards })), 'redCard'));
		expect(fade).toEqual([10, 10, 10, 9, 5, 1, 0, 0]);
	});

	test('is sized by who was sent off and the score after it', () => {
		const sentOff = (side: Side, home: number, away: number) => boostPoints(classic(match({ minute: 70, home, away, cards: [card(side, 70)] })), 'redCard');
		expect(sentOff('home', 1, 0)).toBe(10);
		expect(sentOff('away', 1, 0)).toBe(7);
		expect(sentOff('home', 2, 0)).toBe(5);
		expect(sentOff('away', 2, 0)).toBe(0);
		expect(sentOff('home', 3, 0)).toBe(0);
	});

	test('a goal after the card that opens the game up ends it early', () => {
		const cards = [card('home', 70)];
		expect(boostPoints(classic(match({ minute: 72, home: 1, away: 0, cards })), 'redCard')).toBe(10);
		expect(boostPoints(classic(match({ minute: 73, home: 1, away: 2, cards })), 'redCard')).toBe(6);
		expect(boostPoints(classic(match({ minute: 74, home: 1, away: 3, cards })), 'redCard')).toBe(0);
	});

	test('a second red to the same team is worth half again, and several cards pay the biggest, not the sum', () => {
		const downToNine = classic(match({ minute: 80, home: 0, away: 0, cards: [card('away', 60), card('away', 80)] }));
		expect(boostPoints(downToNine, 'redCard')).toBe(15);

		const oneEach = classic(match({ minute: 81, home: 0, away: 0, cards: [card('away', 80), card('home', 81)] }));
		expect(boostPoints(oneEach, 'redCard')).toBe(10);
	});

	test('pays nothing at halftime', () => {
		const halftime = { ...match({ minute: 45, home: 0, away: 0, cards: [card('home', 44)] }), intermission: true };
		expect(classic(halftime).total).toBe(0);
	});

	test('ten men protecting a one-goal lead raise closeness by 4 for as long as the lead stands', () => {
		const tenMenLead = (minute: number) => signalPoints(classic(match({ minute, home: 1, away: 0, cards: [card('home', 30)] })), 'closeness');
		const elevenMenLead = (minute: number) => signalPoints(classic(match({ minute, home: 1, away: 0 })), 'closeness');
		expect(tenMenLead(60) - elevenMenLead(60)).toBe(4);
		expect(tenMenLead(85) - elevenMenLead(85)).toBeLessThanOrEqual(4);
		expect(tenMenLead(85)).toBeGreaterThan(elevenMenLead(85));
		expect(tenMenLead(90)).toBeLessThanOrEqual(42);
	});

	test('no siege when the full side leads, or when it is level', () => {
		const closenessWith = (home: number, away: number, cards?: RedCard[]) => signalPoints(classic(match({ minute: 60, home, away, ...(cards ? { cards } : {}) })), 'closeness');
		expect(closenessWith(1, 0, [card('away', 30)])).toBe(closenessWith(1, 0));
		expect(closenessWith(1, 1, [card('home', 30)])).toBe(closenessWith(1, 1));
	});
});

interface Rink {
	period: number;
	secs: number;
	home: number;
	away: number;
}

const rink = ({ period, secs, home, away }: Rink): Game<string> => ({
	id: 'tor-bos',
	league: 'nhl',
	sportType: 'hockey',
	homeTeam: { abbreviation: 'BOS', score: home },
	awayTeam: { abbreviation: 'TOR', score: away },
	period,
	clockSeconds: secs,
	status: 'in',
});

describe('hockey: the empty net and the power play are scoring opportunities', () => {
	const chance = (game: Game<string>, context: ScoringContext) => boostPoints(classic(game, context), 'scoringOpportunity');

	// The scoreboard can read 0:00 of the 3rd, still live, for a poll before it calls the period over.
	test('a game decided at the horn pays no empty net, as it pays no power play', () => {
		const horn = rink({ period: 3, secs: 0, home: 2, away: 1 });
		expect(chance(horn, { powerPlay: true })).toBe(0);
		expect(chance(horn, { emptyNet: true })).toBe(0);
	});

	test('a pulled goalie late in the 3rd pays 12 down one and 7 down two', () => {
		const pulled = (home: number, away: number, secs = 90) => chance(rink({ period: 3, secs, home, away }), { emptyNet: true });
		expect(pulled(2, 1)).toBe(12);
		expect(pulled(3, 1)).toBe(7);
		expect(pulled(2, 2)).toBe(0);
		expect(pulled(4, 1)).toBe(0);
		expect(pulled(2, 1, 241)).toBe(0);
	});

	test('the leader\'s empty net is a delayed penalty and pays nothing', () => {
		const net = (side: Side) => chance(rink({ period: 3, secs: 90, home: 2, away: 1 }), { emptyNet: side });
		expect(net('away')).toBe(12);
		expect(net('home')).toBe(0);
	});

	test('no empty net in overtime or the 2nd period', () => {
		expect(chance(rink({ period: 4, secs: 90, home: 2, away: 2 }), { emptyNet: true })).toBe(0);
		expect(chance(rink({ period: 2, secs: 90, home: 2, away: 1 }), { emptyNet: true })).toBe(0);
	});

	test('a power play without a side follows the side-free table', () => {
		const pp = (period: number, home: number, away: number) => chance(rink({ period, secs: 600, home, away }), { powerPlay: true });
		expect([pp(1, 1, 1), pp(2, 2, 1), pp(2, 3, 1), pp(2, 4, 1)]).toEqual([4, 3, 2, 0]);
		expect([pp(3, 1, 1), pp(3, 2, 1), pp(3, 3, 1), pp(3, 4, 1)]).toEqual([10, 7, 3, 0]);
		expect(pp(4, 2, 2)).toBe(10);
	});

	test('with a side, the trailing team\'s power play is worth twice the leader\'s', () => {
		const pp = (side: Side, period: number, home: number, away: number) => chance(rink({ period, secs: 600, home, away }), { powerPlay: side });
		expect(pp('away', 3, 2, 1)).toBe(10);
		expect(pp('home', 3, 2, 1)).toBe(5);
		expect(pp('away', 3, 3, 1)).toBe(5);
		expect(pp('home', 3, 3, 1)).toBe(0);
		expect(pp('away', 2, 2, 1)).toBe(4);
		expect(pp('home', 2, 2, 1)).toBe(2);
	});

	test('a 6-on-4 stacks both, and the moment cap holds it at 20', () => {
		const sixOnFour = classic(rink({ period: 3, secs: 60, home: 2, away: 1 }), { emptyNet: 'away', powerPlay: 'away' });
		expect(boostPoints(sixOnFour, 'scoringOpportunity')).toBe(boostBucketCaps.moment);
		expect(momentTotal(sixOnFour)).toBe(boostBucketCaps.moment);
	});

	test('neither is a line item of its own', () => {
		const ids = classic(rink({ period: 3, secs: 60, home: 2, away: 1 }), { emptyNet: 'away', powerPlay: 'away' }).boosts.map(boost => boost.id);
		expect(ids).not.toContain('powerPlay');
		expect(ids).not.toContain('emptyNet');
	});

	test('pays nothing during an intermission', () => {
		const intermission = { ...rink({ period: 3, secs: 1200, home: 2, away: 1 }), intermission: true };
		expect(classic(intermission, { powerPlay: true, emptyNet: true }).total).toBe(0);
	});
});

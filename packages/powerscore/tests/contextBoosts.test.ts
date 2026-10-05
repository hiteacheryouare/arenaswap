import { boostBucketCaps, boostPoints, scoreGame, signalPoints, underdogProbability } from '../src';
import type { Game, PowerScore, PregameLine, ScoreSnapshot, ScoringContext, SeriesState, TeamStakes } from '../src';

const classic = (game: Game<string>, context: ScoringContext = {}): PowerScore => scoreGame(game, context, { mode: 'classic' });

interface Court {
	period: number;
	secs: number;
	home: number;
	away: number;
	league?: string;
}

const court = ({ period, secs, home, away, league = 'nba' }: Court, extra: Partial<Game<string>> = {}): Game<string> => ({
	id: 'okc-den',
	league,
	sportType: 'basketball',
	homeTeam: { abbreviation: 'OKC', score: home },
	awayTeam: { abbreviation: 'DEN', score: away },
	period,
	clockSeconds: secs,
	status: 'in',
	...extra,
});

interface Gridiron {
	period: number;
	secs: number;
	home: number;
	away: number;
}

const gridiron = ({ period, secs, home, away }: Gridiron): Game<string> => ({
	id: 'nyj-kc',
	league: 'nfl',
	sportType: 'football',
	homeTeam: { abbreviation: 'KC', score: home },
	awayTeam: { abbreviation: 'NYJ', score: away },
	period,
	clockSeconds: secs,
	status: 'in',
});

const homeLaying = (spread: number): PregameLine => ({ favorite: 'home', spread });

const nwsl = (minute: number, home: number, away: number): Game<string> => ({
	id: 'bay-kc',
	league: 'nwsl',
	sportType: 'soccer',
	homeTeam: { abbreviation: 'KC', score: home },
	awayTeam: { abbreviation: 'BAY', score: away },
	period: minute > 45 ? 2 : 1,
	clockSeconds: minute * 60,
	status: 'in',
});

describe('the underdog\'s pregame chance', () => {
	test('a 7-point NFL underdog wins about 30% of the time', () => {
		expect(underdogProbability(homeLaying(7), 'football', 'nfl')).toBeCloseTo(0.3, 2);
	});

	test('takes the vig out of a two-way moneyline, and ignores the spread when it has one', () => {
		const line: PregameLine = { favorite: 'home', spread: 5.5, favoriteMoneyline: -240, underdogMoneyline: 190 };
		const favorite = 240 / 340;
		const underdog = 100 / 290;
		expect(underdogProbability(line, 'basketball', 'nba')).toBeCloseTo(underdog / (underdog + favorite), 6);
	});

	test('counts a draw as half an upset on a three-way line', () => {
		const line: PregameLine = { favorite: 'home', favoriteMoneyline: -225, underdogMoneyline: 450, drawMoneyline: 390 };
		const [favorite, underdog, draw] = [225 / 325, 100 / 550, 100 / 490];
		const total = favorite + underdog + draw;
		expect(underdogProbability(line, 'soccer', 'nwsl')).toBeCloseTo(underdog / total + 0.5 * draw / total, 6);
	});

	test('a puck line, a run line or a pick\'em says nothing about how big the favorite is', () => {
		expect(underdogProbability(homeLaying(1.5), 'hockey', 'nhl')).toBeUndefined();
		expect(underdogProbability(homeLaying(1.5), 'baseball', 'mlb')).toBeUndefined();
		expect(underdogProbability({ favorite: 'home' }, 'basketball', 'nba')).toBeUndefined();
	});

	test('a league without its own spread width falls back to its sport\'s', () => {
		expect(underdogProbability(homeLaying(7), 'football', 'some-new-league')).toBeCloseTo(0.3, 2);
	});
});

describe('upset watch', () => {
	test('a 14-point NFL underdog hanging around builds through the second half', () => {
		const context = { pregameLine: homeLaying(14) };
		const upset = (game: Gridiron) => boostPoints(classic(gridiron(game), context), 'upsetWatch');
		expect(upset({ period: 1, secs: 300, home: 0, away: 7 })).toBe(0);
		expect(upset({ period: 3, secs: 600, home: 10, away: 14 })).toBe(5);
		expect(upset({ period: 4, secs: 600, home: 10, away: 14 })).toBe(10);
		expect(upset({ period: 4, secs: 300, home: 17, away: 17 })).toBe(8);
		expect(upset({ period: 4, secs: 120, home: 24, away: 17 })).toBe(5);
		expect(upset({ period: 4, secs: 120, home: 26, away: 17 })).toBe(0);
	});

	test('the favorite leading pays nothing, and neither does a game with no line', () => {
		expect(boostPoints(classic(gridiron({ period: 4, secs: 120, home: 17, away: 17 })), 'upsetWatch')).toBe(0);
		expect(boostPoints(classic(gridiron({ period: 4, secs: 120, home: 17, away: 17 }), { pregameLine: { favorite: 'away', spread: 14 } }), 'upsetWatch')).toBe(8);
	});

	test('a 15-point NBA underdog leading late is the full 12', () => {
		expect(boostPoints(classic(court({ period: 4, secs: 300, home: 98, away: 101 }), { pregameLine: homeLaying(15) }), 'upsetWatch')).toBe(12);
	});

	test('a soccer underdog holding a draw late earns 70% of a lead', () => {
		const line: PregameLine = { favorite: 'home', favoriteMoneyline: -225, underdogMoneyline: 450, drawMoneyline: 390 };
		expect(boostPoints(classic(nwsl(75, 1, 1), { pregameLine: line }), 'upsetWatch')).toBe(4);
		expect(boostPoints(classic(nwsl(75, 1, 2), { pregameLine: line }), 'upsetWatch')).toBe(5);
		expect(boostPoints(classic(nwsl(30, 1, 2), { pregameLine: line }), 'upsetWatch')).toBe(0);
	});

	test('Blowouts pays the underdog running the favorite off the floor, and only that', () => {
		const rout = (home: number, away: number) => boostPoints(
			scoreGame(court({ period: 4, secs: 300, home, away }), { pregameLine: homeLaying(15) }, { mode: 'blowouts' }),
			'upsetRout',
		);
		expect(rout(80, 101)).toBe(12);
		expect(rout(90, 101)).toBe(0);
		expect(rout(101, 80)).toBe(0);
	});
});

const playoffs = (series: SeriesState, margin = 3, extra: Partial<Game<string>> = {}): Game<string> => (
	court({ period: 4, secs: 300, home: 100, away: 100 - margin }, { seasonType: 'postseason', series, ...extra })
);

const seriesStakes = (homeWins: number, awayWins: number, bestOf: number) => boostPoints(classic(playoffs({ homeWins, awayWins, bestOf })), 'stakes');

describe('stakes: a postseason series', () => {
	test('a deciding game is worth 10 in a best-of-7, 9 in a best-of-5 and 8 in a best-of-3', () => {
		expect(seriesStakes(3, 3, 7)).toBe(10);
		expect(seriesStakes(2, 2, 5)).toBe(9);
		expect(seriesStakes(1, 1, 3)).toBe(8);
	});

	test('an elimination game is worth more the closer the series', () => {
		expect([seriesStakes(3, 2, 7), seriesStakes(1, 3, 7), seriesStakes(3, 0, 7)]).toEqual([7, 5, 4]);
		expect([seriesStakes(2, 1, 5), seriesStakes(0, 2, 5)]).toEqual([6, 4]);
		expect(seriesStakes(1, 0, 3)).toBe(5);
	});

	test('a game nobody can be eliminated in pays nothing', () => {
		expect([seriesStakes(2, 2, 7), seriesStakes(1, 0, 7), seriesStakes(0, 0, 5)]).toEqual([0, 0, 0]);
	});

	test('a single-game series has no series stakes', () => {
		expect(seriesStakes(0, 0, 1)).toBe(0);
	});

	test('with the postseason boost, a first-round Game 7 outranks a Finals Game 1, and a Finals Game 7 is 18', () => {
		const withPostseason = (series: SeriesState, postseasonRound: 0 | 3) => {
			const score = scoreGame(playoffs(series, 3, { postseasonRound }), {}, { mode: 'classic', postseasonBoostPoints: 8 });
			return boostPoints(score, 'stakes') + boostPoints(score, 'postseasonBoost');
		};
		expect(withPostseason({ homeWins: 3, awayWins: 3, bestOf: 7 }, 3)).toBe(12);
		expect(withPostseason({ homeWins: 0, awayWins: 0, bestOf: 7 }, 0)).toBe(8);
		expect(withPostseason({ homeWins: 3, awayWins: 3, bestOf: 7 }, 0)).toBe(18);
	});

	test('a Game 7 that has been decided on the scoreboard has nothing left to decide', () => {
		const gameSeven = { homeWins: 3, awayWins: 3, bestOf: 7 };
		expect(boostPoints(classic(playoffs(gameSeven, 14)), 'stakes')).toBe(5);
		expect(boostPoints(classic(playoffs(gameSeven, 25)), 'stakes')).toBe(0);
		const earlyBlowout = court({ period: 2, secs: 300, home: 50, away: 25 }, { seasonType: 'postseason', series: gameSeven });
		expect(boostPoints(classic(earlyBlowout), 'stakes')).toBe(5);
	});

	test('a series in the regular season is ignored', () => {
		expect(boostPoints(classic(playoffs({ homeWins: 3, awayWins: 3, bestOf: 7 }, 3, { seasonType: 'regular' })), 'stakes')).toBe(0);
	});
});

const ranked = (homeRank: number | undefined, awayRank: number | undefined, extra: Partial<Game<string>> = {}): number => {
	const game = court({ period: 2, secs: 600, home: 30, away: 28, league: 'ncaab' }, extra);
	return boostPoints(classic({
		...game,
		homeTeam: { ...game.homeTeam, ...(homeRank !== undefined ? { rank: homeRank } : {}) },
		awayTeam: { ...game.awayTeam, ...(awayRank !== undefined ? { rank: awayRank } : {}) },
	}), 'stakes');
};

describe('stakes: ranked teams in the regular season', () => {
	test('follows the ranked-matchup table', () => {
		expect(ranked(2, 5)).toBe(6);
		expect(ranked(3, 8)).toBe(5);
		expect(ranked(7, 20)).toBe(4);
		expect(ranked(12, 22)).toBe(3);
		expect(ranked(4, undefined)).toBe(0);
		expect(ranked(4, 26)).toBe(0);
	});

	test('a ranking in the postseason is ignored, since it may be a bracket seed', () => {
		expect(ranked(1, 2, { seasonType: 'postseason' })).toBe(0);
	});
});

describe('stakes: late-season races', () => {
	const race = (home: TeamStakes | undefined, away: TeamStakes | undefined, extra: Partial<Game<string>> = {}) => boostPoints(
		classic(court({ period: 4, secs: 300, home: 100, away: 97 }, extra), { stakes: { ...(home ? { home } : {}), ...(away ? { away } : {}) } }),
		'stakes',
	);

	test('pays the bigger side in full and half the other, up to 6', () => {
		expect(race({ inRace: true }, undefined)).toBe(3);
		expect(race({ canClinch: true }, undefined)).toBe(5);
		expect(race({ canClinch: true }, { inRace: true })).toBe(6);
		expect(race({ inRace: true }, { inRace: true })).toBe(5);
		expect(race({ nearLine: 'topQualification' }, undefined)).toBe(4);
		expect(race({ nearLine: 'relegation' }, { nearLine: 'relegation' })).toBe(6);
		expect(race({ nearLine: 'title' }, { nearLine: 'other' })).toBe(6);
	});

	test('a race in the postseason is ignored, since the series already says what is at stake', () => {
		expect(race({ canClinch: true }, { inRace: true }, { seasonType: 'postseason' })).toBe(0);
	});

	test('ranking and a race together stop at 10', () => {
		const game = court({ period: 2, secs: 300, home: 70, away: 68, league: 'ncaab' });
		const topFive: Game<string> = { ...game, homeTeam: { ...game.homeTeam, rank: 1 }, awayTeam: { ...game.awayTeam, rank: 3 } };
		expect(boostPoints(classic(topFive, { stakes: { home: { canClinch: true }, away: { canClinch: true } } }), 'stakes')).toBe(10);
	});
});

describe('the context bucket', () => {
	test('upset and stakes together stop at 16, upset paid first', () => {
		const gameSeven = playoffs({ homeWins: 3, awayWins: 3, bestOf: 7 }, -3);
		const score = classic(gameSeven, { pregameLine: homeLaying(15) });
		expect(boostPoints(score, 'upsetWatch')).toBe(12);
		expect(boostPoints(score, 'stakes')).toBe(boostBucketCaps.context - 12);
	});
});

const pollStart = Date.UTC(2026, 9, 3, 23, 30);

const history = (rows: Array<[number, number]>): ScoreSnapshot[] => (
	rows.map(([homeScore, awayScore], index) => ({ gameId: 'okc-den', timestamp: pollStart + index * 20_000, homeScore, awayScore }))
);

describe('lead changes from the play log', () => {
	const late = court({ period: 4, secs: 240, home: 101, away: 99 });

	test('counts flips the snapshots never saw, faded from when the log says the last one happened', () => {
		const steadyLead = history([[97, 95], [99, 97], [101, 99]]);
		const now = steadyLead[2]!.timestamp;
		const score = classic(late, { history: steadyLead, recentLeadChanges: { count: 2, lastAt: now - 30_000 } });
		expect(signalPoints(score, 'leadChanges')).toBe(13);
		expect(score.reasons.map(reason => reason.key)).toContain('tradingLeads');
	});

	test('a log that counts no more than the snapshots changes nothing', () => {
		const oneFlip = history([[97, 99], [99, 99], [101, 99]]);
		const withoutLog = classic(late, { history: oneFlip });
		const withLog = classic(late, { history: oneFlip, recentLeadChanges: { count: 1, lastAt: pollStart - 600_000 } });
		expect(signalPoints(withLog, 'leadChanges')).toBe(signalPoints(withoutLog, 'leadChanges'));
		expect(signalPoints(withLog, 'leadChanges')).toBe(12);
	});

	test('a flip the snapshots saw keeps its own timestamp when the log counts one more', () => {
		const flipJustNow = history([[97, 99], [99, 99], [101, 99]]);
		const now = flipJustNow[2]!.timestamp;
		const score = classic(late, { history: flipJustNow, recentLeadChanges: { count: 2, lastAt: now - 90_000 } });
		expect(signalPoints(score, 'leadChanges')).toBe(18);
	});
});

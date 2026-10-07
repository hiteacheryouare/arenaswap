import { scoreGame } from '../src';
import type { Game, ReasonFragment, ScoreOptions, ScoringContext } from '../src';

const detailsOf = (game: Game<string>, id: string, context: ScoringContext = {}, options: ScoreOptions = {}): ReasonFragment[] | undefined => (
	scoreGame(game, context, { mode: 'classic', ...options }).boosts.find(boost => boost.id === id)?.details
);

const game = (sportType: Game<string>['sportType'], league: string, home: string, away: string, extra: Partial<Game<string>>): Game<string> => ({
	id: `${away}-${home}`.toLowerCase(),
	league,
	sportType,
	homeTeam: { abbreviation: home, score: 0 },
	awayTeam: { abbreviation: away, score: 0 },
	status: 'in',
	...extra,
});

const ballgame = (extra: Partial<Game<string>>) => game('baseball', 'mlb', 'CHW', 'CLE', { period: 4, topOfInning: true, outs: 1, ...extra });

describe('stakes says what this result decides', () => {
	test('up 2–0 in a best-of-five, the leader is one win from taking it', () => {
		const series = ballgame({
			homeTeam: { abbreviation: 'CHW', score: 1 },
			awayTeam: { abbreviation: 'CLE', score: 2 },
			seasonType: 'postseason',
			series: { homeWins: 2, awayWins: 0, bestOf: 5 },
		});
		expect(detailsOf(series, 'stakes')).toEqual([{ key: 'seriesClinch', params: { team: 'CHW' } }]);
	});

	test('three wins apiece in a best-of-seven is game 7', () => {
		const gameSeven = game('basketball', 'nba', 'OKC', 'DEN', {
			period: 4, clockSeconds: 300, seasonType: 'postseason', series: { homeWins: 3, awayWins: 3, bestOf: 7 },
		});
		expect(detailsOf(gameSeven, 'stakes')).toEqual([{ key: 'seriesDecider', params: { game: 7 } }]);
	});

	test('two ranked teams and a race read as one sentence each, the bigger race first', () => {
		const rivalry = game('football', 'ncaaf', 'UGA', 'BAMA', {
			period: 2, clockSeconds: 300,
			homeTeam: { abbreviation: 'UGA', score: 0, rank: 3 },
			awayTeam: { abbreviation: 'BAMA', score: 0, rank: 8 },
		});
		expect(detailsOf(rivalry, 'stakes', { stakes: { home: { inRace: true }, away: { canClinch: true } } })).toEqual([
			{ key: 'rankedMeeting', params: { team: 'BAMA', rank: 8, other: 'UGA', otherRank: 3 } },
			{ key: 'raceClinch', params: { team: 'BAMA' } },
			{ key: 'raceHunt', params: { team: 'UGA' } },
		]);
	});

	test('a relegation fight outranks a clinch for the same team', () => {
		const derby = game('soccer', 'epl', 'EVE', 'LIV', { period: 2, clockSeconds: 70 * 60 });
		expect(detailsOf(derby, 'stakes', { stakes: { home: { nearLine: 'relegation', canBeEliminated: true } } })).toEqual([
			{ key: 'raceRelegation', params: { team: 'EVE' } },
		]);
	});
});

describe('scoring opportunity names the situation, paying or not', () => {
	test('baseball reads the bases', () => {
		expect(detailsOf(ballgame({ baseRunners: { first: true, second: false, third: true } }), 'scoringOpportunity')).toEqual([{ key: 'runnersFirstThird' }]);
		expect(detailsOf(ballgame({ baseRunners: { first: false, second: false, third: false } }), 'scoringOpportunity')).toEqual([{ key: 'basesEmpty' }]);
		expect(detailsOf(ballgame({ outs: 3, baseRunners: { first: true, second: true, third: true } }), 'scoringOpportunity')).toEqual([{ key: 'inningOver' }]);
	});

	test('football names the team in the red zone, and says when the score is too wide to count', () => {
		const redZone = (away: number, down: number) => game('football', 'nfl', 'KC', 'BUF', {
			period: 3, clockSeconds: 400, homeTeam: { abbreviation: 'KC', score: 20 }, awayTeam: { abbreviation: 'BUF', score: away },
			possession: 'home', isRedZone: true, down, distance: 4,
		});
		expect(detailsOf(redZone(17, 4), 'scoringOpportunity')).toEqual([{ key: 'redZoneFourthDown', params: { team: 'KC' } }]);
		expect(detailsOf(redZone(0, 1), 'scoringOpportunity')).toEqual([{ key: 'redZoneNotClose', params: { team: 'KC' } }]);
	});

	test('a sport without a scoring position says so', () => {
		expect(detailsOf(game('basketball', 'nba', 'OKC', 'DEN', { period: 2, clockSeconds: 300 }), 'scoringOpportunity')).toEqual([{ key: 'noScoringPosition' }]);
	});
});

describe('the moments name the team they are about', () => {
	test('bottom of the 9th, tied, a runner on: the winning run', () => {
		const walkOff = ballgame({ period: 9, topOfInning: false, baseRunners: { first: false, second: true, third: false } });
		expect(detailsOf(walkOff, 'goAheadRun')).toEqual([{ key: 'winningRun', params: { team: 'CHW' } }]);
	});

	test('a road team down two in the 9th with two on has the tying run, maybe for the last time', () => {
		const lastLicks = ballgame({
			period: 9, homeTeam: { abbreviation: 'CHW', score: 4 }, awayTeam: { abbreviation: 'CLE', score: 2 },
			baseRunners: { first: true, second: true, third: false },
		});
		expect(detailsOf(lastLicks, 'goAheadRun')).toEqual([{ key: 'tyingRun', params: { team: 'CLE' } }, { key: 'lastChance' }]);
	});

	test('a two-minute drill carries the team, the deficit, the yards and the clock', () => {
		const drill = game('football', 'nfl', 'KC', 'BUF', {
			period: 4, clockSeconds: 95, homeTeam: { abbreviation: 'KC', score: 20 }, awayTeam: { abbreviation: 'BUF', score: 24 },
			possession: 'home', yardsToEndZone: 35, down: 2, distance: 6,
		});
		expect(detailsOf(drill, 'twoMinuteDrill')).toEqual([{ key: 'driveTrailing', params: { team: 'KC', clock: '1:35', yards: 35, trailBy: 4 } }]);
	});

	test('an empty net without a side goes to the trailing team', () => {
		const pulled = game('hockey', 'nhl', 'BOS', 'TOR', { period: 3, clockSeconds: 80, homeTeam: { abbreviation: 'BOS', score: 2 }, awayTeam: { abbreviation: 'TOR', score: 1 } });
		expect(detailsOf(pulled, 'scoringOpportunity', { emptyNet: true })).toEqual([{ key: 'emptyNet', params: { team: 'TOR', margin: 1, clock: '1:20' } }]);
	});

	test('a power play says whether the team on it trails', () => {
		const powerPlay = game('hockey', 'nhl', 'BOS', 'TOR', { period: 3, clockSeconds: 600, homeTeam: { abbreviation: 'BOS', score: 2 }, awayTeam: { abbreviation: 'TOR', score: 1 } });
		expect(detailsOf(powerPlay, 'scoringOpportunity', { powerPlay: 'away' })).toEqual([{ key: 'powerPlayTeamTrailing', params: { team: 'TOR', margin: 1 } }]);
	});

	test('a 6-on-4 names the pulled goalie and the power play', () => {
		const sixOnFour = game('hockey', 'nhl', 'BOS', 'TOR', { period: 3, clockSeconds: 80, homeTeam: { abbreviation: 'BOS', score: 2 }, awayTeam: { abbreviation: 'TOR', score: 1 } });
		expect(detailsOf(sixOnFour, 'scoringOpportunity', { emptyNet: 'away', powerPlay: 'away' })).toEqual([
			{ key: 'emptyNet', params: { team: 'TOR', margin: 1, clock: '1:20' } },
			{ key: 'powerPlayTeamTrailing', params: { team: 'TOR', margin: 1 } },
		]);
	});

	test('hockey at even strength falls back to the general rule', () => {
		const evenStrength = game('hockey', 'nhl', 'BOS', 'TOR', { period: 2, clockSeconds: 600 });
		expect(detailsOf(evenStrength, 'scoringOpportunity')).toBeUndefined();
	});

	test('a second red card leaves the team with nine', () => {
		const cards = game('soccer', 'epl', 'ARS', 'CHE', {
			period: 2, clockSeconds: 62 * 60, redCards: [{ side: 'away', minute: 30 }, { side: 'away', minute: 60 }],
		});
		expect(detailsOf(cards, 'redCard')).toEqual([{ key: 'redCard', params: { team: 'CHE', players: 9, minute: 60 } }]);
	});

	test('a no-hitter names the hitless team and the innings done', () => {
		const bid = ballgame({ period: 7, topOfInning: true, homeTeam: { abbreviation: 'CHW', score: 1, hits: 5 }, awayTeam: { abbreviation: 'CLE', score: 0, hits: 0 } });
		expect(detailsOf(bid, 'noHitter')).toEqual([{ key: 'noHitter', params: { team: 'CLE', innings: 6 } }]);
	});

	test('an underdog leading late carries its pregame chance', () => {
		const upset = game('football', 'nfl', 'KC', 'NYJ', {
			period: 4, clockSeconds: 400, homeTeam: { abbreviation: 'KC', score: 10 }, awayTeam: { abbreviation: 'NYJ', score: 17 },
		});
		expect(detailsOf(upset, 'upsetWatch', { pregameLine: { favorite: 'home', spread: 10 } })).toEqual([
			{ key: 'underdogLeading', params: { team: 'NYJ', chance: 23, margin: 7 } },
		]);
	});

	test('a three-way line counts only the underdog winning outright', () => {
		const upset = game('soccer', 'epl', 'MCI', 'LUT', {
			period: 2, clockSeconds: 80 * 60, homeTeam: { abbreviation: 'MCI', score: 0 }, awayTeam: { abbreviation: 'LUT', score: 1 },
		});
		const line = { favorite: 'home' as const, favoriteMoneyline: -400, underdogMoneyline: 900, drawMoneyline: 500 };
		expect(detailsOf(upset, 'upsetWatch', { pregameLine: line })?.[0]?.params?.chance).toBe(9);
	});
});

describe('the postseason boost says which round', () => {
	const series = (extra: Partial<Game<string>>) => game('basketball', 'nba', 'OKC', 'DEN', { period: 2, clockSeconds: 300, ...extra });

	test('a semifinal, a regular-season game, and a boost set to nothing', () => {
		expect(detailsOf(series({ seasonType: 'postseason', postseasonRound: 1 }), 'postseasonBoost', {}, { postseasonBoostPoints: 8 })).toEqual([{ key: 'postseasonRound', params: { round: 1 } }]);
		expect(detailsOf(series({}), 'postseasonBoost', {}, { postseasonBoostPoints: 8 })).toEqual([{ key: 'regularSeason' }]);
		expect(detailsOf(series({ seasonType: 'postseason', postseasonRound: 0 }), 'postseasonBoost', {}, { postseasonBoostPoints: 0 })).toEqual([{ key: 'postseasonBoostOff' }]);
	});
});

import { renderReasonEnglish, scoreGame } from '../src';
import type { Game, ScoreSnapshot, ScoringContext } from '../src';

const game = (sportType: Game<string>['sportType'], league: string, [away, awayScore]: [string, number], [home, homeScore]: [string, number], extra: Partial<Game<string>> = {}): Game<string> => ({
	id: `${away}-${home}`.toLowerCase(),
	league,
	sportType,
	homeTeam: { abbreviation: home.slice(0, 3).toUpperCase(), nickname: home, score: homeScore },
	awayTeam: { abbreviation: away.slice(0, 3).toUpperCase(), nickname: away, score: awayScore },
	status: 'in',
	...extra,
});

// Away score, home score, one poll a minute.
const window = (...scores: [number, number][]): ScoreSnapshot[] => scores.map(([awayScore, homeScore], i) => ({
	gameId: 'g', timestamp: 1_790_000_000_000 + i * 60_000, homeScore, awayScore,
}));

const reasonFor = (scored: Game<string>, context: ScoringContext = {}) => scoreGame(scored, context).reason;

describe('the score sentence', () => {
	test('names the team, never the abbreviation, and gives the clock in the final period', () => {
		expect(reasonFor(game('basketball', 'nba', ['Lakers', 105], ['Celtics', 108], { period: 4, clockSeconds: 64 }))).toBe('Celtics up 3 with 1:04 left');
		expect(reasonFor(game('basketball', 'nba', ['Lakers', 108], ['Celtics', 108], { period: 4, clockSeconds: 64 }))).toBe('Tied with 1:04 left');
	});

	test('gives the period before the last one, in the sport\'s own word for it', () => {
		expect(reasonFor(game('basketball', 'nba', ['Lakers', 50], ['Celtics', 47], { period: 2, clockSeconds: 300 }))).toBe('Lakers up 3 in the 2nd quarter');
		expect(reasonFor(game('basketball', 'ncaab', ['Wildcats', 30], ['Tar Heels', 30], { period: 1, clockSeconds: 300 }))).toBe('Tied in the 1st half');
		expect(reasonFor(game('hockey', 'nhl', ['Bruins', 1], ['Rangers', 0], { period: 1, clockSeconds: 600 }))).toBe('Bruins up 1 in the 1st period');
	});

	test('says which half of the inning, and keeps counting into extra innings', () => {
		expect(reasonFor(game('baseball', 'mlb', ['Padres', 3], ['Brewers', 2], { period: 9, topOfInning: false }))).toBe('Padres up 1 in the bottom of the 9th');
		expect(reasonFor(game('baseball', 'mlb', ['Padres', 3], ['Brewers', 3], { period: 11, topOfInning: true }))).toBe('Tied in the top of the 11th');
	});

	test('soccer counts minutes up, then has extra time and a shootout but never overtime', () => {
		const match = (period: number, clockSeconds: number, home: number, away: number) => game('soccer', 'mls', ['Portland', away], ['Seattle', home], { period, clockSeconds });
		expect(reasonFor(match(2, 88 * 60 + 20, 1, 1))).toBe('Tied in the 88th minute');
		expect(reasonFor(match(3, 300, 2, 2))).toBe('Tied in extra time');
		expect(reasonFor(match(5, 0, 2, 2))).toBe('Penalty shootout');
	});

	test('a regular-season hockey game goes to a shootout after one overtime; a playoff game keeps playing', () => {
		const rink = (period: number, seasonType: Game<string>['seasonType']) => game('hockey', 'nhl', ['Bruins', 2], ['Rangers', 2], { period, clockSeconds: 0, seasonType });
		expect(reasonFor(rink(5, 'regular'))).toBe('Shootout');
		expect(reasonFor(rink(5, 'postseason'))).toBe('Tied in the 2nd overtime');
	});

	test('says nothing while play is stopped', () => {
		expect(scoreGame(game('basketball', 'nba', ['Lakers', 50], ['Celtics', 47], { period: 2, intermission: true })).reasons).toEqual([]);
	});
});

describe('what just happened', () => {
	test('a run that takes the lead is one sentence, and the score that follows does not repeat the team', () => {
		const late = game('basketball', 'nba', ['Lakers', 102], ['Celtics', 95], { period: 4, clockSeconds: 130 });
		expect(reasonFor(late, { history: window([90, 93], [96, 95], [102, 95]) })).toBe('Lakers on a 12–2 run to take the lead. Up 7 with 2:10 left');
	});

	test('two teams trading baskets is not a run', () => {
		const late = game('basketball', 'nba', ['Lakers', 110], ['Celtics', 100], { period: 3, clockSeconds: 300 });
		expect(reasonFor(late, { history: window([100, 94], [105, 97], [110, 100]) })).toBe('Lakers outscoring Celtics 10–6 in the last 2 minutes. Up 10 in the 3rd quarter');
	});

	test('one goal is the score, not a streak', () => {
		const rink = game('hockey', 'nhl', ['Bruins', 1], ['Rangers', 0], { period: 2, clockSeconds: 600 });
		expect(reasonFor(rink, { history: window([0, 0], [0, 0], [1, 0]) })).toBe('Bruins up 1 in the 2nd period');
	});

	test('an equalizer takes the time instead of a second sentence saying "Tied"', () => {
		const rink = game('hockey', 'nhl', ['Sharks', 2], ['Blues', 2], { period: 3, clockSeconds: 371 });
		expect(reasonFor(rink, { history: window([1, 2], [1, 2], [2, 2]) })).toBe('Sharks just tied it with 6:11 left');
	});

	test('a deficit cut but not erased names both margins', () => {
		const late = game('basketball', 'nba', ['Rockets', 34], ['Mavericks', 39], { period: 2, clockSeconds: 382 });
		expect(reasonFor(late, { history: window([24, 32], [30, 36], [34, 39]) })).toMatch(/^Rockets cut the deficit from 8 to 5\. Mavericks up 5 in the 2nd quarter$/);
	});
});

describe('what is happening right now', () => {
	test('a pulled goalie already gives the score and the clock, so nothing repeats them', () => {
		const rink = game('hockey', 'nhl', ['Maple Leafs', 1], ['Bruins', 2], { period: 3, clockSeconds: 80 });
		expect(reasonFor(rink, { emptyNet: 'away' })).toBe('Maple Leafs pulled the goalie, down 1 with 1:20 left');
	});

	test('a runner in scoring position comes before the score', () => {
		const ballgame = game('baseball', 'mlb', ['Padres', 3], ['Brewers', 2], { period: 9, topOfInning: false, outs: 1, baseRunners: { first: false, second: true, third: false } });
		expect(reasonFor(ballgame)).toMatch(/^Brewers have the tying run on base\. Padres up 1 in the bottom of the 9th$/);
	});
});

describe('what is at stake', () => {
	test('a series clinch makes the line when there is room for it', () => {
		const series = game('baseball', 'mlb', ['Guardians', 2], ['White Sox', 1], {
			period: 4, topOfInning: true, outs: 0, seasonType: 'postseason', series: { homeWins: 2, awayWins: 0, bestOf: 5 },
		});
		expect(reasonFor(series)).toBe('Guardians up 1 in the top of the 4th. White Sox clinch the series with a win');
	});

	test('it is the first thing to go when the moment and the story fill the line', () => {
		const series = game('baseball', 'mlb', ['Guardians', 3], ['White Sox', 2], {
			period: 9, topOfInning: false, outs: 1, baseRunners: { first: false, second: true, third: false },
			seasonType: 'postseason', series: { homeWins: 2, awayWins: 0, bestOf: 5 },
		});
		const lines = scoreGame(series, { history: window([3, 0], [3, 0], [3, 2]) }).reasons.map(reason => reason.key);
		expect(lines).toEqual(['tyingRun', 'cutDeficit', 'state']);
	});
});

const run = (scoredFor: number) => renderReasonEnglish({ key: 'run', params: { team: 'Heat', scoredFor, scoredAgainst: 0 } });

describe('the English renderer', () => {
	test('picks "an" for the numbers that start with a vowel sound', () => {
		expect(run(8)).toBe('Heat on an 8–0 run');
		expect(run(11)).toBe('Heat on an 11–0 run');
		expect(run(18)).toBe('Heat on an 18–0 run');
		expect(run(10)).toBe('Heat on a 10–0 run');
		expect(run(12)).toBe('Heat on a 12–0 run');
	});

	test('says "the last minute" for a window of one', () => {
		expect(renderReasonEnglish({ key: 'leadChanges', params: { count: 3, minutes: 1 } })).toBe('3 lead changes in the last minute');
		expect(renderReasonEnglish({ key: 'leadChanges', params: { count: 3, minutes: 5 } })).toBe('3 lead changes in the last 5 minutes');
	});
});

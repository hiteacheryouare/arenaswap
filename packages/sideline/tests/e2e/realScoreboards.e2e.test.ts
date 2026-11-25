import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import { scoreLiveGame } from '@arenaswap/core';
import type { Game, LeagueId } from '@arenaswap/core';

interface Capture {
	recordedAt: string;
	league: LeagueId;
	event: unknown;
}

const readCapture = (name: string): Capture => (
	JSON.parse(readFileSync(join(__dirname, '../fixtures/scoreboards', `${name}.json`), 'utf8')) as Capture
);

const fetchLive = async (name: string) => {
	const capture = readCapture(name);
	jest.resetModules();
	(globalThis as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		headers: new Headers(),
		json: async () => ({ events: [capture.event] }),
	} as Response) as unknown as typeof fetch;
	const api = require('../../src/apiClient') as typeof import('../../src/apiClient');
	const result = await api.fetchGamesWithLeagueLogos([capture.league], { includeUpcoming: false });
	return { result, game: result.games[0] as Game, capture };
};

const powerScoresOf = async (names: string[]): Promise<number[]> => {
	const totals: number[] = [];
	for (const name of names) totals.push(await powerScoreOf(name));
	return totals;
};

const powerScoreOf = async (name: string): Promise<number> => {
	const { game, capture } = await fetchLive(name);
	const input = { game, history: [], onBreak: false, winProbability: [], now: Date.parse(capture.recordedAt) };
	return scoreLiveGame(input, createDefaultUserPreferences(), 0).total;
};

const captures = [
	'wnbaSemifinalFourthQuarter',
	'nflNeutralSite',
	'ncaafFourthQuarter',
	'nhlTiedThirdPeriod',
	'mlbPostseasonRunnersOn',
	'eplStoppageTime',
];

test.each(captures)('%s reaches the slate as one live game, with nothing dropped or shed', async name => {
	const { result, game } = await fetchLive(name);

	expect(result.shedLeagues).toEqual([]);
	expect(result.games).toHaveLength(1);
	expect(game.status).toBe('in');
});

test('a one-point playoff game late in the fourth reads the way the broadcast shows it', async () => {
	const { game } = await fetchLive('wnbaSemifinalFourthQuarter');

	expect([game.awayTeam.abbreviation, game.awayTeam.score, game.homeTeam.abbreviation, game.homeTeam.score]).toEqual(['NY', 78, 'ATL', 79]);
	expect([game.period, game.clockSeconds]).toEqual([4, 233]);
	expect(game.postseasonLabel).toBe('Semifinals · Game 2');
	expect(game.series).toEqual({ kind: 'playoff', homeWins: 1, awayWins: 0, bestOf: 5 });
	expect(game.possessionSide).toBe('home');
});

test('a London game keeps its listed home side and places the ball on the right side of midfield', async () => {
	const { game } = await fetchLive('nflNeutralSite');

	expect([game.awayTeam.abbreviation, game.awayTeam.score, game.homeTeam.abbreviation, game.homeTeam.score]).toEqual(['IND', 20, 'WSH', 13]);
	expect(game.venueLocation).toBe('London, England');
	expect([game.period, game.clockSeconds]).toEqual([4, 900]);
	expect(game.possessionTeamId).toBe(game.awayTeam.id);
	expect([game.downDistance, game.fieldPosition]).toEqual(['1st & 10', 'WSH 42']);
	expect([game.yardLine, game.driveStartYardLine]).toEqual([42, 52]);
});

test('a college drive across midfield is placed from the home goal line, and keeps its division', async () => {
	const { game } = await fetchLive('ncaafFourthQuarter');

	expect([game.awayTeam.abbreviation, game.awayTeam.score, game.homeTeam.abbreviation, game.homeTeam.score]).toEqual(['CAL', 25, 'UNLV', 32]);
	expect([game.period, game.clockSeconds]).toEqual([4, 386]);
	expect(game.possessionTeamId).toBe(game.homeTeam.id);
	expect([game.fieldPosition, game.yardLine]).toEqual(['CAL 47', 53]);
	expect(game.collegeGroups).toEqual(['80']);
});

test('a tied third period counts down from the clock the broadcast shows', async () => {
	const { game } = await fetchLive('nhlTiedThirdPeriod');

	expect([game.awayTeam.abbreviation, game.awayTeam.score, game.homeTeam.abbreviation, game.homeTeam.score]).toEqual(['CAR', 2, 'PHI', 2]);
	expect([game.period, game.clockSeconds, game.intermission]).toEqual([3, 349, false]);
});

test('a postseason at-bat in the bottom of the eighth carries the count, the runner and the series', async () => {
	const { game } = await fetchLive('mlbPostseasonRunnersOn');

	expect([game.awayTeam.abbreviation, game.awayTeam.score, game.homeTeam.abbreviation, game.homeTeam.score]).toEqual(['NYY', 0, 'TB', 1]);
	expect([game.period, game.topOfInning, game.inningBreak]).toEqual([8, false, false]);
	expect(game.bso).toEqual({ balls: 0, strikes: 0, outs: 2 });
	expect(game.baseRunners).toEqual({ first: true, second: false, third: false });
	expect([game.atBat?.pitcher?.name, game.atBat?.batter?.name]).toEqual(['Paul Blackburn', 'Liam Hicks']);
	expect(game.postseasonLabel).toBe('ALDS · Game 1');
	expect(game.series).toEqual({ kind: 'playoff', homeWins: 0, awayWins: 0, bestOf: 5 });
});

test('stoppage time runs past ninety minutes, though the feed\'s own clock stops at 5400 seconds', async () => {
	const { game, capture } = await fetchLive('eplStoppageTime');
	const rawClock = (capture.event as { competitions: { status: { clock: number } }[] }).competitions[0]!.status.clock;

	expect(rawClock).toBe(5400);
	expect([game.homeTeam.abbreviation, game.homeTeam.score, game.awayTeam.abbreviation, game.awayTeam.score]).toEqual(['ARS', 2, 'LEE', 1]);
	expect([game.period, game.clockSeconds, game.clockStoppageMinutes]).toEqual([2, 91 * 60, 1]);
});

describe('PowerScore on real moments', () => {
	test.each(captures)('%s scores a real number from 0 to 100', async name => {
		const total = await powerScoreOf(name);

		expect(Number.isFinite(total)).toBe(true);
		expect(total).toBeGreaterThanOrEqual(0);
		expect(total).toBeLessThanOrEqual(100);
	});

	test('every one-score finish outranks both seven-point football games', async () => {
		const finishes = await powerScoresOf(['wnbaSemifinalFourthQuarter', 'nhlTiedThirdPeriod', 'mlbPostseasonRunnersOn', 'eplStoppageTime']);
		const football = await powerScoresOf(['nflNeutralSite', 'ncaafFourthQuarter']);

		expect(Math.min(...finishes)).toBeGreaterThan(Math.max(...football));
	});

	test('the seven-point game with six minutes left outranks the one with a full quarter left', async () => {
		expect(await powerScoreOf('ncaafFourthQuarter')).toBeGreaterThan(await powerScoreOf('nflNeutralSite'));
	});
});

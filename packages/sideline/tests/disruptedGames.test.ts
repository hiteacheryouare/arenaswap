import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LeagueId } from '@arenaswap/core';
import { parseScoreboardEvents } from '../src/apiClient';
import { readDelayKind, readDoubleheader, readForfeitWinner, readMakeupDate, readPostponedReason } from '../src/disruption';

const parseFixture = (name: string) => {
	const { league, event } = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/scoreboards', `${name}.json`), 'utf8')) as { league: LeagueId; event: unknown };
	return parseScoreboardEvents({ events: [event] }, league);
};

describe('games that are not played as scheduled', () => {
	test('a rainout is postponed with its reason and makeup day, not a 0-0 final', () => {
		const [game] = parseFixture('mlbPostponedRain');
		expect(game!.status).toBe('post');
		expect(game!.disruption).toBe('postponed');
		expect(game!.postponedReason).toBe('rain');
		expect(game!.makeupDate).toBe('2025-04-06');
		expect(game!.doubleheaderGame).toBeUndefined();
	});

	test('the makeup is game 1 of a doubleheader', () => {
		const [game] = parseFixture('mlbDoubleheaderMakeup');
		expect(game!.disruption).toBeUndefined();
		expect(game!.doubleheaderGame).toBe(1);
		expect(game!.isMakeup).toBe(true);
	});

	test('a canceled game is dropped', () => {
		expect(parseFixture('mlsCanceledGame3')).toEqual([]);
	});

	test('a forfeit goes to the team the note names, even when the other side outscored it', () => {
		const [game] = parseFixture('ncaawForfeit');
		expect(game!.disruption).toBe('forfeit');
		expect(game!.awayTeam.score).toBeGreaterThan(game!.homeTeam.score);
		expect(game!.forfeitWinnerId).toBe(game!.homeTeam.id);
	});
});

describe('reading the notes', () => {
	test.each([
		['Rain - Makeup date April 6', 'rain'],
		['Inclement Weather - Makeup on Jul 29', 'weather'],
		['Air Quality - Makeup date Jun 8', 'airQuality'],
		['Travel Issues - Makeup date Jul 2', 'travel'],
		['Postponed due to severe weather and hazardous icy conditions', 'weather'],
		['ALCS - Game 4 Rain - Makeup on Oct 17', 'rain'],
		['Postponed due to court condensation. Makeup date Feb 6', undefined],
		['Makeup date Mar 3', undefined],
	])('%s', (headline, reason) => {
		expect(readPostponedReason(headline)).toBe(reason);
	});

	test.each([
		['Rain - Makeup date April 6', '2025-04-06'],
		['Rain - Makeup on Jul 29', '2025-07-29'],
		['Rain - Makeup date Aug. 20', '2025-08-20'],
		['Inclement Weather - Makeup date Sep 3rd', '2025-09-03'],
		['Postponed due to wildfires in Los Angeles', undefined],
	])('%s', (headline, day) => {
		expect(readMakeupDate(headline, '2025-04-05T20:10Z')).toBe(day);
	});

	test('a makeup in an earlier month falls in the next year', () => {
		expect(readMakeupDate('Makeup date Jan 4', '2025-12-30T01:00Z')).toBe('2026-01-04');
	});

	test('a doubleheader game number, and whether it is the makeup', () => {
		expect(readDoubleheader('Doubleheader - Game 2')).toEqual({ doubleheaderGame: 2 });
		expect(readDoubleheader('Doubleheader - Game 1 – Makeup from April 5')).toEqual({ doubleheaderGame: 1, isMakeup: true });
		expect(readDoubleheader('ALCS - Game 4')).toEqual({});
	});

	test('a forfeit note that names neither team gives no winner', () => {
		const competitors = [
			{ id: '1', team: { displayName: 'Kansas City Roos', location: 'Kansas City' } },
			{ id: '2', team: { displayName: 'St. Thomas Tommies', location: 'St. Thomas' } },
		];
		expect(readForfeitWinner('Kansas City wins by forfeit', competitors)).toBe('1');
		expect(readForfeitWinner('Game awarded by forfeit', competitors)).toBeUndefined();
	});

	test('the kind of delay', () => {
		expect(readDelayKind('STATUS_RAIN_DELAY', 'Rain Delay')).toBe('rain');
		expect(readDelayKind('STATUS_DELAYED', 'Weather Delay')).toBe('weather');
		expect(readDelayKind('STATUS_DELAYED', 'Delayed')).toBe('other');
	});
});

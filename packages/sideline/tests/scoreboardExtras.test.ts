import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Game, LeagueId } from '@arenaswap/core';
import { parseScoreboardEvents } from '../src/apiClient';

// Each fixture is one real scoreboard event, trimmed of links, headlines, odds and leaders. See the
// `source` line in each file for where it was captured.
const gameFrom = (name: string): Game => {
	const capture = JSON.parse(readFileSync(join(__dirname, 'fixtures/scoreboardExtras', `${name}.json`), 'utf8')) as { league: LeagueId; event: unknown };
	const [game] = parseScoreboardEvents({ events: [capture.event] }, capture.league);
	if (!game) throw new Error(`${name} did not parse`);
	return game;
};

describe('goal scorers', () => {
	it('reads every goal with its team, minute and surname', () => {
		const goals = (gameFrom('eplScorers').goalEvents ?? []).map(goal => ({ ...goal, minute: Math.ceil(goal.minute) }));
		expect(goals).toEqual([
			{ teamId: '388', minute: 52, player: 'Gboho' },
			{ teamId: '368', minute: 56, player: 'Barry' },
			{ teamId: '368', minute: 61, player: 'Barry' },
			{ teamId: '368', minute: 81, player: 'Dewsbury-Hall' },
		]);
	});

	it('credits an own goal to the team it counted for, not the scorer\'s side', () => {
		const [ownGoal] = gameFrom('eplOwnGoal').goalEvents ?? [];
		expect(ownGoal).toMatchObject({ teamId: '331', player: 'Canvot', ownGoal: true });
	});

	it('marks a goal from the spot', () => {
		const [penalty, openPlay] = gameFrom('eplPenalty').goalEvents ?? [];
		expect(penalty).toMatchObject({ teamId: '306', player: 'McBurnie', penalty: true });
		expect(openPlay?.penalty).toBeUndefined();
	});

	it('only reads goals in soccer', () => {
		expect(gameFrom('nflMadrid').goalEvents).toBeUndefined();
	});
});

describe('neutral sites', () => {
	it('flags a game played at neither team\'s stadium', () => {
		const game = gameFrom('nflMadrid');
		expect(game.neutralSite).toBe(true);
		expect(game.venueName).toBe('Santiago Bernabéu');
		expect(game.venueLocation).toBe('Madrid, Spain');
	});

	it('leaves a home game unflagged', () => {
		expect(gameFrom('ncaafBig12').neutralSite).toBeUndefined();
	});
});

describe('conference games', () => {
	it('names the conference and finds its crest', () => {
		expect(gameFrom('ncaafBig12').conference).toEqual({ id: '4', shortName: 'Big 12', crestSlug: 'big_12' });
	});

	it('leaves non-conference games alone', () => {
		expect(gameFrom('ncaabNetworkLogos').conference).toBeUndefined();
	});

	it('never names a conference outside college', () => {
		expect(gameFrom('nflMadrid').conference).toBeUndefined();
	});
});

describe('network logos', () => {
	it('keeps both artworks, keyed by the name the broadcast list uses', () => {
		const game = gameFrom('ncaabNetworkLogos');
		expect(game.broadcasts).toContain('ACC Network');
		expect(game.broadcastLogos?.['ACC Network']).toEqual({
			logo: expect.stringMatching(/\/logos\/default\.png$/),
			darkLogo: expect.stringMatching(/\/logos\/default-dark\.png$/),
		});
	});

	it('has nothing to key when no network sends a logo', () => {
		const game = gameFrom('eplScorers');
		expect(game.broadcasts).toEqual(['USA Net', 'Universo']);
		expect(game.broadcastLogos).toBeUndefined();
	});
});

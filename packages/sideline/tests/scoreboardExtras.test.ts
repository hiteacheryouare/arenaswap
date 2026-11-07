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

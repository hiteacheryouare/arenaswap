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

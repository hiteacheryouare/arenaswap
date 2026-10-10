import type { Game, LeagueId } from '@arenaswap/core/types';
import { guideSlateRetryMs, guideSlateTtlMs, keepRefusedLeagues, resolveGuideSlate, resolveGuideSlateFailure } from '../utils/slateMerge';

const game = (id: string, league: LeagueId) => ({ id, league }) as Game;

const oldNba = game('old-nba', 'nba');
const oldNfl = game('old-nfl', 'nfl');
const freshNba = game('fresh-nba', 'nba');
const enabled: LeagueId[] = ['nba', 'nfl'];

describe('the guide slate after a fetch', () => {
	test('is replaced and held for the full TTL when every league answered', () => {
		const outcome = resolveGuideSlate([oldNba, oldNfl], [freshNba], enabled, []);
		expect(outcome).toEqual({ games: [freshNba], refused: false, write: true, holdMs: guideSlateTtlMs });
	});

	test('reports a quiet day when every league answered with nothing', () => {
		const outcome = resolveGuideSlate([oldNba], [], enabled, []);
		expect(outcome).toEqual({ games: [], refused: false, write: true, holdMs: guideSlateTtlMs });
	});

	test('is never cached when every league refused, and serves what was held', () => {
		const outcome = resolveGuideSlate([oldNba, oldNfl], [], enabled, ['nba', 'nfl']);
		expect(outcome).toEqual({ games: [oldNba, oldNfl], refused: false, write: false, holdMs: guideSlateRetryMs });
	});

	test('is an error, not an empty day, when every league refused and nothing was held', () => {
		const outcome = resolveGuideSlate([], [], enabled, ['nba', 'nfl']);
		expect(outcome).toEqual({ games: [], refused: true, write: false, holdMs: guideSlateRetryMs });
	});

	test('keeps the old games of a refused league and replaces the rest', () => {
		const outcome = resolveGuideSlate([oldNba, oldNfl], [freshNba], enabled, ['nfl']);
		expect(outcome.games).toEqual([oldNfl, freshNba]);
		expect(outcome.write).toBe(true);
	});

	test('holds a partial answer for the short retry window, not the full TTL and not zero', () => {
		const { holdMs } = resolveGuideSlate([oldNfl], [freshNba], enabled, ['nfl']);
		expect(holdMs).toBe(guideSlateRetryMs);
		expect(holdMs).toBeGreaterThan(0);
		expect(holdMs).toBeLessThan(guideSlateTtlMs);
	});

	test('holds a full refusal for the short retry window too, so it cannot be asked about on every poll', () => {
		expect(resolveGuideSlate([oldNba], [], enabled, ['nba', 'nfl']).holdMs).toBe(guideSlateRetryMs);
	});

	test('is an error when the league that answered had nothing and the refused one has nothing held', () => {
		const outcome = resolveGuideSlate([], [], enabled, ['nfl']);
		expect(outcome).toEqual({ games: [], refused: true, write: true, holdMs: guideSlateRetryMs });
	});

	test('treats no enabled leagues as a quiet day rather than a refusal', () => {
		expect(resolveGuideSlate([oldNba], [], [], [])).toEqual({ games: [], refused: false, write: true, holdMs: guideSlateTtlMs });
	});

	test('reports a thrown fetch as an error unless a slate is already held', () => {
		expect(resolveGuideSlateFailure([])).toEqual({ games: [], refused: true, write: false, holdMs: guideSlateRetryMs });
		expect(resolveGuideSlateFailure([oldNba])).toEqual({ games: [oldNba], refused: false, write: false, holdMs: guideSlateRetryMs });
	});
});

describe('keeping the leagues that did not answer', () => {
	test('holds only entries belonging to a refused league, so a league switched off does not linger', () => {
		expect(keepRefusedLeagues([oldNba, oldNfl], ['nba'])).toEqual([oldNba]);
		expect(keepRefusedLeagues([oldNba, oldNfl], [])).toEqual([]);
	});
});

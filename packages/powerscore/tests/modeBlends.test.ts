import { scoreGame } from '../src/compose';
import type { FantasyPlayerState, Game, ScoreSnapshot } from '../src/types';

const nbaGame = (period: number, clockSeconds: number, home: number, away: number): Game => ({
	id: 'g1',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period,
	clockSeconds,
	homeTeam: { score: home, abbreviation: 'DEN' },
	awayTeam: { score: away, abbreviation: 'LAL' },
});

const history = (home: number, away: number): ScoreSnapshot[] => [0, 1, 2].map(i => ({ gameId: 'g1', timestamp: 1_000_000 + i * 15_000, homeScore: home, awayScore: away }));

const jokic: FantasyPlayerState = { id: 'jokic', name: 'Jokic', side: 'home', position: 'player' };

describe('Fantasy lifts the games your players are in', () => {
	test('a late one-point game with your player in it never scores below the same game without one', () => {
		const game = nbaGame(4, 40, 101, 100);
		const context = { history: history(101, 100) };
		const classic = scoreGame(game, context, { mode: 'classic' });
		const withPlayer = scoreGame(game, { ...context, fantasy: [jokic] }, { mode: 'fantasy' });
		const withoutPlayer = scoreGame(game, context, { mode: 'fantasy' });
		expect(withoutPlayer.total).toBe(classic.total);
		expect(withPlayer.total).toBeGreaterThan(classic.total);
		expect(withPlayer.blend).toMatchObject({ kind: 'boost', weight: 0.6, classicTotal: classic.total });
		expect(withPlayer.total).toBe(Math.min(100, classic.total + Math.round(0.6 * withPlayer.blend!.ownTotal)));
	});

	test('the slider sets how much: none leaves Classic alone, all of it adds the whole Fantasy score', () => {
		const game = nbaGame(2, 300, 60, 48);
		const context = { history: history(60, 48), fantasy: [jokic] };
		const classic = scoreGame(game, context, { mode: 'classic' }).total;
		const none = scoreGame(game, context, { mode: 'fantasy', classicBlend: { kind: 'boost', weight: 0 } });
		const all = scoreGame(game, context, { mode: 'fantasy', classicBlend: { kind: 'boost', weight: 1 } });
		expect(none.total).toBe(classic);
		expect(all.total).toBe(Math.min(100, classic + all.blend!.ownTotal));
	});
});

describe('Blowouts and the postseason', () => {
	test('a playoff blowout pays no postseason boost, while Classic still does', () => {
		const game: Game = { ...nbaGame(3, 200, 98, 62), postseasonRound: 0 };
		const blowouts = scoreGame(game, {}, { mode: 'blowouts', postseasonBoostPoints: 8 });
		const classic = scoreGame(game, {}, { mode: 'classic', postseasonBoostPoints: 8 });
		expect(blowouts.boosts.some(boost => boost.id === 'postseasonBoost')).toBe(false);
		expect(classic.boosts.find(boost => boost.id === 'postseasonBoost')?.points).toBe(8);
	});

	test('the floor reports when Classic\'s share won', () => {
		const tiedLate = scoreGame(nbaGame(4, 20, 100, 100), {}, { mode: 'blowouts' });
		expect(tiedLate.blend).toMatchObject({ kind: 'floor', weight: 0.3, floorApplied: true });
		expect(tiedLate.total).toBe(Math.round(0.3 * tiedLate.blend!.classicTotal));
		const rout = scoreGame(nbaGame(3, 100, 110, 70), {}, { mode: 'blowouts' });
		expect(rout.blend?.floorApplied).toBe(false);
	});
});

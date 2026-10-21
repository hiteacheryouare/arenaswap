import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import { MockGameSimulator } from '@arenaswap/core';
import type { PowerScoreResult } from '@arenaswap/core/types';

const result = (gameId: string): PowerScoreResult => ({ gameId, total: 72, closeness: 20, lateGame: 20, momentum: 10, leadChanges: 4, comeback: 0, favoriteBonus: 0, favoriteTeamCount: 0, stalled: false, reason: 'Close game' });

it('shot', () => {
	const games = new MockGameSimulator().tick().filter(game => ['mock-1', 'mock-2', 'mock-15'].includes(game.id) || game.sportType === 'football').slice(0, 4);
	cy.viewport(420, 900);
	cy.mount(
		<div className='popup-container p-2 d-flex flex-column gap-2' style={{ width: 400 }}>
			{games.map(game => (
				<LiveGameCard key={game.id} game={game} excitementResult={result(game.id)} favoriteTeamIds={new Set()} onToggleFavoriteTeam={() => {}} onOpenGameDetail={() => {}} bettingPrefs={{ bettingEnabled: false }} />
			))}
		</div>,
	);
	cy.wait(1500);
	cy.get('.popup-container').screenshot('issue165Cards', { overwrite: true });
});

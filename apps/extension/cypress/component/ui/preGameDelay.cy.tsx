import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import { formatStartDateTime } from '@arenaswap/ui/src/components/gameCardShared';
import type { Game } from '@arenaswap/core/types';

const startTime = '2026-07-18T23:05:00.000Z';

const game: Game = {
	id: 'g1',
	status: 'pre',
	league: 'mlb',
	sportType: 'baseball',
	period: 0,
	clockSeconds: 0,
	startTime,
	homeTeam: { id: 'h', name: 'Philadelphia Phillies', abbreviation: 'PHI', score: 0, color: '#E81828' },
	awayTeam: { id: 'a', name: 'San Diego Padres', abbreviation: 'SD', score: 0, color: '#2F241D' },
};

const mount = (subject: Game) => {
	cy.viewport(320, 400);
	cy.mount(
		<div style={{ width: '320px' }}>
			<PreGameCard
				game={subject}
				excitementResult={undefined}
				favoriteTeamIds={new Set()}
				onToggleFavoriteTeam={() => {}}
				onOpenGameDetail={() => {}}
				bettingPrefs={{ bettingEnabled: false }}
			/>
		</div>,
	);
};

describe('pre-game card delay', () => {
	it('names a delay before the start in the status row, beside the original start time', () => {
		mount({ ...game, delayed: true, delayDescription: 'Rain Delay' });
		cy.get('.game-card').should('have.class', 'is-delayed');
		cy.get('.delay-status-label').should('contain.text', 'Rain Delay');
		cy.get('.delay-status-label .bi-pause-fill').should('exist');
		cy.get('.pre-game-start-time').should('have.text', formatStartDateTime(startTime));
	});

	it('falls back to the plain label when our sources give no reason', () => {
		mount({ ...game, delayed: true });
		cy.get('.delay-status-label').should('contain.text', 'DELAY');
	});

	it('shows no delay on a game that is on schedule', () => {
		mount(game);
		cy.get('.game-card').should('not.have.class', 'is-delayed');
		cy.get('.delay-status-label').should('not.exist');
	});
});

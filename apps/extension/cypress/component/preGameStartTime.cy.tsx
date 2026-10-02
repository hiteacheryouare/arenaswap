import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import { formatStartDateTime, formatStartTime } from '@arenaswap/ui/src/components/gameCardShared';
import type { Game } from '@arenaswap/core/types';

const startTime = '2026-10-05T23:30:00.000Z';

const game: Game = {
	id: 'g1',
	status: 'pre',
	league: 'nfl',
	sportType: 'football',
	period: 0,
	startTime,
	homeTeam: { id: 'h', name: 'Los Angeles Rams', abbreviation: 'LAR', score: 0 },
	awayTeam: { id: 'a', name: 'Seattle Seahawks', abbreviation: 'SEA', score: 0 },
};

const mount = (dayNamedAbove?: boolean) => {
	cy.viewport(320, 400);
	cy.mount(
		<div style={{ width: '320px' }}>
			<PreGameCard
				game={game}
				excitementResult={undefined}
				favoriteTeamIds={new Set()}
				onToggleFavoriteTeam={() => {}}
				onOpenGameDetail={() => {}}
				bettingPrefs={{ bettingEnabled: false }}
				dayNamedAbove={dayNamedAbove}
			/>
		</div>,
	);
};

// Up Next pages by day, and the pager above the cards already says which one, so a card under it
// repeating "Mon, Oct 5" is the same fact twice in a column that has 80px to spare.
describe('pre-game card start time', () => {
	it('shows the time alone under a pager that names the day', () => {
		mount(true);
		cy.get('.pre-game-start-time').should('have.text', formatStartTime(startTime));
	});

	it('keeps the day where nothing above names it', () => {
		mount();
		cy.get('.pre-game-start-time').should('have.text', formatStartDateTime(startTime));
	});
});

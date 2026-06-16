import LiveGameCard from '../../entrypoints/popup/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

const baseGame: Game = {
	id: 'g1',
	status: 'in',
	league: 'nba',
	sportType: 'basketball',
	period: 2,
	clockSeconds: 300,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
};

const baseResult: PowerScoreResult = {
	gameId: 'g1',
	total: 42,
	closeness: 10,
	lateGame: 8,
	momentum: 6,
	leadChanges: 4,
	comeback: 0,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'Close game',
};

const defaultProps = {
	game: baseGame,
	excitementResult: baseResult,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	gameBoosts: {},
	openTabs: [],
	registry: [],
	onRegistryChange: () => {},
	formatTabLabel: () => 'Tab',
	onOpenGameDetail: () => {},
};

describe('liveGameCard PowerScore bar', () => {
	it('renders PowerScore progress bar when excitementResult is provided', () => {
		cy.mount(<LiveGameCard {...defaultProps} />);
		cy.get('[role="progressbar"]').should('exist');
		cy.contains(/PowerScore/i).should('exist');
	});

	it('does not render PowerScore bar when excitementResult is undefined', () => {
		cy.mount(<LiveGameCard {...defaultProps} excitementResult={undefined} />);
		cy.get('[role="progressbar"]').should('not.exist');
	});

	it('progress bar has correct aria value', () => {
		cy.mount(<LiveGameCard {...defaultProps} />);
		cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '42');
	});

	it('displays total and max score', () => {
		cy.mount(<LiveGameCard {...defaultProps} />);
		cy.contains('42 / 100').should('exist');
	});
});

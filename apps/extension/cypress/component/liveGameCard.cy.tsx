import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
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
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
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

describe('liveGameCard inning half indicator', () => {
	const mlbGame: Game = { ...baseGame, league: 'mlb', sportType: 'baseball', period: 7 };

	it('renders an up caret icon for the top of the inning', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...mlbGame, topOfInning: true }} />);
		cy.get('.inning-half-icon')
			.should('have.class', 'bi-caret-up-fill')
			.and('have.attr', 'aria-label', 'Top of inning');
	});

	it('renders a down caret icon for the bottom of the inning', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...mlbGame, topOfInning: false }} />);
		cy.get('.inning-half-icon')
			.should('have.class', 'bi-caret-down-fill')
			.and('have.attr', 'aria-label', 'Bottom of inning');
	});

	it('renders no indicator when the inning half is unknown', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={mlbGame} />);
		cy.contains('Inn 7').should('exist');
		cy.get('.inning-half-icon').should('not.exist');
	});

	it('renders no indicator for clock sports', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...baseGame, topOfInning: true }} />);
		cy.get('.inning-half-icon').should('not.exist');
	});
});

// ESPN freezes a shootout match's score at the 120-minute scoreline and reports period 5, so
// without the secondary readout the card would sit on "1 – 1" while the tie is being decided.
describe('liveGameCard penalty shootout', () => {
	const shootoutGame: Game = {
		...baseGame,
		league: 'ucl',
		sportType: 'soccer',
		period: 5,
		clockSeconds: 7200,
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 1, shootoutScore: 5 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 1, shootoutScore: 3 },
	};

	it('labels the period PENS rather than a third extra-time period', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={shootoutGame} />);
		cy.contains('PENS').should('exist');
	});

	it('shows the shootout tally alongside the frozen scoreline, away team first', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={shootoutGame} />);
		cy.get('.game-shootout-score').should('contain.text', '3').and('contain.text', '5');
		// The 120-minute score is still the headline number.
		cy.get('.game-score-value').first().should('contain.text', '1');
	});

	it('renders no shootout line when ESPN has not supplied a tally', () => {
		const noTally: Game = {
			...shootoutGame,
			homeTeam: { ...shootoutGame.homeTeam, shootoutScore: undefined },
			awayTeam: { ...shootoutGame.awayTeam, shootoutScore: undefined },
		};
		cy.mount(<LiveGameCard {...defaultProps} game={noTally} />);
		cy.get('.game-shootout-score').should('not.exist');
	});

	// The tally line already reads "PENS 3–5", so keeping the period label above it would print
	// PENS twice — caught by rendering the card, not by any assertion on the strings themselves.
	it('drops the period label while the tally is showing, so PENS appears once', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={shootoutGame} />);
		cy.get('.game-period').should('not.exist');
		cy.get('.game-card').invoke('text').then(text => {
			expect(text.match(/PENS/g)).to.have.length(1);
		});
	});

	it('keeps the period label when there is no tally to replace it', () => {
		const noTally: Game = {
			...shootoutGame,
			homeTeam: { ...shootoutGame.homeTeam, shootoutScore: undefined },
			awayTeam: { ...shootoutGame.awayTeam, shootoutScore: undefined },
		};
		cy.mount(<LiveGameCard {...defaultProps} game={noTally} />);
		cy.get('.game-period').should('contain.text', 'PENS');
	});

	it('labels the extra-time halves ET1 and ET2', () => {
		// Extra time predates any shootout, so there is no tally on the card yet.
		const extraTime: Game = {
			...shootoutGame,
			period: 3,
			homeTeam: { ...shootoutGame.homeTeam, shootoutScore: undefined },
			awayTeam: { ...shootoutGame.awayTeam, shootoutScore: undefined },
		};
		cy.mount(<LiveGameCard {...defaultProps} game={extraTime} />);
		cy.contains('ET1').should('exist');
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...extraTime, period: 4 }} />);
		cy.contains('ET2').should('exist');
	});
});

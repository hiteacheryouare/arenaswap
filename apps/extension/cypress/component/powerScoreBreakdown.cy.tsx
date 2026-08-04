import PowerScoreBreakdown from '../../entrypoints/popup/components/powerScoreBreakdown';

const defaultProps = {
	closeness: 12,
	lateGame: 8,
	momentum: 5,
	leadChanges: 3,
	comeback: 0,
	baseTotal: 28,
	stallPenalty: 0,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	currentBoost: 0,
	scoringOpportunityBoost: 0,
	postseasonBoost: 0,
	totalLabel: '28 / 100',
};

describe('PowerScoreBreakdown signals', () => {
	it('renders all 5 signal progress bars', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('[role="progressbar"]').should('have.length', 5);
	});

	it('sets correct aria-valuenow on each signal bar', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		const expected = [12, 8, 5, 3, 0];
		cy.get('[role="progressbar"]').each(($bar, i) => {
			cy.wrap($bar).should('have.attr', 'aria-valuenow', String(expected[i]));
		});
	});

	it('displays the final PowerScore total label', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.contains('28 / 100').should('exist');
	});
});

describe('PowerScoreBreakdown stall penalty', () => {
	it('shows zero when no stall penalty', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.contains('Clock stall penalty').parent().contains('0').should('exist');
	});

	it('shows negative value when stall penalty > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} stallPenalty={5} baseTotal={28} />);
		cy.contains('-5').should('exist');
	});

	it('renders the frozen-clock note when stall penalty > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} stallPenalty={5} baseTotal={28} />);
		cy.get('.powerscore-breakdown-note').should('exist');
	});

	it('does not render the frozen-clock note when stall penalty is 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('.powerscore-breakdown-note').should('not.exist');
	});
});

describe('PowerScoreBreakdown win probability variance', () => {
	it('does not show a volatility row when winProbabilityVariance is undefined', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.contains(/volatility/i).should('not.exist');
	});

	it('shows "Volatility Boost" label and positive value for positive variance', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} winProbabilityVariance={7} />);
		cy.contains('Volatility Boost').should('exist');
		cy.contains('+7').should('exist');
	});

	it('shows "Volatility Penalty" label and negative value for negative variance', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} winProbabilityVariance={-5} />);
		cy.contains('Volatility Penalty').should('exist');
		cy.contains('-5').should('exist');
	});

	it('shows "Volatility" label and zero for zero variance', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} winProbabilityVariance={0} />);
		cy.contains('Volatility').should('exist');
	});
});

describe('PowerScoreBreakdown factor icons', () => {
	it('renders one icon per boost/penalty row, matching the walkthrough legend', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} winProbabilityVariance={3} />);
		const expected = [
			'bi-hourglass-split',
			'bi-activity',
			'bi-star-fill',
			'bi-lightning-fill',
			'bi-bullseye',
			'bi-trophy-fill',
		];
		cy.get('.powerscore-factor-icon').should('have.length', expected.length);
		cy.get('.powerscore-factor-icon').each(($icon, i) => {
			cy.wrap($icon).should('have.class', expected[i]!);
		});
	});

	it('omits the volatility icon when there is no win-probability line', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('.powerscore-factor-icon').should('have.length', 5);
		cy.get('.bi-activity').should('not.exist');
	});

	it('hides the icons from assistive tech, leaving the label text to carry the meaning', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('.powerscore-factor-icon').each($icon => {
			cy.wrap($icon).should('have.attr', 'aria-hidden', 'true');
		});
	});
});

describe('PowerScoreBreakdown boosts', () => {
	it('shows "+N" for favorite bonus when > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} favoriteBonus={10} favoriteTeamCount={1} />);
		cy.contains('Favorite Boost').parent().contains('+10').should('exist');
	});

	it('shows the favorite team count note when favoriteBonus > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} favoriteBonus={10} favoriteTeamCount={1} />);
		cy.get('.powerscore-breakdown-note').should('contain', 'favorite team');
	});

	it('shows "+N" for game boost when > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} currentBoost={15} />);
		cy.contains('Game boost').parent().contains('+15').should('exist');
	});

	it('shows "+N" for postseason boost when > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} postseasonBoost={5} />);
		cy.contains('Postseason boost').parent().contains('+5').should('exist');
	});
});

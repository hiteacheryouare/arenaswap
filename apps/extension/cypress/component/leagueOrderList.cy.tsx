import LeagueOrderList from '../../entrypoints/popup/components/leagueOrderList';
import type { LeagueId } from '@arenaswap/core/types';

const defaultOrder: LeagueId[] = ['nba', 'nhl', 'mlb'];

const defaultProps = {
	order: defaultOrder,
	leagueLogos: {},
	disabled: false,
	onReorder: () => {},
	onReset: () => {},
};

describe('leagueOrderList', () => {
	it('renders one row per league in the given order', () => {
		cy.mount(<LeagueOrderList {...defaultProps} />);
		cy.get('.league-order-row').should('have.length', 3);
		cy.get('.league-order-label').eq(0).should('contain.text', 'NBA');
		cy.get('.league-order-label').eq(2).should('contain.text', 'MLB');
	});

	it('renders nothing when there is fewer than two leagues', () => {
		cy.mount(<LeagueOrderList {...defaultProps} order={['nba']} />);
		cy.get('.league-order-row').should('not.exist');
	});

	it('moves a league up with the up arrow', () => {
		const onReorder = cy.spy().as('onReorder');
		cy.mount(<LeagueOrderList {...defaultProps} onReorder={onReorder} />);
		cy.get('#league-order-up-nhl').click();
		cy.get('@onReorder').should('have.been.calledWith', 1, 0);
	});

	it('moves a league down with the down arrow', () => {
		const onReorder = cy.spy().as('onReorder');
		cy.mount(<LeagueOrderList {...defaultProps} onReorder={onReorder} />);
		cy.get('#league-order-down-nhl').click();
		cy.get('@onReorder').should('have.been.calledWith', 1, 2);
	});

	it('disables the up arrow on the first row and the down arrow on the last', () => {
		cy.mount(<LeagueOrderList {...defaultProps} />);
		cy.get('#league-order-up-nba').should('be.disabled');
		cy.get('#league-order-down-mlb').should('be.disabled');
		cy.get('#league-order-down-nba').should('not.be.disabled');
		cy.get('#league-order-up-mlb').should('not.be.disabled');
	});

	it('disables every control when the component is disabled', () => {
		cy.mount(<LeagueOrderList {...defaultProps} disabled />);
		cy.get('#league-order-down-nba').should('be.disabled');
		cy.get('#league-order-up-nhl').should('be.disabled');
		cy.get('.league-order-row').first().should('not.have.attr', 'draggable', 'true');
	});

	it('hides the reset button while the order is still the default', () => {
		cy.mount(<LeagueOrderList {...defaultProps} />);
		cy.get('#leagueOrderReset').should('not.exist');
	});

	it('shows the reset button once the order deviates from the default', () => {
		const onReset = cy.spy().as('onReset');
		cy.mount(<LeagueOrderList {...defaultProps} order={['mlb', 'nba', 'nhl']} onReset={onReset} />);
		cy.get('#leagueOrderReset').click();
		cy.get('@onReset').should('have.been.called');
	});

	it('reorders via drag and drop', () => {
		const onReorder = cy.spy().as('onReorder');
		cy.mount(<LeagueOrderList {...defaultProps} onReorder={onReorder} />);
		const dataTransfer = new DataTransfer();
		cy.get('.league-order-row').eq(2).trigger('dragstart', { dataTransfer });
		cy.get('.league-order-row').eq(0).trigger('dragover', { dataTransfer });
		cy.get('.league-order-row').eq(0).trigger('drop', { dataTransfer });
		cy.get('@onReorder').should('have.been.calledWith', 2, 0);
	});

	it('marks the hovered row as a drop target while dragging', () => {
		cy.mount(<LeagueOrderList {...defaultProps} />);
		const dataTransfer = new DataTransfer();
		cy.get('.league-order-row').eq(0).trigger('dragstart', { dataTransfer });
		cy.get('.league-order-row').eq(0).should('have.class', 'is-dragging');
		cy.get('.league-order-row').eq(1).trigger('dragover', { dataTransfer });
		cy.get('.league-order-row').eq(1).should('have.class', 'is-drag-over');
	});

	it('ignores a drop onto the row being dragged', () => {
		const onReorder = cy.spy().as('onReorder');
		cy.mount(<LeagueOrderList {...defaultProps} onReorder={onReorder} />);
		const dataTransfer = new DataTransfer();
		cy.get('.league-order-row').eq(1).trigger('dragstart', { dataTransfer });
		cy.get('.league-order-row').eq(1).trigger('drop', { dataTransfer });
		cy.get('@onReorder').should('not.have.been.called');
	});
});

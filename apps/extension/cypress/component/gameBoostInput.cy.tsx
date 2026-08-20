import GameBoostInput from '../../entrypoints/popup/components/gameBoostInput';

describe('GameBoostInput', () => {
	it('renders the heading and input', () => {
		cy.mount(<GameBoostInput gameId='g1' currentBoost={0} onSetGameBoost={() => {}} />);
		cy.contains('Game boost').should('exist');
		cy.get('input[type="number"]').should('exist');
	});

	it('displays the current boost value', () => {
		cy.mount(<GameBoostInput gameId='g1' currentBoost={10} onSetGameBoost={() => {}} />);
		cy.get('input[type="number"]').should('have.value', '10');
	});

	it('calls onSetGameBoost with the new value when input changes', () => {
		const spy = cy.spy().as('setBoost');
		cy.mount(<GameBoostInput gameId='g1' currentBoost={0} onSetGameBoost={spy} />);
		cy.get('input[type="number"]').clear().type('20');
		cy.get('@setBoost').should('have.been.calledWith', 'g1', 20);
	});

	it('clamps negative input to 0', () => {
		const spy = cy.spy().as('setBoost');
		cy.mount(<GameBoostInput gameId='g1' currentBoost={5} onSetGameBoost={spy} />);
		cy.get('input[type="number"]').clear().type('-3');
		cy.get('@setBoost').should('have.been.calledWith', 'g1', 0);
	});

	it('uses the gameId in the input id', () => {
		cy.mount(<GameBoostInput gameId='abc123' currentBoost={0} onSetGameBoost={() => {}} />);
		cy.get('#boost-detail-abc123').should('exist');
	});
});

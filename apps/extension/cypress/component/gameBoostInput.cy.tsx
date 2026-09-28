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

	it('names the input by its visible heading', () => {
		cy.mount(<GameBoostInput gameId='g1' currentBoost={0} onSetGameBoost={() => {}} />);
		cy.get('label[for="boost-detail-g1"]').should('have.text', 'Game boost');
	});

	it('steps the boost up and down a point at a time', () => {
		const spy = cy.spy().as('setBoost');
		cy.mount(<GameBoostInput gameId='g1' currentBoost={4} onSetGameBoost={spy} />);
		cy.get('button[aria-label="Add a point"]').click();
		cy.get('@setBoost').should('have.been.calledWith', 'g1', 5);
		cy.get('button[aria-label="Remove a point"]').click();
		cy.get('@setBoost').should('have.been.calledWith', 'g1', 3);
	});

	// The floor is zero, so the minus has nothing to do there and says so rather than firing a no-op.
	it('disables the minus at zero and never steps below it', () => {
		const spy = cy.spy().as('setBoost');
		cy.mount(<GameBoostInput gameId='g1' currentBoost={0} onSetGameBoost={spy} />);
		cy.get('button[aria-label="Remove a point"]').should('be.disabled');
		cy.get('button[aria-label="Add a point"]').should('not.be.disabled');
		cy.get('@setBoost').should('not.have.been.called');
	});

	it('draws the input without the browser spinner, inside the stepper', () => {
		cy.mount(<GameBoostInput gameId='g1' currentBoost={12} onSetGameBoost={() => {}} />);
		cy.get('.dt-stepper .powerscore-boost-input').should('have.value', '12').and(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).appearance, 'no spin buttons').to.equal('textfield');
			expect(el.scrollWidth, 'the value fits its box').to.be.at.most(el.clientWidth);
		});
	});

	it('renders without its own card when the host brings one', () => {
		cy.mount(<GameBoostInput bare gameId='g1' currentBoost={0} onSetGameBoost={() => {}} />);
		cy.get('.card').should('not.exist');
		cy.get('.dt-stepper').should('exist');
	});
});

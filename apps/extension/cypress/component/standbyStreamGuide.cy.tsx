import StandbyStreamGuide from '../../entrypoints/popup/components/standbyStreamGuide';

describe('standbyStreamGuide', () => {
	// It borrowed onboarding's fade, which waits 0.58s for a logo this screen doesn't have.
	it('fades in without waiting on anything', () => {
		cy.mount(<StandbyStreamGuide onDone={() => {}} />);
		cy.get('.standby-guide-content').should('have.css', 'animation-delay', '0s');
	});

	it('steps back from the second page', () => {
		cy.mount(<StandbyStreamGuide onDone={() => {}} />);
		cy.contains('button', 'Next').click();
		cy.contains('Step 2 of 2').should('exist');
		cy.contains('button', 'Back').click();
		cy.contains('Step 1 of 2').should('exist');
	});

	it('finishes from the second page', () => {
		const onDone = cy.spy().as('done');
		cy.mount(<StandbyStreamGuide onDone={onDone} />);
		cy.contains('button', 'Next').click();
		cy.contains('button', 'Got it').click();
		cy.get('@done').should('have.been.calledOnce');
	});
});

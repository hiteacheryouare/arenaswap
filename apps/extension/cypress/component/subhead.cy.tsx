import Subhead from '../../entrypoints/popup/components/subhead';

// v2's sub-page bars went back from anywhere on them, which is what this one has to do too.
describe('a sub-page top bar', () => {
	it('goes back from the title as well as the arrow, once per click', () => {
		const onBack = cy.spy().as('back');
		cy.mount(<div className='popup-container'><Subhead title='Settings' onBack={onBack} /></div>);
		cy.contains('.as-subhead h2', 'Settings').click();
		cy.get('@back').should('have.been.calledOnce');
		cy.get('.as-subhead .st-back').click();
		cy.get('@back').should('have.been.calledTwice');
		cy.get('.as-subhead').should('have.css', 'cursor', 'pointer');
	});

	it('leaves the page\'s own controls on the bar alone', () => {
		const onBack = cy.spy().as('back');
		const onHelp = cy.spy().as('help');
		cy.mount(<div className='popup-container'><Subhead title='Leagues' onBack={onBack} trailing={<button type='button' onClick={onHelp}>?</button>} /></div>);
		cy.contains('.as-subhead button', '?').click();
		cy.get('@help').should('have.been.calledOnce');
		cy.get('@back').should('not.have.been.called');
	});
});

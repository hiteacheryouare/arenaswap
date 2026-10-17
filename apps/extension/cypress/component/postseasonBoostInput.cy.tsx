import PostseasonBoostInput from '../../entrypoints/popup/components/postseasonBoostInput';

describe('PostseasonBoostInput', () => {
	it('renders the label and explainer', () => {
		cy.mount(<PostseasonBoostInput value={0} onChange={() => {}} />);
		cy.contains('Postseason boost').should('exist');
		cy.get('#postseasonBoostInput').should('exist');
	});

	it('draws its unit inside the field and reads it as the field\'s description', () => {
		cy.mount(<PostseasonBoostInput value={10} onChange={() => {}} />);
		cy.get('#postseasonBoostInput').closest('.form-adorn').find('.form-adorn-text').should('have.text', 'pts max');
		cy.get('#postseasonBoostInput').invoke('attr', 'aria-describedby').then(id => {
			cy.get(`#${id}`).should('have.text', 'pts max');
		});
	});

	it('displays the current value in the input', () => {
		cy.mount(<PostseasonBoostInput value={10} onChange={() => {}} />);
		cy.get('#postseasonBoostInput').should('have.value', '10');
	});

	it('calls onChange when value is updated', () => {
		const spy = cy.spy().as('onChange');
		cy.mount(<PostseasonBoostInput value={0} onChange={spy} />);
		cy.get('#postseasonBoostInput').type('{selectall}5');
		cy.get('@onChange').should('have.been.calledWith', 5);
	});

	it('clamps negative values to 0', () => {
		const spy = cy.spy().as('onChange');
		cy.mount(<PostseasonBoostInput value={3} onChange={spy} />);
		cy.get('#postseasonBoostInput').clear().type('-2');
		cy.get('@onChange').should('have.been.calledWith', 0);
	});
});

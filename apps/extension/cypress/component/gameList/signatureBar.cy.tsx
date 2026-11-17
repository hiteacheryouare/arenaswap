import { useState } from 'react';
import PopupFooter from '../../../entrypoints/popup/components/popupFooter';

interface footerHarnessProps {
	holdMs?: number;
	entrance: 'stack' | 'fade';
}

const FooterHarness = ({ holdMs = 0, entrance }: footerHarnessProps) => {
	const [ready, setReady] = useState(false);
	return (
		<div className='popup-container d-flex flex-column'>
			<button type='button' onClick={() => setReady(true)}>Land the slate</button>
			<PopupFooter ready={ready} holdMs={holdMs} entrance={entrance} />
		</div>
	);
};

const bar = () => cy.get('[data-testid="popup-signature-bar"]');
const landSlate = () => cy.contains('button', 'Land the slate').click();

describe('signature bar entrance', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('is already there when the popup comes back from another view', () => {
		cy.mount(<PopupFooter ready holdMs={0} entrance='stack' />);
		bar().should('not.have.class', 'is-waiting').and('not.have.class', 'is-stacking')
			.and('have.css', 'animation-name', 'none')
			.and('have.css', 'visibility', 'visible');
		cy.get('.popup-signature-stack').should('not.exist');
	});

	it('stays hidden while the slate loads, then stacks its colours in and settles on the gradient', () => {
		cy.mount(<FooterHarness entrance='stack' />);
		bar().should('have.class', 'is-waiting').and('have.css', 'visibility', 'hidden');

		landSlate();
		bar().should('have.class', 'is-stacking');
		cy.get('.popup-signature-stack > span').should('have.length', 6).first()
			.should('have.css', 'animation-name', 'signatureBlockDrop');
		cy.get('.popup-signature-stack > span').last().should('have.css', 'animation-delay', '0.3s');
		cy.get('.popup-signature-blend').should('have.css', 'animation-duration', '0.7s');

		bar().should('not.have.class', 'is-stacking')
			.and('have.css', 'background-image').and('contain', 'linear-gradient');
		cy.get('.popup-signature-stack').should('not.exist');
		cy.get('.popup-signature-credit').should('have.css', 'opacity', '1');
	});

	it('holds until the last card of the reveal has landed', () => {
		cy.clock();
		cy.mount(<FooterHarness entrance='stack' holdMs={2000} />);
		landSlate();
		cy.tick(1990);
		bar().should('have.class', 'is-waiting');
		cy.tick(20);
		bar().should('have.class', 'is-stacking');
	});

	it('fades in quietly when the opening animation is off', () => {
		cy.mount(<FooterHarness entrance='fade' />);
		landSlate();
		bar().should('have.class', 'is-fading').and('have.css', 'animation-name', 'signatureFadeIn');
		cy.get('.popup-signature-stack').should('not.exist');
		bar().should('not.have.class', 'is-fading').and('have.css', 'visibility', 'visible');
	});
});

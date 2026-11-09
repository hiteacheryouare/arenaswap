import { useState } from 'react';
import SensitivitySlider from '../../../entrypoints/popup/components/sensitivitySlider';

// Settings holds the value, so a drag has to come back round as a new prop for the label to change.
const SliderHarness = ({ start }: { start: number }) => {
	const [value, setValue] = useState(start);
	return <SensitivitySlider value={value} onChange={setValue} />;
};

// React only hears an input whose value went through the native setter.
const dragTo = (value: number) => cy.get('#sensitivity-range').then(([input]) => {
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
	input!.dispatchEvent(new Event('input', { bubbles: true }));
});

describe('the Ludicrous Speed label', () => {
	it('is already burning when Settings opens at the top level', () => {
		cy.mount(<SliderHarness start={7} />);
		cy.get('.ludicrous-speed').should('not.have.class', 'landing');
		cy.get('.ludicrous-speed-letter').should('not.exist');
	});

	it('lands when dragged to the top, then burns, and lands again on the way back up', () => {
		cy.clock();
		cy.mount(<SliderHarness start={6} />);
		cy.get('.ludicrous-speed').should('not.exist');

		dragTo(7);
		cy.get('.ludicrous-speed').should('have.class', 'landing').then(([label]) => {
			const text = label!.querySelector('.visually-hidden')!.textContent!;
			expect(text, 'a screen reader hears the whole label').to.contain('Ludicrous Speed');
			expect(label!.querySelectorAll('.ludicrous-speed-letter'), 'a letter each').to.have.length([...text].length);
		});

		cy.tick(1200);
		cy.get('.ludicrous-speed').should('not.have.class', 'landing').and('have.class', 'landed');
		cy.get('.ludicrous-speed-letter').should('not.exist');

		dragTo(6);
		cy.get('.ludicrous-speed').should('not.exist');
		dragTo(7);
		cy.get('.ludicrous-speed').should('have.class', 'landing');
	});
});

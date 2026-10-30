import BaseDiamond from '@arenaswap/ui/src/components/baseDiamond';

const states: [boolean, boolean, boolean, string][] = [
	[false, false, false, 'Bases empty'],
	[true, false, false, 'Runner on first'],
	[false, true, false, 'Runner on second'],
	[false, false, true, 'Runner on third'],
	[true, true, false, 'Runners on first and second'],
	[true, false, true, 'Runners on first and third'],
	[false, true, true, 'Runners on second and third'],
	[true, true, true, 'Bases loaded'],
];

describe('BaseDiamond', () => {
	states.forEach(([first, second, third, label]) => {
		it(`reads "${label}" and fills only those bases`, () => {
			cy.mount(<BaseDiamond first={first} second={second} third={third} />);

			cy.get('.base-diamond').should('have.attr', 'aria-label', label);
			cy.get('.base-first').should(first ? 'have.class' : 'not.have.class', 'occupied');
			cy.get('.base-second').should(second ? 'have.class' : 'not.have.class', 'occupied');
			cy.get('.base-third').should(third ? 'have.class' : 'not.have.class', 'occupied');
		});
	});
});

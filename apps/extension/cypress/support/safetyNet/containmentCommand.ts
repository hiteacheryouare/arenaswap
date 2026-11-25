import { findContainmentViolations, loadFontsUsedIn, type containmentOptions } from './containment';

Cypress.Commands.add('assertContained', { prevSubject: 'element' }, (subject: JQuery<HTMLElement>, options: containmentOptions = {}) => {
	cy.wrap(null, { log: false }).then(() => loadFontsUsedIn(subject[0]));
	cy.wrap(subject, { log: false }).should(([root]: JQuery<HTMLElement>) => {
		const messages = findContainmentViolations(root, options).map(violation => `[${violation.rule}] ${violation.message}`);
		expect(messages, `everything stays inside its surface:\n${messages.join('\n')}`).to.deep.equal([]);
	});
	return cy.wrap(subject, { log: false });
});

declare global {
	namespace Cypress {
		interface Chainable {
			assertContained: (options?: containmentOptions) => Chainable<JQuery<HTMLElement>>;
		}
	}
}

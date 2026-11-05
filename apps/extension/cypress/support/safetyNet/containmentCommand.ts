import { findContainmentViolations, loadFontsUsedIn, type containmentOptions } from './containment';

Cypress.Commands.add('assertContained', { prevSubject: 'element' }, (subject: JQuery<HTMLElement>, options: containmentOptions = {}) => {
	cy.wrap(null, { log: false }).then(() => loadFontsUsedIn(subject[0]));
	cy.wrap(subject, { log: false }).should(([root]: JQuery<HTMLElement>) => {
		const messages = findContainmentViolations(root, options).map(violation => `[${violation.rule}] ${violation.message}`);
		expect(messages, 'everything stays inside its surface').to.deep.equal([]);
	});
	return cy.wrap(subject, { log: false });
});

declare global {
	namespace Cypress {
		interface Chainable {
			/**
			 * Loads every font face the subject uses, then asserts that nothing inside it runs past its
			 * sides or past a box that clips it, that text cut short carries its full value as a title,
			 * and that the subject itself never scrolls sideways. Retries until it settles.
			 */
			assertContained: (options?: containmentOptions) => Chainable<JQuery<HTMLElement>>;
		}
	}
}

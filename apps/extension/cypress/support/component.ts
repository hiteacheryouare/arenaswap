import './commands';
import { mount } from 'cypress/react';

Cypress.Commands.add('mount', mount);

declare global {
	namespace Cypress {
		interface Chainable {
			mount: typeof mount;
		}
	}
}

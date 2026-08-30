import './commands';
import { mount } from 'cypress/react';

// Every spec mounts against the popup's shipped stylesheets, in the same order main.jsx loads
// them, so layout and computed-style assertions describe what the extension actually renders.
import '../../assets/bootstrap.scss';
import '../../assets/global.scss';

Cypress.Commands.add('mount', mount);

declare global {
	namespace Cypress {
		interface Chainable {
			mount: typeof mount;
		}
	}
}

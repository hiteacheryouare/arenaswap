import './commands';
import '@cypress/code-coverage/support';
import { mount } from 'cypress/react';

// Every spec mounts against the shipped stylesheets, in the same order main.jsx loads them, so
// layout and computed-style assertions describe what the extension actually renders. The guide's
// sheet is here too: its grid is positioned entirely in CSS, so a spec without it measures a stack
// of unpositioned divs and reports zero for every box.
import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import '../../assets/guide.scss';

Cypress.Commands.add('mount', mount);

declare global {
	namespace Cypress {
		interface Chainable {
			mount: typeof mount;
		}
	}
}

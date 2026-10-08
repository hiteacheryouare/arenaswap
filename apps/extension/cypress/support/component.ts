import './commands';
import '@cypress/code-coverage/support';
import { mount } from 'cypress/react';
import { clearSharedRequests } from '../../entrypoints/popup/components/summaryFetch';

// Every spec mounts against the shipped stylesheets, in the same order main.jsx loads them, so
// layout and computed-style assertions describe what the extension actually renders. The guide's
// sheet is here too: its grid is positioned entirely in CSS, so a spec without it measures a stack
// of unpositioned divs and reports zero for every box.
import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import '../../assets/guide.scss';

Cypress.Commands.add('mount', mount);

// Specs stub the same summary URL with different bodies, and the popup keeps a response for a few
// seconds so a hover and the click after it can share one. Without this, a test reads the last one's.
beforeEach(() => clearSharedRequests());

declare global {
	namespace Cypress {
		interface Chainable {
			mount: typeof mount;
		}
	}
}

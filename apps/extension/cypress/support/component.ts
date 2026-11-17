import './commands';
import './safetyNet/containmentCommand';
import '@cypress/code-coverage/support';
import { mount } from 'cypress/react';
import { resetPrefetchIntent } from '../../entrypoints/popup/components/prefetchIntent';

import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import '../../assets/guide.scss';
import '../../assets/settingsBackup.scss';

Cypress.Commands.add('mount', mount);

beforeEach(() => resetPrefetchIntent());

declare global {
	namespace Cypress {
		interface Chainable {
			mount: typeof mount;
		}
	}
}

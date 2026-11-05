import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import BackupSyncPage from '../../../entrypoints/popup/components/backupSyncPage';
import type { profileList } from '../../../utils/profiles';
import { english, inEveryLocale, type shippedLocale } from '../../support/safetyNet/locales';
import { mountInPopup, popupSurface } from '../../support/safetyNet/mountInPopup';
import { worstUserText } from '../../support/safetyNet/worstCase';

const noop = () => {};

const worstProfiles: profileList = {
	profiles: [
		{ id: 'main', name: worstUserText.profileName },
		{ id: 'spaced', name: 'Sunday Ticket Couch Crew With Grandpa' },
		{ id: 'short', name: 'Me' },
	],
	activeId: 'main',
};

const mountPage = (locale: shippedLocale) => mountInPopup(
	<BackupSyncPage prefs={createDefaultUserPreferences()} fantasyRoster={[]} profiles={worstProfiles} profilesBusy={false} profileActions={{ onSwitch: noop, onCreate: noop, onRename: noop, onDelete: noop }} />,
	locale,
);

// A row's name is the same in every language, so it gets one test of its own and the per-locale ones
// leave it out rather than failing twelve times over it.
const rowName = '.profile-row-name';

describe('profiles containment', () => {
	it('names a profile in full on hover when the list cuts it short', () => {
		mountPage(english);
		cy.get('.profile-list').assertContained();
	});

	inEveryLocale('keeps the longest profile names inside the page', locale => {
		mountPage(locale);
		cy.get(popupSurface).assertContained({ exempt: [rowName] });
	});

	inEveryLocale('keeps the new-profile dialog inside the popup with the longest name active', locale => {
		mountPage(locale);
		cy.get('#profileNew').click();
		cy.get('#profileDialog').should('be.visible');
		cy.get(popupSurface).assertContained({ exempt: [rowName] });
	});
});

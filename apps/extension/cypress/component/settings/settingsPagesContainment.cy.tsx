import SetupView from '../../../entrypoints/popup/components/setupView';
import { settingsGroups } from '../../../entrypoints/popup/components/settingsCatalog';
import { inEveryLocale } from '../../support/safetyNet/locales';
import { mountPopupView, popupSurface } from '../../support/safetyNet/mountInPopup';
import { settingsProps, withClassicScrollbar } from '../../support/safetyNet/settingsFixture';

const scrollbars = [
	{ label: 'overlay scrollbar', classic: false },
	{ label: '15px scrollbar', classic: true },
];

describe('settings pages containment', () => {
	for (const { label, classic } of scrollbars) {
		inEveryLocale(`keeps the settings index inside the popup with a ${label}`, locale => {
			if (classic) withClassicScrollbar();
			mountPopupView(<SetupView {...settingsProps} />, locale);
			cy.get('.settings-index-row').should('have.length.at.least', 7);
			cy.get(popupSurface).assertContained();
		});

		for (const group of settingsGroups) {
			inEveryLocale(`keeps the ${group.id} page inside the popup with a ${label}`, locale => {
				if (classic) withClassicScrollbar();
				mountPopupView(<SetupView {...settingsProps} />, locale);
				cy.get(`#settingsGroup-${group.id}`).click();
				cy.get('.setup-header').should('exist');
				cy.get(popupSurface).assertContained();
			});
		}
	}
});

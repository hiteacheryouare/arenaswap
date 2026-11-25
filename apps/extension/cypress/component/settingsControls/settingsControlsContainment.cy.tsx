import SetupView from '../../../entrypoints/popup/components/setupView';
import StandbyStreamGuide from '../../../entrypoints/popup/components/standbyStreamGuide';
import MultiviewGuide from '../../../entrypoints/popup/components/multiviewGuide';
import { inEveryLocale, type shippedLocale } from '../../support/safetyNet/locales';
import { mountPopupView, popupSurface, popupViewport } from '../../support/safetyNet/mountInPopup';
import { settingsProps } from '../../support/safetyNet/settingsFixture';
import { worstUserText } from '../../support/safetyNet/worstCase';

const open = (locale: shippedLocale, extra: Record<string, unknown> = {}) => {
	mountPopupView(<SetupView {...settingsProps} {...extra} />, locale);
};

const typeInto = (selector: string, text: string) => cy.get(selector).type(text, { delay: 0 });

describe('settings controls containment', () => {
	inEveryLocale('keeps the settings search inside the popup for a long unbroken query and a broad one', locale => {
		open(locale);
		typeInto('#settingsSearch', worstUserText.unbroken(120));
		cy.get(popupSurface).assertContained();
		cy.get('#settingsSearch').clear();
		typeInto('#settingsSearch', 'e');
		cy.get('.settings-index-row').should('have.length.at.least', 3);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the Boss Button page inside the popup with a long unbroken address typed', locale => {
		open(locale);
		cy.get('#settingsGroup-switching').click();
		typeInto('#bossDecoyInput', worstUserText.unbroken(300));
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps every open select list inside the popup', locale => {
		open(locale);
		for (const group of ['switching', 'display', 'standby']) {
			cy.get('.setup-header').then($header => { if ($header.length) cy.get('.setup-header').click(); });
			cy.get(`#settingsGroup-${group}`).click();
			cy.get('.form-control-caret').each($select => {
				cy.wrap($select).click();
				cy.get(popupSurface).assertContained();
				cy.get('body').type('{esc}');
			});
		}
	});

	inEveryLocale('keeps every settings tooltip inside the popup window', locale => {
		open(locale);
		for (const group of ['switching', 'scoring', 'display', 'standby', 'multiview']) {
			cy.get('.setup-header').then($header => { if ($header.length) cy.get('.setup-header').click(); });
			cy.get(`#settingsGroup-${group}`).click();
			cy.get('.setup-header').should('exist');
			cy.get('body').then($body => $body.find('.setting-tooltip-btn').toArray()).each(button => {
				const $button = Cypress.$(button);
				cy.wrap($button).scrollIntoView().trigger('mouseover');
				cy.get('.tooltip.show').should($tooltip => {
					const box = $tooltip[0].getBoundingClientRect();
					const label = $tooltip.text().slice(0, 40);
					expect(box.left, `"${label}" left edge`).to.be.at.least(0);
					expect(box.top, `"${label}" top edge`).to.be.at.least(0);
					expect(box.right, `"${label}" right edge`).to.be.at.most(popupViewport.width);
					expect(box.bottom, `"${label}" bottom edge`).to.be.at.most(popupViewport.height);
				});
				cy.wrap($button).trigger('mouseout');
			});
		}
	});
});

describe('settings guide cards containment', () => {
	inEveryLocale('keeps the Standby Stream guide inside the popup', locale => {
		mountPopupView(<StandbyStreamGuide onDone={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});

	inEveryLocale('keeps the Multiview guide inside the popup', locale => {
		mountPopupView(<MultiviewGuide onAllow={() => {}} onNotNow={() => {}} />, locale);
		cy.get(popupSurface).assertContained();
	});
});

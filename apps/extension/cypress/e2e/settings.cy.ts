import { liveState, onboardedPrefs } from '../support/fixtures';

const onboarded = { local: { onboardingCompleted: true }, sync: { prefs: onboardedPrefs() } };
const openSettings = () => cy.get('button.popup-settings-button[aria-label="Settings"]').click();
const openGroup = (id: string) => cy.get(`#settingsGroup-${id}`).click();

describe('settings round-trip', () => {
	beforeEach(() => cy.openPopup({ ...onboarded, state: liveState() }));

	it('reaches the settings index from the games list and back again', () => {
		openSettings();
		cy.get('.settings-index-row').should('have.length', 7);

		cy.get('button.setup-header').click();
		cy.contains('.popup-section-title', 'Live Games').should('be.visible');
	});

	it('drills into a group and returns to the index', () => {
		openSettings();
		openGroup('switching');
		cy.get('#sensitivity-range').should('exist');

		cy.get('button.setup-header').click();
		cy.get('.settings-index-row').should('have.length', 7);
	});

	it('persists a sensitivity change to storage and the background', () => {
		openSettings();
		openGroup('switching');
		cy.get('#sensitivity-range').setInputValue(7);

		cy.contains('.setting-value-label', 'Ludicrous Speed').should('be.visible');
		cy.background().should(background => {
			expect(background.prefs?.sensitivity).to.equal(7);
			// Prefs are mirrored to both areas: sync for portability, local as the offline fallback.
			expect(background.storage.sync.has('prefs')).to.equal(true);
			expect(background.storage.local.has('prefs')).to.equal(true);
		});
	});

	it('survives a close and reopen with the stored prefs', () => {
		openSettings();
		openGroup('display');
		cy.get('#upcomingToggle').should('be.checked').uncheck({ force: true });

		cy.background().its('prefs').then(prefs => {
			// Reopening the popup is a fresh page load reading whatever storage kept.
			cy.openPopup({ ...onboarded, state: liveState(), sync: { prefs } });
			openSettings();
			openGroup('display');
			cy.get('#upcomingToggle').should('not.be.checked');
		});
	});

	it('reorders leagues and reports the new order', () => {
		openSettings();
		openGroup('leagues');
		cy.get('.league-order-row').first().find('.league-order-label').should('have.text', 'NBA');

		cy.get('#league-order-down-nba').click();

		cy.get('.league-order-row').first().find('.league-order-label').should('have.text', 'NFL');
		cy.background().its('prefs.enabledLeagues').should('deep.equal', ['nfl', 'nba']);
	});

	it('warns when every league is switched off', () => {
		openSettings();
		openGroup('leagues');
		cy.get('#league-nba').uncheck({ force: true });
		cy.get('#league-nfl').uncheck({ force: true });

		cy.contains('.setup-no-leagues-warn', /No leagues selected/).scrollIntoView().should('be.visible');
		cy.get('button.setup-header').click();
		cy.get('#settingsGroup-leagues').find('.settings-index-warn').should('exist');
	});

	it('keeps the last PowerScore signal from being switched off', () => {
		openSettings();
		openGroup('scoring');
		for (const signal of ['closeness', 'lateGame', 'momentum', 'leadChanges']) {
			cy.get(`#signal-${signal}`).uncheck({ force: true });
		}

		cy.get('#signal-comeback').should('be.disabled');
		cy.background().its('prefs.disabledSignals').should('have.length', 4);
	});

	it('finds a control through the settings search', () => {
		openSettings();
		cy.get('#settingsSearch').type('cooldown');

		cy.get('.settings-index-row').should('have.length', 1);
		cy.contains('.settings-index-row', 'Switching').click();
		cy.get('#cooldown-range').should('exist');
	});
});

import { liveState, onboardedPrefs, openTabs, sixersThunder } from '../support/fixtures';

describe('popup boots', () => {
	it('serves the built bundle with styles, fonts and translations', () => {
		cy.openPopup();

		// Translated, not a raw messages.json key — proves browser.i18n is wired.
		cy.contains('Welcome to ArenaSwap').should('be.visible');
		cy.get('body').should('have.css', 'background-color', 'rgb(13, 17, 23)');
		cy.get('body').should('have.css', 'font-family').and('contain', 'DM Sans');
		cy.background().its('sent').should('deep.include', { type: 'GET_STATE', forceRefresh: false });
	});

	it('renders games out of the fake background once onboarding is stored', () => {
		cy.openPopup({
			state: liveState(),
			tabs: openTabs,
			local: { onboardingCompleted: true },
			sync: { prefs: onboardedPrefs() },
		});

		cy.contains('Welcome to ArenaSwap').should('not.exist');
		cy.contains(sixersThunder.homeTeam.abbreviation).should('be.visible');
	});

	it('delivers a live score push to the running popup', () => {
		cy.openPopup({
			local: { onboardingCompleted: true },
			sync: { prefs: onboardedPrefs() },
		});

		cy.contains(sixersThunder.homeTeam.abbreviation).should('not.exist');
		cy.pushScores(liveState());
		cy.contains(sixersThunder.homeTeam.abbreviation).should('be.visible');
	});
});

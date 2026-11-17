import { revealFullRate, revealOpenMs, revealSettleMs } from '../../../entrypoints/popup/cardReveal';
import { liveState, onboardedPrefs, openTabs, sixersThunder } from '../../support/fixtures';

const revealClear = revealSettleMs('full') + 2000;
const barsEnterMs = 1500;
const barsRunMs = 1000;
const midPassMs = revealOpenMs('full') + (barsEnterMs + barsRunMs / 2) * revealFullRate;

describe('popup boots', () => {
	it('serves the built bundle with styles, fonts and translations', () => {
		cy.openPopup();

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
		cy.contains(sixersThunder.homeTeam.abbreviation, { timeout: revealClear }).should('be.visible');
	});

	it('never scrolls sideways while the open animation plays', () => {
		cy.openPopup({
			state: liveState(),
			tabs: openTabs,
			local: { onboardingCompleted: true },
			sync: { prefs: onboardedPrefs() },
		});

		cy.get('.game-card-reveal').should('exist');
		cy.document().should(doc => {
			expect(doc.documentElement.scrollWidth, 'scroll width at the first frame')
				.to.be.at.most(doc.documentElement.clientWidth);
		});
		cy.wait(midPassMs);
		cy.document().should(doc => {
			expect(doc.documentElement.scrollWidth, 'scroll width mid-sweep')
				.to.be.at.most(doc.documentElement.clientWidth);
			const root = doc.querySelector('.popup-root')!;
			expect(getComputedStyle(root).overflowX, 'x axis').to.equal('clip');
			expect(getComputedStyle(root).overflowY, 'y axis').to.equal('visible');
		});
	});

	it('delivers a live score push to the running popup', () => {
		cy.openPopup({
			local: { onboardingCompleted: true },
			sync: { prefs: onboardedPrefs() },
		});

		cy.contains(sixersThunder.homeTeam.abbreviation).should('not.exist');
		cy.pushScores(liveState());
		cy.contains(sixersThunder.homeTeam.abbreviation, { timeout: revealClear }).should('be.visible');
	});
});

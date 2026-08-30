import { bullsHeat, eaglesCowboys, liveState, makeScore, onboardedPrefs, openTabs, sixersThunder } from '../support/fixtures';

const onboarded = { local: { onboardingCompleted: true }, sync: { prefs: onboardedPrefs() } };
const cardFor = (abbreviation: string) => cy.contains('.game-card', abbreviation);
const tabPicker = (abbreviation: string) => cardFor(abbreviation).find('.game-card-tab-assign select');

describe('registering a tab and watching the lead change', () => {
	beforeEach(() => cy.openPopup({ ...onboarded, state: liveState(), tabs: openTabs }));

	it('orders the list by PowerScore, highest first', () => {
		cy.get('.game-card-ps-score').should('have.length', 2);
		cy.get('.game-card-ps-score').first().should('have.text', '82 / 100');
		cy.get('.game-card-ps-score').last().should('have.text', '19 / 100');
	});

	it('assigns a tab to a game and tells the background about it', () => {
		tabPicker(sixersThunder.homeTeam.abbreviation).select(openTabs[0].title);

		cy.background().its('registry').should('deep.equal', [
			{ tabId: openTabs[0].id, gameId: sixersThunder.id },
		]);
		// A registered game is promoted out of Live Games into its own section.
		cy.contains('.popup-section-title', 'Active Tabs').should('be.visible');
	});

	it('keeps one tab from serving two games at once', () => {
		tabPicker(sixersThunder.homeTeam.abbreviation).select(openTabs[0].title);

		tabPicker(bullsHeat.homeTeam.abbreviation)
			.contains('option', openTabs[0].title)
			.should('be.disabled');
	});

	it('releases the tab when the assignment is cleared', () => {
		tabPicker(sixersThunder.homeTeam.abbreviation).select(openTabs[0].title);
		cy.background().its('registry').should('have.length', 1);

		tabPicker(sixersThunder.homeTeam.abbreviation).select('');
		cy.background().its('registry').should('deep.equal', []);
	});

	it('re-sorts live when the background pushes a new leader', () => {
		cy.get('.game-card-ps-score').first().should('have.text', '82 / 100');

		// The blowout turns into the close game and the close one cools off.
		cy.pushScores({
			scores: [makeScore(sixersThunder.id, 11), makeScore(bullsHeat.id, 94)],
		});

		cy.get('.game-card-ps-score').first().should('have.text', '94 / 100');
		cy.contains('.game-card', bullsHeat.homeTeam.abbreviation)
			.find('.game-card-ps-score').should('have.text', '94 / 100');
	});

	it('picks up a game that only appears in a later push', () => {
		cy.contains('.game-card', 'DAL').should('not.exist');

		const current = liveState();
		cy.pushScores({
			games: [...current.games, eaglesCowboys],
			scores: [...current.scores, makeScore(eaglesCowboys.id, 66)],
		});

		// Three cards overflow a 560px-tall popup, so the newcomer is only reachable by scrolling.
		cy.contains('.game-card', 'DAL').should('exist');
		cy.get('.popup-container').scrollTo('bottom');
		cy.contains('.game-card', 'DAL').should('be.visible');
	});
});

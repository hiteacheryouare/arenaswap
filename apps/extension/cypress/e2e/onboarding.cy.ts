import { liveState, onboardedPrefs, sixersThunder } from '../support/fixtures';

const html = () => cy.document().its('documentElement');

// The three onboarding steps plus the "all set" screen, from a genuinely empty profile: no stored
// prefs and no onboardingCompleted flag, which is the only state a real first install is in.
describe('onboarding', () => {
	beforeEach(() => cy.openPopup({ state: liveState() }));

	it('opens on the tab-control step', () => {
		cy.contains('Step 1 of 3').should('be.visible');
		cy.contains('Welcome to ArenaSwap').should('be.visible');
		cy.contains('Automatic tab switching').should('be.visible');
	});

	it('opens on the Theme setting default, which is dark', () => {
		cy.get('.ob-welcome').should('exist');
		html().should('have.attr', 'data-bs-theme', 'dark');
	});

	it('walks all three steps and lands on the games list', () => {
		cy.contains('button', 'Got it').click();

		cy.contains('Step 2 of 3').should('be.visible');
		cy.contains('Which sports do you watch?').should('be.visible');
		cy.get('#onb-league-nba').should('be.checked');
		cy.contains('button', 'Next').click();

		cy.wait('@espnTeams');
		cy.contains('Step 3 of 3').should('be.visible');
		cy.contains('Pick your teams').should('be.visible');
		cy.get('[aria-label="Add Philadelphia 76ers to favorites"]').click();
		cy.contains('button', 'Done').click();

		cy.contains(/You.re all set!/).should('be.visible');
		cy.contains('button', 'Jump right in').click();

		cy.contains('Welcome to ArenaSwap!').should('be.visible');
		cy.get('.as-stage').should('contain.text', sixersThunder.homeTeam.abbreviation);
		cy.get('[data-game]').should('have.length.at.least', 1);
	});

	it('persists the picked leagues and favorites through to the background', () => {
		cy.contains('button', 'Got it').click();
		cy.get('#onb-league-nfl').uncheck({ force: true });
		cy.get('#onb-league-nhl').uncheck({ force: true });
		cy.get('#onb-league-mlb').uncheck({ force: true });
		cy.contains('.ob-foot', '1 league').should('be.visible');
		cy.contains('button', 'Next').click();

		cy.wait('@espnTeams');
		cy.get('[aria-label="Add Philadelphia 76ers to favorites"]').click();
		cy.contains('button', 'Done').click();
		cy.contains('button', 'Jump right in').click();

		cy.background().should(background => {
			expect(background.prefs?.enabledLeagues).to.deep.equal(['nba']);
			expect(background.prefs?.favoriteTeamIds).to.deep.equal(['nba:20']);
			// The flag is what stops the next open replaying onboarding.
			expect(background.storage.local.get('onboardingCompleted')).to.equal(true);
		});
	});

	it('blocks the league step until at least one league is picked', () => {
		cy.contains('button', 'Got it').click();
		for (const league of ['nba', 'nfl', 'nhl', 'mlb']) {
			cy.get(`#onb-league-${league}`).uncheck({ force: true });
		}
		cy.contains('button', 'Next').should('be.disabled');

		cy.get('label[for="onb-league-nba"]').click();
		cy.get('#onb-league-nba').should('be.checked');
		cy.contains('button', 'Next').should('be.enabled');
	});

	it('takes the tour from the all-set screen', () => {
		cy.contains('button', 'Got it').click();
		cy.contains('button', 'Next').click();
		cy.wait('@espnTeams');
		cy.contains('.ob-stepline button', 'Skip').click();
		cy.contains('button', 'Take the tour').click();

		cy.contains('Step 1 of 8').should('be.visible');
		cy.contains('Turning it on & off').should('be.visible');
		cy.background().should(background => {
			expect(background.storage.local.get('onboardingCompleted')).to.equal(true);
		});
	});

	it('skips onboarding entirely when a profile is already stored', () => {
		cy.openPopup({
			state: liveState(),
			local: { onboardingCompleted: true },
			sync: { prefs: { enabledLeagues: ['nba'] } },
		});

		cy.contains('Step 1 of 3').should('not.exist');
		cy.contains('[data-game]', sixersThunder.homeTeam.abbreviation).should('be.visible');
	});
});

describe('the tour', () => {
	it('follows the Theme setting', () => {
		cy.openPopup({ state: liveState(), local: { onboardingCompleted: true }, sync: { prefs: onboardedPrefs({ theme: 'light' }) } });
		html().should('have.attr', 'data-bs-theme', 'light');

		cy.get('[aria-label="Tour"]').click();

		cy.contains('Step 1 of 8').should('be.visible');
		html().should('have.attr', 'data-bs-theme', 'light');
	});
});

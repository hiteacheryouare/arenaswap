const anyScoreboard = 'https://site.api.espn.com/apis/site/v2/sports/**/scoreboard*';
const eplScoreboard = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard*';

const visitWithEplLive = () => {
	// Every other league answers empty, so only the two soccer matches reach the board. Cypress
	// prefers the most recently registered matching intercept, so the specific one goes last.
	cy.intercept('GET', anyScoreboard, { body: { events: [] } });
	cy.intercept('GET', eplScoreboard, { fixture: 'espnEplLive.json' }).as('epl');
	cy.visit('/powerscore/');
	cy.get('#live-scores').scrollIntoView();
	cy.wait('@epl');
	cy.get('#live-scores .ps-score-bar-fill').should('have.length', 2);
};

describe('the live board and the extension describe the same soccer match', () => {
	it('labels the half the way the extension labels it', () => {
		visitWithEplLive();

		cy.get('#live-scores').should('contain.text', '2H').and('not.contain.text', 'H2');
		cy.get('#live-scores').should('contain.text', 'ET1').and('not.contain.text', 'OT');
	});

	it('reads the minute off a soccer clock instead of reporting nothing', () => {
		visitWithEplLive();

		cy.get('#live-scores').should('not.contain.text', '0:00');
	});

	it('prints the soccer clock in the notation the extension prints', () => {
		visitWithEplLive();

		cy.get('#live-scores').should('contain.text', "95'").and('not.contain.text', '95:00');
		cy.get('#live-scores').should('contain.text', "105'").and('not.contain.text', '105:00');
	});
});

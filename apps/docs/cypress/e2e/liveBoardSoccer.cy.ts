// What the live PowerScore board renders for a soccer match, and the reason it is worth a spec of
// its own: `LivePowerScores.tsx` used to carry private copies of three helpers the project already
// had, and all three disagreed with the extension.
//
// The clock copy understood only `MM:SS`, so a `90'+5'` match parsed to 0 and scored as though the
// half had not started. The period copy printed `H2` for `2H` and a flat `OT` for `ET1`/`ET2`/
// `PENS`. The display copy printed `95:00` where the extension prints `95'`. All three are gone:
// the component imports `parseClockToSeconds` from `@arenaswap/core/gameClock`, and `formatPeriod`
// and `formatGameClock` from `packages/ui/src/components/gameFormat.ts`. These rows are what keeps
// the page and the product it is selling reading the same.
//
// The fixture is a real ESPN eng.1 scoreboard captured 2026-09-21 — event ids, clubs, abbreviations
// and the `90'+5'` clock are exactly what ESPN returned. Two things are authored: the state is
// moved from `post` to `in`, and the second match is put into extra time at `105'`. Both are the
// notation `packages/core/tests/apiClient.test.ts` already treats as ESPN's, so nothing here is
// guessed about the wire format.

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
	// The extension renders `2H` for the second half and `ET1` for the first period of extra time.
	// This page renders `H2` and a flat `OT`, so a reader who has the extension open beside the
	// site sees two different labels on one match, and `PENS` is a state the page cannot express
	// at all — a shootout reads as overtime.
	it('labels the half the way the extension labels it', () => {
		visitWithEplLive();

		cy.get('#live-scores').should('contain.text', '2H').and('not.contain.text', 'H2');
		cy.get('#live-scores').should('contain.text', 'ET1').and('not.contain.text', 'OT');
	});

	// `parseClockToSeconds` here only understands `MM:SS`. ESPN sends soccer as `90'+5'`, which
	// splits into one part, so the function returns 0 for every live soccer match on this page.
	//
	// The clock is not only printed — it goes into `Game.clockSeconds`, which `computePowerScore`
	// reads for the late-game signal. So a 95th-minute match is scored as though no time had
	// elapsed, and the ranking this whole section exists to demonstrate is wrong for every soccer
	// game in it. That is the half of this that a reader cannot see.
	it('reads the minute off a soccer clock instead of reporting nothing', () => {
		visitWithEplLive();

		cy.get('#live-scores').should('not.contain.text', '0:00');
	});

	/* The minute can parse correctly and still print in the wrong notation, which is how the
	   third duplicated helper survived the first two being shared. `90'+5'` parses to 5700
	   seconds; the extension renders that `95'` and the page's own `formatClock` rendered it
	   `95:00`, a soccer match reported in minutes and seconds.

	   Asserted on the notation rather than on the absence of `0:00`: the test above is satisfied
	   by `95:00`, so it could never have caught this on its own. */
	it('prints the soccer clock in the notation the extension prints', () => {
		visitWithEplLive();

		cy.get('#live-scores').should('contain.text', "95'").and('not.contain.text', '95:00');
		cy.get('#live-scores').should('contain.text', "105'").and('not.contain.text', '105:00');
	});
});

// PARTLY FAILING ON PURPOSE. These tests describe what the live PowerScore board should render for
// a soccer match. Two of the three now hold; the third does not, and the fix belongs to whoever
// owns the component.
//
// `LivePowerScores.tsx` used to carry private copies of three helpers the project already had.
// Two of them are gone: it now imports `formatPeriod` from
// `packages/ui/src/components/periodFormat.ts` and `parseClockToSeconds` from
// `@arenaswap/core/gameClock`, so the half label and the parsed minute both match the extension.
//
// The third copy is still there. `formatClock` at the bottom of the component is `MM:SS` only,
// where the extension prints a soccer clock as a minute and a prime through `formatGameClock` in
// `packages/ui/src/components/gameCardShared.tsx`. So the same live match still reads one way in
// the extension and another way on the page selling it — which is the whole complaint this spec
// was written to make.
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

	/* RED. The minute is parsed correctly now and then printed in the wrong notation.
	   `90'+5'` parses to 5700 seconds, which the extension's `formatGameClock` renders as `95'`
	   and this page's private `formatClock` renders as `95:00` — a soccer match reported in
	   minutes and seconds, which is not how anybody writes a soccer clock.

	   The test above passes only because `95:00` is not the string `0:00`. It was written to
	   catch this and its assertion is too weak to.

	   The fix is to move `formatGameClock` next to `formatPeriod` in `periodFormat.ts` and call
	   it here, the same way the other two copies were resolved. */
	it('prints the soccer clock in the notation the extension prints', () => {
		visitWithEplLive();

		cy.get('#live-scores').should('contain.text', "95'").and('not.contain.text', '95:00');
		cy.get('#live-scores').should('contain.text', "105'").and('not.contain.text', '105:00');
	});
});

import { bullsHeat, liveState, makeGame, makeScore, onboardedPrefs, openTabs, sixersThunder } from '../support/fixtures';

const onboarded = { local: { onboardingCompleted: true }, sync: { prefs: onboardedPrefs() } };
const openDetail = (abbreviation: string) => cy.contains('.game-card', abbreviation).click();

describe('game detail drill-down', () => {
	beforeEach(() => cy.openPopup({ ...onboarded, state: liveState(), tabs: openTabs }));

	it('opens the detail view from a card and comes back', () => {
		openDetail(sixersThunder.awayTeam.abbreviation);

		cy.get('.game-detail-shell').should('exist');
		cy.contains('.game-detail-team-name', sixersThunder.homeTeam.name).should('be.visible');
		cy.contains('.game-detail-team-name', sixersThunder.awayTeam.name).should('be.visible');

		cy.get('.game-detail-back-button').click();
		cy.contains('.popup-section-title', 'Live Games').should('be.visible');
	});

	it('shows the score and the PowerScore breakdown for the game that was clicked', () => {
		openDetail(sixersThunder.awayTeam.abbreviation);

		cy.get('.game-detail-score-value').first().should('have.text', String(sixersThunder.awayTeam.score));
		cy.get('.game-detail-score-value').last().should('have.text', String(sixersThunder.homeTeam.score));

		cy.contains('.powerscore-breakdown-heading', 'PowerScore Breakdown').should('exist');
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '82 / 100');
		for (const signal of ['Closeness', 'Late-game', 'Momentum', 'Lead changes', 'Comeback']) {
			cy.contains('.powerscore-signal-name', signal).should('exist');
		}
	});

	it('opens the other card independently', () => {
		openDetail(bullsHeat.awayTeam.abbreviation);

		cy.contains('.game-detail-team-name', bullsHeat.homeTeam.name).should('be.visible');
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '19 / 100');
	});

	it('does not open detail when the tab picker is used', () => {
		cy.contains('.game-card', sixersThunder.homeTeam.abbreviation)
			.find('.game-card-tab-assign select')
			.select(openTabs[0].title);

		cy.get('.game-detail-shell').should('not.exist');
	});

	it('tracks a live score push while the detail view is open', () => {
		openDetail(sixersThunder.awayTeam.abbreviation);
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '82 / 100');

		const current = liveState();
		cy.pushScores({
			games: [{ ...sixersThunder, homeTeam: { ...sixersThunder.homeTeam, score: 111 } }, bullsHeat],
			scores: [makeScore(sixersThunder.id, 95), current.scores[1]],
		});

		cy.get('.game-detail-score-value').last().should('have.text', '111');
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '95 / 100');
	});

	it('boosts a game from the detail view and reports it to the background', () => {
		openDetail(sixersThunder.awayTeam.abbreviation);

		cy.get(`#boost-detail-${sixersThunder.id}`).setInputValue(12);

		cy.background().its('state.gameBoosts').should('deep.equal', { [sixersThunder.id]: 12 });
		cy.background().its('sent').should('deep.include', {
			type: 'SET_GAME_BOOST', gameId: sixersThunder.id, boost: 12,
		});
	});

	it('falls back gracefully when the game leaves the state', () => {
		openDetail(sixersThunder.awayTeam.abbreviation);
		cy.get('.game-detail-shell').should('exist');

		// The game ends and drops out of the background's list while the user is still looking at it.
		cy.pushScores({ games: [bullsHeat], scores: [makeScore(bullsHeat.id, 19)] });

		cy.get('.game-detail-shell').should('not.exist');
		cy.contains('.popup-section-title', 'Live Games').should('be.visible');
	});
});

// #104. The popup has no router: `app.tsx` keys the view shell on `view`, so opening a game used to
// unmount the whole list and take the scroller's offset with it.
const crowdedSlate = () => {
	const games = Array.from({ length: 8 }, (_, index) => makeGame(`nba-filler-${index}`, {
		homeTeam: { id: `h${index}`, name: `Home ${index}`, abbreviation: `H${index}`, score: 90 + index },
		awayTeam: { id: `a${index}`, name: `Away ${index}`, abbreviation: `A${index}`, score: 88 + index },
	}));
	return {
		...liveState(),
		games,
		scores: games.map((game, index) => makeScore(game.id, 80 - index)),
	};
};

describe('returning from a game detail screen', () => {
	beforeEach(() => cy.openPopup({ ...onboarded, state: crowdedSlate(), tabs: openTabs }));

	// Every @font-face is forced in before anything is measured. Bootstrap Icons lands during the
	// popup's first moments and shortens each card by two pixels, and Chrome's scroll anchoring then
	// nudges the offset to compensate -- which reads as the restore being a few pixels out.
	// `document.fonts.ready` is not enough on its own: it resolves before a face nothing has painted
	// yet is ever requested.
	beforeEach(() => cy.document().then(doc => Promise.all(
		Array.from(doc.fonts, face => face.load()),
	).then(() => doc.fonts.ready)));

	// Measured mid-list rather than at the bottom, so the assertion is about the offset itself and not
	// about how tall the list happens to be. Clamping a saved offset the list has outgrown is the
	// hook's intended behavior and is asserted exactly in the component spec.
	it('lands you back where you were scrolled to', () => {
		cy.get('.popup-container').scrollTo(0, 600);
		cy.get('.popup-container').should('have.prop', 'scrollTop', 600);

		// `scrollBehavior: false` matters: Cypress scrolls a click target into view before clicking,
		// which would move the list out from under the offset the test is about to check.
		cy.contains('.game-card', 'A4').click({ scrollBehavior: false });
		cy.get('.game-detail-shell').should('exist');
		cy.get('.game-detail-back-button').click();

		// Waiting on the list before querying the scroller is not decoration. `cy.get` resolves once and
		// `should` retries against that same element, so querying too early pins the assertion to the
		// detached container -- which reports scrollTop 0 for the whole retry window.
		cy.contains('.popup-section-title', 'Live Games').should('exist');
		cy.get('.popup-container').should('have.prop', 'scrollTop', 600);
	});

	// The offset is held by the app rather than by the detail screen, so it is not the game screen
	// specifically that restores it -- any view you come back from does.
	it('lands you back where you were after a trip through settings', () => {
		cy.get('.popup-container').scrollTo(0, 600);
		cy.get('.popup-container').should('have.prop', 'scrollTop', 600);
		// `force` rather than a plain click: at this offset the header has scrolled out of the popup's
		// 560px viewport, and letting Cypress scroll it back would defeat the point of the test.
		cy.get('button.popup-settings-button[aria-label="Settings"]').click({ force: true, scrollBehavior: false });
		cy.get('.settings-index-row').should('exist');
		cy.get('button.setup-header').click();

		cy.contains('.popup-section-title', 'Live Games').should('exist');
		cy.get('.popup-container').should('have.prop', 'scrollTop', 600);
	});

	it('still opens at the top on a fresh popup', () => {
		cy.get('.popup-container').should('have.prop', 'scrollTop', 0);
	});
});

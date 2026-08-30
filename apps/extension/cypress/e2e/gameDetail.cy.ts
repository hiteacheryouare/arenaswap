import { bullsHeat, liveState, makeScore, onboardedPrefs, openTabs, sixersThunder } from '../support/fixtures';

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

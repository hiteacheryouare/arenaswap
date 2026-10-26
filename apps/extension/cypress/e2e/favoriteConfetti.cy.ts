import { liveState, makeScore, onboardedPrefs, sixersThunder } from '../support/fixtures';

// Philadelphia is the home side of the close game, and the user's favorite.
const favorites = { local: { onboardingCompleted: true }, sync: { prefs: onboardedPrefs({ favoriteTeamIds: ['nba:20'] }) } };

const withScores = (home: number, away: number) => {
	const state = liveState();
	return {
		games: state.games.map(game => (game.id === sixersThunder.id
			? { ...game, homeTeam: { ...game.homeTeam, score: home }, awayTeam: { ...game.awayTeam, score: away } }
			: game)),
		scores: [makeScore(sixersThunder.id, 82), ...state.scores.filter(score => score.gameId !== sixersThunder.id)],
	};
};

const paintedPixels = (canvas: HTMLCanvasElement): number => {
	if (canvas.width === 0 || canvas.height === 0) return 0;
	const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
	let painted = 0;
	for (let alpha = 3; alpha < data.length; alpha += 4) if (data[alpha] !== 0) painted++;
	return painted;
};

const canvas = () => cy.get<HTMLCanvasElement>('canvas.popup-confetti-canvas');
const expectConfetti = () => canvas().should($canvas => expect(paintedPixels($canvas[0]!), 'painted pixels').to.be.greaterThan(0));

// A burst is decided in the render that delivers the new score, and the first thing it does is ask
// for the confetti chunk. Two frames after that render, a burst that was coming has already asked.
const expectNoConfetti = () => {
	cy.window().then(win => new Cypress.Promise<void>(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
	cy.get('@confettiChunk.all').should('have.length', 0);
	canvas().should($canvas => expect(paintedPixels($canvas[0]!), 'painted pixels').to.equal(0));
};

const favoriteScores = (home: number) => cy.pushScores(withScores(home, 106));
const openSettings = () => cy.get('button.popup-settings-button[aria-label="Settings"]').click();

describe('confetti when a favorite team scores', () => {
	beforeEach(() => {
		cy.intercept({ pathname: /confetti/ }).as('confettiChunk');
		cy.openPopup({ ...favorites, state: liveState() });
		cy.contains('.game-card', 'PHI').should('be.visible');
	});

	it('goes off when the favorite scores while the games list is open', () => {
		favoriteScores(110);

		expectConfetti();
		cy.get('@confettiChunk.all').should('have.length', 1);
	});

	it('does not celebrate a lead the favorite already had when the popup opened', () => {
		expectNoConfetti();

		favoriteScores(110);
		expectConfetti();
	});

	it('does not go off for the other team scoring', () => {
		cy.pushScores(withScores(108, 109));
		cy.contains('.game-card', '109').should('be.visible');
		expectNoConfetti();

		favoriteScores(111);
		expectConfetti();
	});

	it('stays quiet for a basket scored while settings were open, even on the way back', () => {
		openSettings();
		favoriteScores(110);
		cy.get('button.setup-header').click();
		cy.contains('.game-card', '110').should('be.visible');
		expectNoConfetti();

		favoriteScores(113);
		expectConfetti();
	});
});

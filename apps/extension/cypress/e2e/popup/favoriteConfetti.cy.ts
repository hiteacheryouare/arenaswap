import { liveState, makeScore, onboardedPrefs, sixersThunder } from '../../support/fixtures';

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

interface paintedCenter { x: number; y: number }

// The middle of the confetti on the first frame it paints. The frames are the popup's: the spec's
// own frame is hidden and never gets one.
const watchFirstPaint = () => {
	let firstPaint: Promise<paintedCenter>;
	canvas().then($canvas => {
		const element = $canvas[0]!;
		const view = element.ownerDocument.defaultView!;
		const requestAnimationFrame = view.requestAnimationFrame.bind(view);
		firstPaint = new Promise<paintedCenter>(resolve => {
			const look = () => {
				const { width, height } = element;
				const data = width && height ? element.getContext('2d')!.getImageData(0, 0, width, height).data : [];
				let sumX = 0, sumY = 0, painted = 0;
				for (let index = 3; index < data.length; index += 4) {
					if (data[index] === 0) continue;
					const pixel = (index - 3) / 4;
					sumX += pixel % width;
					sumY += Math.floor(pixel / width);
					painted++;
				}
				if (painted === 0) return requestAnimationFrame(look);
				const scale = element.getBoundingClientRect().width / width;
				resolve({ x: (sumX / painted) * scale, y: (sumY / painted) * scale });
			};
			requestAnimationFrame(look);
		});
	});
	return () => cy.then(() => firstPaint);
};

const phiCrest = () => cy.contains('.game-card', 'PHI').find('.team-column.is-home .team-crest');

// The first frame it paints, the confetti has already flown one frame's worth from where it was
// launched, so it is expected a little way off in the direction it was fired.
const oneFrameOfFlight = 60;

const scrollListTo = (scrollTop: number) => cy.get('.popup-container').then($scroller => {
	const spacer = document.createElement('div');
	spacer.style.flex = '0 0 1200px';
	$scroller[0]!.append(spacer);
	$scroller[0]!.scrollTop = scrollTop;
});

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

	it('goes off from the scoring team\'s crest, wherever the list is scrolled to', () => {
		scrollListTo(60);
		phiCrest().should($crest => {
			const crest = $crest[0]!.getBoundingClientRect();
			const headerBottom = Cypress.$('.popup-header')[0]!.getBoundingClientRect().bottom;
			expect(crest.top + crest.height / 2, 'crest middle is below the header').to.be.greaterThan(headerBottom + oneFrameOfFlight);
		});

		const firstPaint = watchFirstPaint();
		favoriteScores(110);

		firstPaint().then(center => {
			phiCrest().then($crest => {
				const crest = $crest[0]!.getBoundingClientRect();
				const crestMiddle = crest.top + crest.height / 2;
				expect(center.x, 'x').to.be.closeTo(crest.left + crest.width / 2, 24);
				expect(center.y, 'y').to.be.within(crestMiddle - oneFrameOfFlight, crestMiddle);
			});
		});
	});

	it('goes off from the top edge of the list when the team is scrolled up out of view', () => {
		scrollListTo(1000);
		phiCrest().should($crest => {
			const headerBottom = Cypress.$('.popup-header')[0]!.getBoundingClientRect().bottom;
			expect($crest[0]!.getBoundingClientRect().bottom, 'crest is above the header').to.be.lessThan(headerBottom);
		});

		const firstPaint = watchFirstPaint();
		favoriteScores(110);

		firstPaint().then(center => {
			phiCrest().then($crest => {
				const crest = $crest[0]!.getBoundingClientRect();
				const headerBottom = Cypress.$('.popup-header')[0]!.getBoundingClientRect().bottom;
				expect(center.x, 'x').to.be.closeTo(crest.left + crest.width / 2, 24);
				expect(center.y, 'y').to.be.within(headerBottom, headerBottom + oneFrameOfFlight);
			});
		});
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

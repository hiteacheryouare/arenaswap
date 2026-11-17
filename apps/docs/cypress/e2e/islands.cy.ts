const espnScoreboard = 'https://site.api.espn.com/apis/site/v2/sports/**/scoreboard*';
const mlbScoreboard = 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard*';

// The board sweeps all 31 leagues and reads each answer through that league’s own config, so a
// catch-all stub puts the same two games on the page 31 times over. Everything but MLB answers
// empty; Cypress prefers the intercept registered last, so the specific one goes second.
const stubMlbOnly = (fixture: string) => {
	cy.intercept('GET', espnScoreboard, { body: { events: [] } });
	cy.intercept('GET', mlbScoreboard, { fixture }).as('scoreboard');
};

describe('the hero runs the extension', () => {
	it('draws three live game cards inside the browser frame', () => {
		cy.visit('/');

		cy.get('.browser-popup .game-card').should('have.length', 3);
		cy.get('.browser-popup .game-card').first().should('be.visible');

		cy.get('.browser-popup .game-card').each($card => {
			expect($card.text(), 'card rendered a score').to.match(/\d/);
		});

		cy.get('.browser-caption').should('not.be.empty');
	});

	it('switches the tab on its own, the way the extension would', () => {
		cy.visit('/');
		cy.get('.browser-popup .game-card').should('have.length', 3);

		cy.get('.browser-caption').invoke('text').then(opening => {
			cy.get('.browser-caption', { timeout: 20000 })
				.should($caption => {
					expect($caption.text(), 'the caption announced a switch').to.not.equal(opening);
				});
		});
	});

	it('speaks the language of the page it is on', () => {
		cy.visit('/');
		cy.get('.browser-popup .popup-section-title').first().invoke('text').then(english => {
			expect(english.trim(), 'the English popup has a section title').to.have.length.greaterThan(0);

			cy.visit('/de/');
			cy.get('.browser-popup .popup-section-title').first().invoke('text').then(german => {
				expect(german.trim(), 'the German page did not fall back to English').to.not.equal(english);
			});
		});
	});
});

describe('the PowerScore charts', () => {
	it('draw once the band comes into view', () => {
		cy.visit('/');
		cy.get('#powerscore').scrollIntoView();

		cy.get('#powerscore .chart-tile').should('have.length', 4);
		cy.get('#powerscore .game-detail-chart-canvas canvas').should('have.length', 4);

		cy.get('#powerscore .game-detail-chart-canvas canvas').each($canvas => {
			const canvas = $canvas[0] as HTMLCanvasElement;
			expect(canvas.width, 'ECharts sized the canvas').to.be.greaterThan(0);
			expect(canvas.height, 'ECharts sized the canvas').to.be.greaterThan(0);
		});

		cy.get('#powerscore .chart-tile-title').each($title => {
			expect($title.text().trim(), 'chart title came from the string map').to.have.length.greaterThan(0);
		});
	});
});

describe('the live PowerScore board', () => {
	it('ranks the live games it was given, highest first', () => {
		stubMlbOnly('espnMlbLive.json');
		cy.visit('/powerscore/');
		cy.get('#live-scores').scrollIntoView();
		cy.wait('@scoreboard');

		cy.get('#live-scores .ps-score-bar-fill').should('have.length.at.least', 1);

		cy.get('#live-scores .ps-live-row').then($cards => {
			const scores = [...$cards].map(card => {
				const width = (card.querySelector('.ps-score-bar-fill') as HTMLElement | null)?.style.width ?? '';
				return Number.parseFloat(width);
			});
			expect(scores.length, 'a card per live game').to.be.greaterThan(0);
			const sorted = scores.toSorted((a, b) => b - a);
			expect(scores, 'cards are ordered by PowerScore').to.deep.equal(sorted);
		});

		cy.get('#live-scores').should('contain.text', 'TOR').and('contain.text', 'BAL');
	});

	it('says nothing is live rather than showing an empty panel', () => {
		stubMlbOnly('espnMlbScheduled.json');
		cy.visit('/powerscore/');
		cy.get('#live-scores').scrollIntoView();
		cy.wait('@scoreboard');

		cy.get('#live-scores .feature-card').should('have.length', 1);
		cy.get('#live-scores .ps-live-row').should('not.exist');
		cy.get('#live-scores .alert').should('not.exist');
		cy.get('#live-scores .feature-card').invoke('text').should('not.be.empty');
	});

	it('tells you it could not reach ESPN when every league is shed', () => {
		cy.intercept('GET', espnScoreboard, { statusCode: 403, body: {} }).as('shed');
		cy.visit('/powerscore/');
		cy.get('#live-scores').scrollIntoView();
		cy.wait('@shed');

		cy.get('#live-scores .alert').should('be.visible').and('not.be.empty');
		cy.get('#live-scores .ps-score-bar-fill').should('not.exist');
	});

	it('sweeps all leagues once and then polls only the live ones', () => {
		const asked: string[] = [];
		cy.intercept('GET', espnScoreboard, req => {
			asked.push(new URL(req.url).pathname);
			req.reply({ fixture: 'espnMlbLive.json' });
		}).as('scoreboard');

		cy.visit('/powerscore/');
		cy.get('#live-scores').scrollIntoView();
		cy.get('#live-scores .ps-score-bar-fill').should('have.length.at.least', 1);

		cy.then(() => {
			const sweep = asked.length;
			expect(sweep, 'the opening sweep covers every league once').to.be.greaterThan(1);
			expect(new Set(asked).size, 'no league asked twice in one sweep').to.equal(sweep);
		});

		cy.then(() => {
			const before = asked.length;
			cy.scrollTo('top');
			cy.get('#live-scores').scrollIntoView();
			cy.wait(1500);
			cy.then(() => {
				expect(asked.length, 'returning to the section did not re-poll inside the floor').to.equal(before);
			});
		});
	});
});

describe('the package install commands', () => {
	it('shows the command for the package manager you picked', () => {
		cy.intercept('GET', espnScoreboard, { body: { events: [] } });
		cy.visit('/powerscore/');
		cy.get('#developers').scrollIntoView();

		cy.contains('code', 'npm install powerscore').should('be.visible');

		cy.contains('button', 'pnpm').click();
		cy.contains('code', 'pnpm add powerscore').should('be.visible');
		cy.contains('code', 'npm install powerscore').should('not.exist');

		cy.contains('button', 'bun').click();
		cy.contains('code', 'bun add powerscore').should('be.visible');
	});

	it('copies the command that is on screen', () => {
		cy.intercept('GET', espnScoreboard, { body: { events: [] } });
		cy.visit('/powerscore/', {
			onBeforeLoad: win => {
				cy.stub(win.navigator.clipboard, 'writeText').as('writeText').resolves();
			},
		});

		cy.get('#developers').scrollIntoView();
		cy.contains('button', 'yarn').click();
		cy.contains('code', 'yarn add powerscore').should('be.visible');
		cy.contains('code', 'yarn add powerscore').parent().find('button').click();
		cy.get('@writeText').should('have.been.calledWith', 'yarn add powerscore');
	});
});

describe('the 404 page', () => {
	it('renders the joke card out of the shared component', () => {
		cy.visit('/404.html');
		cy.get('.notfound-card .game-card').should('be.visible');
		cy.get('.notfound-card').should('contain.text', '404').and('contain.text', 'YOU');
	});

	it('reports the URL that was actually requested', () => {
		cy.visit('/no-such-page/', { failOnStatusCode: false });
		cy.get('#notfound-path').should('have.text', '/arenaswap/no-such-page/');
	});
});

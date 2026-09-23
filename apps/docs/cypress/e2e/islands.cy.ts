// The demos on this site are not pictures of the extension. They import the extension's own
// components out of @arenaswap/ui and the real scorer out of `powerscore`, which is the point and
// also the risk: a rename in either package takes a section of the marketing site down, the build
// stays green because Astro only has to render the island's first frame, and the only symptom is a
// blank rectangle nobody is watching for.
//
// Nothing here re-checks the scoring. `validateHeroTimeline` proves the hero's ranking and
// `gameDetailChartOptions` is tested where it lives. What a browser can answer is whether these
// things are on the page at all, whether they speak the visitor's language, and whether the one
// that talks to ESPN survives what ESPN does.

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

		// One card per game in the hero script, each one the shipped GameCard rather than markup
		// copied into this repo.
		cy.get('.browser-popup .game-card').should('have.length', 3);
		cy.get('.browser-popup .game-card').first().should('be.visible');

		// A card with no score in it is a card whose props stopped matching what GameCard reads.
		cy.get('.browser-popup .game-card').each($card => {
			expect($card.text(), 'card rendered a score').to.match(/\d/);
		});

		cy.get('.browser-caption').should('not.be.empty');
	});

	// The first switch in the timeline lands on tick 7, which at 1150ms a tick is just over eight
	// seconds in. Waiting on the caption rather than on a duration: the timeline is deterministic,
	// so the only question is whether the page is driving it.
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

	// The popup chrome comes from @arenaswap/ui and is handed the site's `ui` string map. When a key
	// goes missing the island renders the key itself rather than throwing, so the failure mode is a
	// German page with `main.sectionActiveLiveTabs` where a heading should be.
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
	// client:visible, so they are not in the DOM until the band scrolls up. Four ECharts canvases
	// built by the extension's own option builders.
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
	// The payloads are a real ESPN MLB scoreboard, captured 2026-09-21 and trimmed to the fields
	// LivePowerScores reads. Two games were genuinely in progress at the time.
	//
	// Every one of these stubs the network. The page polls 31 leagues on its first sweep, and a
	// spec that let those through would measure ESPN's evening rather than this code.
	it('ranks the live games it was given, highest first', () => {
		stubMlbOnly('espnMlbLive.json');
		cy.visit('/powerscore/');
		cy.get('#live-scores').scrollIntoView();
		cy.wait('@scoreboard');

		cy.get('#live-scores .ps-score-bar-fill').should('have.length.at.least', 1);

		cy.get('#live-scores .feature-card').then($cards => {
			const scores = [...$cards].map(card => {
				const width = (card.querySelector('.ps-score-bar-fill') as HTMLElement | null)?.style.width ?? '';
				return Number.parseFloat(width);
			});
			expect(scores.length, 'a card per live game').to.be.greaterThan(0);
			const sorted = scores.toSorted((a, b) => b - a);
			expect(scores, 'cards are ordered by PowerScore').to.deep.equal(sorted);
		});

		// The abbreviations come straight off the payload, so this is the parse working end to end.
		cy.get('#live-scores').should('contain.text', 'TOR').and('contain.text', 'BAL');
	});

	// A scoreboard with nothing in progress is the common case — most hours of most days — and it
	// has to read as "nothing is on", not as an error and not as an empty page.
	it('says nothing is live rather than showing an empty panel', () => {
		stubMlbOnly('espnMlbScheduled.json');
		cy.visit('/powerscore/');
		cy.get('#live-scores').scrollIntoView();
		cy.wait('@scoreboard');

		cy.get('#live-scores .feature-card').should('have.length', 1);
		cy.get('#live-scores .ps-score-bar-fill').should('not.exist');
		cy.get('#live-scores .alert').should('not.exist');
		cy.get('#live-scores .feature-card').invoke('text').should('not.be.empty');
	});

	// ESPN sheds by IP volume and answers 403. A quiet Tuesday and a shed request used to draw the
	// same panel; they must not, because one of them is this page's fault and the other is not.
	it('tells you it could not reach ESPN when every league is shed', () => {
		cy.intercept('GET', espnScoreboard, { statusCode: 403, body: {} }).as('shed');
		cy.visit('/powerscore/');
		cy.get('#live-scores').scrollIntoView();
		cy.wait('@shed');

		cy.get('#live-scores .alert').should('be.visible').and('not.be.empty');
		cy.get('#live-scores .ps-score-bar-fill').should('not.exist');
	});

	// The whole request budget in this component exists because the page once asked 31 leagues
	// every 15 seconds for as long as a tab stayed open. The first sweep is 31; a narrow poll after
	// it is only the leagues that had something live. Nothing else guards that.
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

		// Scrolling away and back asks for a fresh draw, which the five second floor must refuse.
		cy.then(() => {
			const before = asked.length;
			cy.scrollTo('top');
			cy.get('#live-scores').scrollIntoView();
			// Proving an absence needs a window rather than a condition to wait on. 1500ms sits
			// inside the five second floor and well past the time a request would take to appear.
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
		cy.contains('h2', /./).should('exist');
		cy.get('.btn-cta').contains('npm').scrollIntoView();

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
				// The real clipboard needs a permission prompt in a headless run, and what matters is
				// the text the button hands over rather than where the browser puts it.
				cy.stub(win.navigator.clipboard, 'writeText').as('writeText').resolves();
			},
		});

		cy.get('.btn-cta').contains('npm').scrollIntoView();
		cy.contains('button', 'yarn').click();
		cy.contains('code', 'yarn add powerscore').should('be.visible');
		cy.contains('code', 'yarn add powerscore').parent().find('button').click();
		cy.get('@writeText').should('have.been.calledWith', 'yarn add powerscore');
	});
});

describe('the 404 page', () => {
	// The card is the shipped LiveGameCard from @arenaswap/ui, rendered at build time with no client
	// directive. If that component's props change, this page loses its centrepiece and the build
	// does not notice.
	it('renders the joke card out of the shared component', () => {
		cy.visit('/404.html');
		cy.get('.notfound-card .game-card').should('be.visible');
		cy.get('.notfound-card').should('contain.text', '404').and('contain.text', 'YOU');
	});

	// GitHub Pages answers every unknown URL under the base with this one file, so the address bar
	// is the only record of what was actually asked for.
	it('reports the URL that was actually requested', () => {
		cy.visit('/no-such-page/', { failOnStatusCode: false });
		cy.get('#notfound-path').should('have.text', '/arenaswap/no-such-page/');
	});
});

// The PowerScore page's demo games are scored by the real engine at build time. These read the
// built page back, so a change to `powerscore` that flips the story the page tells fails here
// rather than shipping a page that says the blowout is the better watch in Classic.

const everyScoreboard = 'https://site.api.espn.com/apis/site/v2/sports/**/scoreboard*';

const visit = (path = '/powerscore/') => {
	cy.intercept('GET', everyScoreboard, { body: { events: [] } });
	cy.visit(path);
};

const totalOf = ($element: JQuery<HTMLElement>) => Number($element.text().trim());

const bestIndex = ($mode: JQuery<HTMLElement>) => [...$mode.find('li')].findIndex(item => item.classList.contains('is-best'));

describe('the PowerScore page', () => {
	it('scores the close game above the blowout, and adds the signals up to it', () => {
		visit();

		cy.get('.ps-game .ps-number-xl').then($totals => {
			const [close, blowout] = [...$totals].map(total => Number(total.textContent));
			expect(close, 'the close game outscores the blowout').to.be.greaterThan(blowout);
			cy.get('.ps-io .ps-number-xl').invoke('text').then(text => expect(Number(text), 'the explainer shows the same game').to.equal(close));
			cy.get('.ps-compare-total .ps-compare-points').then($points => {
				expect([...$points].map(point => Number(point.textContent))).to.deep.equal([close, blowout]);
			});
		});
	});

	it('flips the order in Blowouts mode and keeps it in the other two', () => {
		visit();

		cy.get('.ps-mode').should('have.length', 3).then($modes => {
			expect([...$modes].map(mode => bestIndex(Cypress.$(mode)))).to.deep.equal([0, 1, 0]);
		});
		cy.get('.ps-mode').eq(1).find('.ps-number').then($numbers => {
			expect(totalOf($numbers.eq(1))).to.be.greaterThan(totalOf($numbers.eq(0)));
		});
	});

	it('writes the demo reason in the reader\'s language', () => {
		visit('/powerscore/');
		cy.get('.ps-io-reason').invoke('text').then(english => {
			visit('/ja/powerscore/');
			cy.get('.ps-io-reason').invoke('text').should(japanese => {
				expect(japanese.trim()).to.not.equal(english.trim());
				expect(japanese.trim().endsWith('。'), 'ends on the Japanese full stop').to.equal(true);
			});
		});
	});
});

// The header mark folds into the favicon on the way down the page and unfolds on the way back up.
// `wordmarkFrame.test.ts` already proves the choreography across 601 samples of its own progress
// value, so nothing here re-checks the geometry. What a browser can answer and that test cannot is
// whether the site's header is wired to it at all, and whether the mark lands at a sane size in a
// 64px bar it shares with the links.

const restBox = '0 0 1790 471';
const collapsedBox = '-36 -36 503.76 426.61';

const mark = () => cy.get('.nav-logo svg');

describe('the site header collapses its mark', () => {
	beforeEach(() => {
		cy.visit('/');
		mark().should('have.attr', 'viewBox', restBox);
	});

	it('starts whole and lands on the favicon', () => {
		mark().invoke('outerWidth').should('be.closeTo', 106, 3);

		cy.scrollTo(0, 400);
		cy.get('#site-header').should('have.class', 'is-condensed');
		mark().should('have.attr', 'viewBox', collapsedBox);
		// The box is taller relative to its width than the wordmark by a factor of four, so this
		// number moving at all means the mark did not end where the favicon is.
		mark().invoke('outerWidth').should('be.closeTo', 29.5, 2);
	});

	it('plays back in reverse', () => {
		cy.scrollTo(0, 400);
		mark().should('have.attr', 'viewBox', collapsedBox);

		cy.scrollTo(0, 0);
		cy.get('#site-header').should('not.have.class', 'is-condensed');
		mark().should('have.attr', 'viewBox', restBox);
		mark().invoke('outerWidth').should('be.closeTo', 106, 3);
	});

	// The whole point of the animation, and the one thing a still of either end cannot show.
	it('keeps the a and the s on screen part-way through', () => {
		cy.scrollTo(0, 400);
		cy.wait(200);
		cy.get('.nav-logo svg').then($svg => {
			const frame = $svg[0].getBoundingClientRect();
			(['a', 's'] as const).forEach(letter => {
				const box = $svg.find(`[data-wm="${letter}"]`)[0].getBoundingClientRect();
				expect(box.width, `${letter} has width mid-collapse`).to.be.greaterThan(0);
				expect(box.left, `${letter} has not left the frame`).to.be.greaterThan(frame.left - 1);
				expect(box.right, `${letter} has not left the frame`).to.be.lessThan(frame.right + 1);
			});
		});
		mark().should('have.attr', 'viewBox', collapsedBox);
	});

	it('leaves the links room at the tightest desktop width', () => {
		cy.viewport(992, 900);
		cy.scrollTo(0, 400);
		mark().should('have.attr', 'viewBox', collapsedBox);
		cy.get('.nav-row').then($row => {
			const logo = $row.find('.nav-logo')[0].getBoundingClientRect();
			const links = $row.find('.nav-desktop-links')[0].getBoundingClientRect();
			expect(logo.right, 'collapsed mark clear of the links').to.be.lessThan(links.left + 1);
		});
	});
});

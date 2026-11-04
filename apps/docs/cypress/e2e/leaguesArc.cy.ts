import { pressEscape } from '../keyboard';

// The full league list is Bootstrap's Dialog on a modal <dialog>.
const openFully = () => {
	cy.get('#leagues-dialog').then(([dialog]) => {
		dialog.addEventListener('shown.bs.dialog', () => dialog.setAttribute('data-test-shown', ''), { once: true });
	});
	cy.get('[data-bs-target="#leagues-dialog"]').click();
	cy.get('#leagues-dialog').should('have.attr', 'data-test-shown');
};

const ringCrests = (ring: number) => `.league-ring[data-ring="${ring}"] .league-crest`;

const area = (element: HTMLElement) => element.offsetWidth * element.offsetHeight;

describe('the league arc', () => {
	beforeEach(() => {
		cy.visit('/');
		cy.get('#leagues').scrollIntoView();
	});

	it('names each logo once and hides its second lap from screen readers', () => {
		cy.get('.league-crest:not([aria-hidden])').should('have.length', 19).each(crest => {
			crest.find('img').each((_, image) => {
				expect(image.getAttribute('alt')).to.not.equal('');
			});
		});
		cy.get('.league-crest[aria-hidden="true"]').should('have.length', 19).find('img').each(image => {
			expect(image.attr('alt')).to.equal('');
		});
		cy.get('.league-crest:not([aria-hidden]) img[alt*="NCAA Softball"]').first().should('have.attr', 'alt').and('include', 'NCAA Football');
	});

	it('loads every logo somewhere on the arc', () => {
		cy.viewport(1440, 900);
		cy.get('html').invoke('attr', 'data-bs-theme', 'dark');
		cy.get('.league-orbit').scrollIntoView();
		cy.get('.league-crest:not([aria-hidden]) img:not(.for-light)').each(image => {
			const source = image.attr('src');
			cy.get(`.league-crest img[src="${source}"]`).should(copies => {
				expect(copies.toArray().some(copy => (copy as HTMLImageElement).naturalWidth > 0), source).to.equal(true);
			});
		});
	});

	it('rings the NFL, NBA, MLB and NHL innermost, biggest', () => {
		cy.get(`${ringCrests(1)}:not([aria-hidden]) img`).then(images => {
			expect(images.toArray().map(image => image.getAttribute('alt'))).to.deep.equal(['NFL', 'NBA', 'MLB', 'NHL']);
		});
		cy.get('.league-crest').then(crests => {
			const inner = crests.filter(ringCrests(1)).toArray().map(area);
			const outer = crests.filter(ringCrests(3)).toArray().map(area);
			expect(Math.min(...inner)).to.be.greaterThan(Math.max(...outer) * 3);
		});
	});

	it('turns each ring the other way from the one inside it', () => {
		cy.get('.league-ring').should(rings => {
			const styles = rings.toArray().map(ring => getComputedStyle(ring));
			expect(styles.map(style => style.animationName)).to.deep.equal(['league-ring-turn', 'league-ring-turn', 'league-ring-turn']);
			expect(styles.map(style => style.animationDirection)).to.deep.equal(['normal', 'reverse', 'normal']);
			expect(styles.map(style => style.animationPlayState)).to.deep.equal(['running', 'running', 'running']);
		});
	});

	[1440, 390].forEach(width => {
		it(`fits the page at ${width}px`, () => {
			cy.viewport(width, 900);
			cy.document().its('documentElement.scrollWidth').should('be.at.most', width);
		});
	});

	it('swaps to the light artwork in light mode', () => {
		cy.get('html').invoke('attr', 'data-bs-theme', 'dark');
		cy.get('.league-crest img[src*="ucl-dark"]').first().should('not.have.css', 'display', 'none');
		cy.get('html').invoke('attr', 'data-bs-theme', 'light');
		cy.get('.league-crest img[src*="ucl-dark"]').first().should('have.css', 'display', 'none');
		cy.get('.league-crest img[src*="ucl."]').first().should('not.have.css', 'display', 'none');
	});

	it('opens every league in a modal dialog, as many as the button says', () => {
		cy.get('[data-bs-target="#leagues-dialog"]').invoke('text').then(label => {
			const count = Number(label.match(/\d+/)![0]);
			cy.get('[data-bs-target="#leagues-dialog"]').click();
			cy.get('#leagues-dialog').should(([dialog]) => expect(dialog.matches(':modal')).to.equal(true));
			cy.get('#leagues-dialog .leagues-group li').should('have.length', count);
			cy.get('#leagues-dialog-title').should('contain.text', String(count));
		});
	});

	it('closes on Escape and hands focus back to the button', () => {
		openFully();
		cy.window().then(win => win.focus());
		cy.get('#leagues-dialog .btn-close').focus();
		pressEscape();
		cy.get('#leagues-dialog').should('not.have.attr', 'open');
		cy.get('[data-bs-target="#leagues-dialog"]').should('have.focus');
	});

	it('closes from its X', () => {
		openFully();
		cy.get('#leagues-dialog .btn-close').click();
		cy.get('#leagues-dialog').should('not.have.attr', 'open');
	});
});

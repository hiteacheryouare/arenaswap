import UpcomingDayPager from '../../entrypoints/popup/components/upcomingDayPager';

const mountPager = (index: number, total: number, dayLabel = 'Tuesday, Sep 2') => {
	cy.viewport(320, 560);
	const onSelect = cy.stub().as('select');
	cy.mount(
		<div className='popup-container'>
			<UpcomingDayPager dayLabel={dayLabel} index={index} total={total} onSelect={onSelect} />
		</div>,
	);
};

// The arrows are quiet buttons on the page. Bootstrap's light defaults (#e9ecef, #f8f9fa) have
// turned up as slabs on this dark popup before, so no state of an arrow may paint one.
const alphaOf = (color: string) => (color.startsWith('rgba') ? Number(color.split(',')[3]!.replace(')', '')) : 1);

describe('upcomingDayPager', () => {
	it('names the day it is showing', () => {
		mountPager(0, 5);
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Tuesday, Sep 2');
	});

	it('disables the previous arrow on the first day', () => {
		mountPager(0, 5);
		cy.get('[data-testid="upcoming-day-previous"]').should('be.disabled');
		cy.get('[data-testid="upcoming-day-next"]').should('not.be.disabled');
	});

	it('disables the next arrow on the last day', () => {
		mountPager(4, 5);
		cy.get('[data-testid="upcoming-day-next"]').should('be.disabled');
		cy.get('[data-testid="upcoming-day-previous"]').should('not.be.disabled');
	});

	it('disables both arrows on a one-day slate but still heads the day', () => {
		mountPager(0, 1, 'Today');
		cy.get('[data-testid="upcoming-day-previous"]').should('be.disabled');
		cy.get('[data-testid="upcoming-day-next"]').should('be.disabled');
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Today');
	});

	it('reports the neighbouring index to onSelect', () => {
		mountPager(2, 5);
		cy.get('[data-testid="upcoming-day-next"]').click();
		cy.get('@select').should('have.been.calledWith', 3);
		cy.get('[data-testid="upcoming-day-previous"]').click();
		cy.get('@select').should('have.been.calledWith', 1);
	});

	// The day name comes from toLocaleDateString rather than our locale files, so its length is not
	// something a string audit can bound. German dates are the longest of the twelve we ship.
	it('holds the longest plausible day label inside the popup width', () => {
		mountPager(1, 7, 'Mittwoch, 10. Sept.');
		cy.get('[data-testid="upcoming-day-pager"]').then(([nav]: JQuery<HTMLElement>) => {
			expect(nav.scrollWidth).to.be.at.most(nav.clientWidth);
		});
		cy.get('[data-testid="upcoming-day-label"]').then(([label]: JQuery<HTMLElement>) => {
			expect(label.scrollWidth).to.be.at.most(label.clientWidth);
		});
	});


	it('keeps a disabled arrow transparent on the page', () => {
		mountPager(0, 5);
		cy.get('[data-testid="upcoming-day-previous"]').should(([arrow]: JQuery<HTMLElement>) => {
			expect(alphaOf(getComputedStyle(arrow).backgroundColor)).to.equal(0);
		});
	});

	it('tints a focused arrow with the hover wash, never a light slab', () => {
		mountPager(2, 5);
		cy.get('[data-testid="upcoming-day-next"]').focus();
		cy.get('[data-testid="upcoming-day-next"]').should(([arrow]: JQuery<HTMLElement>) => {
			expect(alphaOf(getComputedStyle(arrow).backgroundColor)).to.be.lessThan(0.2);
		});
	});

	it('sets the day in the ink', () => {
		mountPager(0, 3);
		cy.get('[data-testid="upcoming-day-label"]').should(([label]: JQuery<HTMLElement>) => {
			const ink = getComputedStyle(document.documentElement).getPropertyValue('--as-ink').trim();
			const [red, green, blue] = [1, 3, 5].map(index => Number.parseInt(ink.slice(index, index + 2), 16));
			expect(getComputedStyle(label).color).to.equal(`rgb(${red}, ${green}, ${blue})`);
		});
	});
});

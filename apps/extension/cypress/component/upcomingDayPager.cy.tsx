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

	// Pagination is the first component in the popup to reach for --as-secondary-bg, which this theme
	// never overrode and which is therefore still Bootstrap's light default. Unfixed, an arrow at the
	// end of the range is an #e9ecef slab on a #0d1117 popup.
	it('keeps a disabled arrow on the popup background rather than a light default', () => {
		mountPager(0, 5);
		cy.get('[data-testid="upcoming-day-previous"]').should('have.css', 'background-color', 'rgb(13, 17, 23)');
	});

	// Same gap, via --as-tertiary-bg: a focused arrow used to flash #f8f9fa.
	it('keeps a focused arrow dark', () => {
		mountPager(2, 5);
		cy.get('[data-testid="upcoming-day-next"]').click();
		cy.get('[data-testid="upcoming-day-next"]').should('have.css', 'background-color', 'rgb(22, 27, 34)');
	});

	// The active page is $primary, and Bootstrap's default active colour is a flat white that only
	// reaches 3.22:1 on it. The override lives in bootstrap.scss and is easy to lose in a refactor.
	it('sets the active day label dark enough to read on the primary fill', () => {
		mountPager(0, 3);
		cy.get('[data-testid="upcoming-day-label"]').should('have.css', 'color', 'rgb(13, 17, 23)');
	});
});

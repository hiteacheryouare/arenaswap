import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import useRestoredScroll from '../../entrypoints/popup/useRestoredScroll';

const rowHeight = 50;
const viewportHeight = 200;

const Scroller = ({ offsetRef, rows }: { offsetRef: RefObject<number>; rows: number }) => {
	const scrollerRef = useRestoredScroll(offsetRef);
	return (
		<div ref={scrollerRef} data-testid='scroller' style={{ height: `${viewportHeight}px`, overflowY: 'auto' }}>
			{Array.from({ length: rows }, (_, index) => (
				<div key={index} style={{ height: `${rowHeight}px` }}>{`row ${index}`}</div>
			))}
		</div>
	);
};

// Mirrors what `app.tsx` does to a view: the scroller is unmounted outright on the way out and a
// fresh one is mounted on the way back, so nothing about the old element survives the trip.
const Navigator = ({ rows, rowsOnReturn = rows }: { rows: number; rowsOnReturn?: number }) => {
	const offsetRef = useRef(0);
	const [visits, setVisits] = useState(1);
	const [away, setAway] = useState(false);
	return (
		<>
			<button type='button' data-testid='leave' onClick={() => { setAway(true); setVisits(visits + 1); }}>Leave</button>
			<button type='button' data-testid='return' onClick={() => setAway(false)}>Return</button>
			{!away && <Scroller offsetRef={offsetRef} rows={visits === 1 ? rows : rowsOnReturn} />}
		</>
	);
};

describe('useRestoredScroll', () => {
	it('opens at the top the first time the view is mounted', () => {
		cy.mount(<Navigator rows={20} />);
		cy.get('[data-testid="scroller"]').should('have.prop', 'scrollTop', 0);
	});

	it('returns a remounted view to the offset it was left at', () => {
		cy.mount(<Navigator rows={20} />);
		cy.get('[data-testid="scroller"]').scrollTo(0, 420);
		cy.get('[data-testid="scroller"]').should('have.prop', 'scrollTop', 420);

		cy.get('[data-testid="leave"]').click();
		cy.get('[data-testid="scroller"]').should('not.exist');
		cy.get('[data-testid="return"]').click();

		cy.get('[data-testid="scroller"]').should('have.prop', 'scrollTop', 420);
	});

	// The extension polls while you are away, so the list you come back to can be shorter than the
	// one you left. Assigning past the maximum clamps, which puts you at the bottom rather than
	// throwing, and the clamped value is what gets recorded.
	it('clamps to the bottom when the list has shrunk while away', () => {
		cy.mount(<Navigator rows={20} rowsOnReturn={6} />);
		cy.get('[data-testid="scroller"]').scrollTo(0, 800);
		cy.get('[data-testid="leave"]').click();
		cy.get('[data-testid="return"]').click();

		cy.get('[data-testid="scroller"]').should('have.prop', 'scrollTop', 6 * rowHeight - viewportHeight);
	});

	// A saved offset the list can no longer reach must not survive as a saved offset, or a later
	// visit would jump to a place the user never scrolled to.
	it('forgets an offset the shorter list could not reach', () => {
		cy.mount(<Navigator rows={20} rowsOnReturn={6} />);
		cy.get('[data-testid="scroller"]').scrollTo(0, 800);
		cy.get('[data-testid="leave"]').click();
		cy.get('[data-testid="return"]').click();
		cy.get('[data-testid="scroller"]').should('have.prop', 'scrollTop', 100);

		cy.get('[data-testid="leave"]').click();
		cy.get('[data-testid="return"]').click();
		cy.get('[data-testid="scroller"]').should('have.prop', 'scrollTop', 100);
	});

	it('records an offset scrolled to after the view was already restored once', () => {
		cy.mount(<Navigator rows={20} />);
		cy.get('[data-testid="scroller"]').scrollTo(0, 300);
		cy.get('[data-testid="leave"]').click();
		cy.get('[data-testid="return"]').click();
		cy.get('[data-testid="scroller"]').scrollTo(0, 650);

		cy.get('[data-testid="leave"]').click();
		cy.get('[data-testid="return"]').click();
		cy.get('[data-testid="scroller"]').should('have.prop', 'scrollTop', 650);
	});
});

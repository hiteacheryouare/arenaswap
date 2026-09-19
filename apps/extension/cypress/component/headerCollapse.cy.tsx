import { useEffect, useRef } from 'react';
import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';

// The header condenses against the list it sits on, so the list has to be real: a scroller with
// enough in it to scroll, at the popup's own 320x560. Mounting the header on its own would leave
// it with nothing to listen to.
const Harness = ({ startAt = 0 }: { startAt?: number }) => {
	const scroller = useRef<HTMLDivElement>(null);
	// A layout effect rather than work inside the ref callback. An inline callback ref is a new
	// function on every render, so React detaches and reattaches it each time — and a reattach that
	// reassigns `scrollTop` silently scrolls the list back to the top partway through a spec.
	useEffect(() => {
		if (scroller.current) scroller.current.scrollTop = startAt;
	}, [startAt]);
	return (
		<div className='popup-container' ref={scroller}>
			<PopupHeader scroller={scroller} enabled onToggleEnabled={cy.stub()} onOpenSettings={cy.stub()} onStartTour={cy.stub()} />
			<div style={{ height: '2000px' }} />
		</div>
	);
};

const mountList = (startAt = 0) => {
	cy.viewport(320, 560);
	cy.mount(<Harness startAt={startAt} />);
};

const scrollTo = (top: number) => cy.get('.popup-container').then(([node]: JQuery<HTMLElement>) => { node.scrollTop = top; node.dispatchEvent(new Event('scroll')); });

// The viewBox is the collapse: everything else follows from it. Asserted inside `should` rather
// than read out through `then`, because only `should` retries — and every one of these is being
// read in the middle of a 450ms animation.
const markShouldBe = (width: number) => cy.get('.arenaswap-logo').should(([mark]: JQuery<HTMLElement>) => {
	expect(parseFloat(String(mark.getAttribute('viewBox')).split(' ')[2])).to.be.closeTo(width, 0.5);
});

const expandedWidth = 1790;
const collapsedWidth = 501.52;

describe('the popup header', () => {
	it('stays at the top of the list rather than scrolling off it', () => {
		mountList();
		scrollTo(400);
		cy.get('.popup-header').should(([header]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(header).position).to.equal('sticky');
			const list = header.parentElement as HTMLElement;
			// Flush with the top of the scrollport, not 400px above it.
			expect(header.getBoundingClientRect().top).to.be.closeTo(list.getBoundingClientRect().top, 1);
		});
	});

	it('draws the whole wordmark while the list is at the top', () => {
		mountList();
		markShouldBe(expandedWidth);
	});

	// Through a retrying assertion rather than a `then`: this is a 450ms animation, so the frame
	// straight after the scroll is still most of the way expanded.
	it('collapses the wordmark into the favicon once the list moves', () => {
		mountList();
		scrollTo(200);
		markShouldBe(collapsedWidth);
	});

	it('plays it back out on the way up', () => {
		mountList();
		scrollTo(200);
		markShouldBe(collapsedWidth);
		scrollTo(0);
		markShouldBe(expandedWidth);
	});

	// Two thresholds rather than one, because a list resting on a single one flutters. 30 is past
	// the lower and short of the upper.
	//
	// This is also the guard on something subtler: condensing takes ~19px out of the bar, and
	// Chrome's scroll anchoring hands those 19px straight back to `scrollTop`. Scrolling to 30
	// mid-transition used to land at 11, drop under the lower threshold, and reopen the header —
	// which grew the bar, moved the scroll back, and collapsed it again.
	it('holds the collapse through a scroll back to just above the threshold', () => {
		mountList();
		scrollTo(200);
		cy.get('.popup-header').should('have.class', 'is-condensed');
		scrollTo(30);
		cy.wait(600);
		cy.get('.popup-header').should('have.class', 'is-condensed');
		scrollTo(8);
		cy.get('.popup-header').should('not.have.class', 'is-condensed');
	});

	it('opens already condensed when the list was left partway down', () => {
		mountList(300);
		// No animation to wait out — this is the pose the header mounted in.
		markShouldBe(collapsedWidth);
		cy.get('.popup-header').should('have.class', 'is-condensed');
	});

	// The bar gives height back as well as width — the mark drops to 26px and the padding closes
	// with it, which is most of the point of condensing a header in a 560px panel.
	it('gets shorter, not just narrower', () => {
		mountList();
		cy.get('.popup-header').invoke('outerHeight').then(before => {
			scrollTo(200);
			cy.get('.arenaswap-logo').should(([mark]: JQuery<HTMLElement>) => {
				expect(mark.getBoundingClientRect().height).to.be.closeTo(26, 0.5);
			});
			cy.get('.popup-header').invoke('outerHeight').should('be.lessThan', (before as number) - 12);
		});
	});

	// Solid rather than tinted. Cards pass directly under this at 320px wide, and anything the eye
	// can see through reads as a smudge over them rather than as a surface they go behind.
	it('covers the cards passing under it with an opaque bar', () => {
		mountList();
		scrollTo(200);
		cy.get('.popup-header').should(([header]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(header);
			expect(style.backgroundColor).to.equal('rgb(13, 17, 23)');
			expect(style.borderBottomColor).to.equal('rgb(48, 54, 61)');
			expect(style.backdropFilter === 'none' || style.backdropFilter === '').to.equal(true);
		});
	});

	// The letters that survive are the whole brief: they slide from the wordmark into the icon and
	// are never masked, faded or swapped out on the way.
	it('keeps the mark on screen for every frame of the collapse', () => {
		mountList();
		scrollTo(200);
		const seen: number[] = [];
		cy.get('.arenaswap-logo').then(([mark]: JQuery<HTMLElement>) => {
			const tick = () => {
				seen.push(mark.getBoundingClientRect().width);
				if (seen.length < 30) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		});
		cy.wait(700).then(() => {
			expect(seen.length).to.be.greaterThan(10);
			expect(Math.min(...seen)).to.be.greaterThan(0);
		});
	});
});

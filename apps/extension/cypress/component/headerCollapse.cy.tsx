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
// `rgba(13, 17, 23, 0)` and `rgb(13, 17, 23)` are the two ends of the same declaration, so what
// these specs mean is the alpha, not the string.
const surfaceAlpha = (header: HTMLElement) => {
	const parts = getComputedStyle(header).backgroundColor.match(/[\d.]+/g) as string[];
	return parts.length > 3 ? parseFloat(parts[3] as string) : 1;
};

const markShouldBe = (width: number) => cy.get('.arenaswap-logo').should(([mark]: JQuery<HTMLElement>) => {
	expect(parseFloat(String(mark.getAttribute('viewBox')).split(' ')[2])).to.be.closeTo(width, 0.5);
});

const expandedWidth = 1790;
const collapsedWidth = 431.76;

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
			expect(surfaceAlpha(header)).to.equal(1);
			expect(style.backgroundColor).to.contain('13, 17, 23');
			expect(style.borderBottomColor).to.contain('48, 54, 61');
			expect(style.backdropFilter === 'none' || style.backdropFilter === '').to.equal(true);
		});
	});

	// The surface is not on the collapse curve. A card is behind the bar from the first pixel of
	// scroll — 40px before the collapse starts and 450ms before it finishes — and a background
	// easing in on that curve shows the list straight through the header, worst on a fast flick.
	// Read synchronously on the scroll, with no wait, which is the frame the bug was visible in.
	it('has a surface from the very first pixel of scroll', () => {
		mountList();
		cy.get('.popup-header').should(([header]: JQuery<HTMLElement>) => {
			expect(surfaceAlpha(header)).to.equal(0);
		});
		scrollTo(1);
		cy.get('.popup-header').then(([header]: JQuery<HTMLElement>) => {
			expect(surfaceAlpha(header)).to.equal(1);
		});
	});

	// And it goes away again the moment the list is back at the top, rather than trailing the
	// expand animation out by 450ms.
	it('drops the surface as soon as the list is back at the top', () => {
		mountList();
		scrollTo(200);
		markShouldBe(collapsedWidth);
		scrollTo(0);
		cy.get('.popup-header').then(([header]: JQuery<HTMLElement>) => {
			expect(surfaceAlpha(header)).to.equal(0);
		});
	});

	// The orange period belongs to the wordmark, not the icon: every shipped PNG under
	// `public/icon` has zero orange pixels in it.
	it('closes the orange period away rather than parking it next to the `s`', () => {
		mountList();
		cy.get('[data-wm="dot"]').should(([dot]: JQuery<HTMLElement>) => {
			expect(parseFloat(dot.getAttribute('rx') as string)).to.be.greaterThan(20);
		});
		scrollTo(200);
		cy.get('[data-wm="dot"]').should(([dot]: JQuery<HTMLElement>) => {
			expect(parseFloat(dot.getAttribute('rx') as string)).to.equal(0);
			expect(parseFloat(dot.getAttribute('stroke-width') as string)).to.equal(0);
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

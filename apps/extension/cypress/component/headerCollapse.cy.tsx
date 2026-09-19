import { useRef } from 'react';
import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';

// The header condenses against the list it sits on, so the list has to be real: a scroller with
// enough in it to scroll, at the popup's own 320x560. Mounting the header on its own would leave
// it with nothing to listen to.
const Harness = ({ startAt = 0 }: { startAt?: number }) => {
	const scroller = useRef<HTMLDivElement>(null);
	return (
		<div
			className='popup-container'
			ref={node => {
				scroller.current = node;
				if (node) node.scrollTop = startAt;
			}}
		>
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
const collapsedWidth = 546.1;

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

	// A single threshold means a list resting on it flickers, so collapsing and expanding happen at
	// different offsets. 30 is past the one and short of the other.
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

	// The wordmark narrows; it must not also shrink, or the whole bar changes height under the
	// cards and the collapse reads as the header falling over rather than closing.
	it('keeps the bar the same height throughout', () => {
		mountList();
		cy.get('.popup-header').invoke('outerHeight').then(before => {
			scrollTo(200);
			cy.get('.arenaswap-logo').should(([mark]: JQuery<HTMLElement>) => {
				expect(mark.getBoundingClientRect().height).to.be.closeTo(36, 0.5);
			});
			cy.get('.popup-header').invoke('outerHeight').should('equal', before);
		});
	});

	it('covers the cards passing under it once it is condensed', () => {
		mountList();
		scrollTo(200);
		cy.get('.popup-header').should(([header]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(header);
			expect(style.backgroundColor).not.to.equal('rgba(0, 0, 0, 0)');
			expect(style.borderBottomColor).not.to.equal('rgba(0, 0, 0, 0)');
		});
	});
});

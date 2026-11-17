import { useEffect, useRef } from 'react';
import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';

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
// A color-mix() computes to color(srgb …) rather than rgb(), so it is painted and read back as bytes.
const toRgb = (color: string) => {
	const context = document.createElement('canvas').getContext('2d')!;
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3)).join(', ');
};

const surfaceAlpha = (header: HTMLElement) => {
	const parts = getComputedStyle(header).backgroundColor.match(/[\d.]+/g) as string[];
	return parts.length > 3 ? parseFloat(parts[3] as string) : 1;
};

const markShouldBe = (width: number) => cy.get('.arenaswap-logo').should(([mark]: JQuery<HTMLElement>) => {
	expect(parseFloat(String(mark.getAttribute('viewBox')).split(' ')[2])).to.be.closeTo(width, 0.5);
});

const expandedWidth = 1790;
const collapsedWidth = 503.76;

describe('the popup header', () => {
	it('stays at the top of the list rather than scrolling off it', () => {
		mountList();
		scrollTo(400);
		cy.get('.popup-header').should(([header]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(header).position).to.equal('sticky');
			const list = header.parentElement as HTMLElement;
			expect(header.getBoundingClientRect().top).to.be.closeTo(list.getBoundingClientRect().top, 1);
		});
	});

	it('draws the whole wordmark while the list is at the top', () => {
		mountList();
		markShouldBe(expandedWidth);
	});

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

	// Condensing takes ~19px out of the bar, and
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
		markShouldBe(collapsedWidth);
		cy.get('.popup-header').should('have.class', 'is-condensed');
	});

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

	it('covers the cards passing under it with an opaque bar', () => {
		mountList();
		scrollTo(200);
		cy.get('.popup-header').should(([header]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(header);
			expect(surfaceAlpha(header)).to.equal(1);
			expect(toRgb(style.backgroundColor)).to.equal('13, 17, 23');
			expect(toRgb(style.borderBottomColor)).to.equal('48, 54, 61');
			expect(style.backdropFilter === 'none' || style.backdropFilter === '').to.equal(true);
		});
	});

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

	it('drops the surface as soon as the list is back at the top', () => {
		mountList();
		scrollTo(200);
		markShouldBe(collapsedWidth);
		scrollTo(0);
		cy.get('.popup-header').then(([header]: JQuery<HTMLElement>) => {
			expect(surfaceAlpha(header)).to.equal(0);
		});
	});

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

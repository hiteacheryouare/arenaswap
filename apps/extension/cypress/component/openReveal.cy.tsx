import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import GameCardReveal from '../../entrypoints/popup/components/gameCardReveal';
import {
	revealBaseDurationMs,
	revealDurationMs,
	revealFullRate,
	revealOpenBeatMs,
	revealOpenMs,
	revealLeanRatio,
	revealLeanWidthCap,
	revealStageBleedPx,
	revealSweepAngleDeg,
	type revealMode,
} from '../../entrypoints/popup/cardReveal';
import type { Game } from '@arenaswap/core/types';

// The same two 8x8 fixtures `teamCrest.cy.tsx` measures, so the real canvas read runs here rather
// than a stub of it. Navy on Miami's own navy is the case that falls to the tinted plate; gold on
// Arizona's red is the case that keeps its colours and draws bare. One card carrying both is the
// shape that mattered: the two treatments have to arrive at one size and land on one slot.
const navyLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVR4nGPkUXb4z4AHMOGTHD4KAH25AX7gsIqPAAAAAElFTkSuQmCC';
const goldLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8v03oPwMewIRPcvgoAADe+QLWq7gZUwAAAABJRU5ErkJggg==';

const game = (status: 'in' | 'post', away = 'MIA', home = 'ARI') => ({
	id: 'g1',
	status,
	league: 'mlb',
	sportType: 'baseball',
	period: 5,
	topOfInning: true,
	awayTeam: { id: 'a', name: 'Miami', abbreviation: away, score: 3, color: '#0C2340', logo: navyLogo },
	homeTeam: { id: 'h', name: 'Arizona', abbreviation: home, score: 1, color: '#A71930', logo: goldLogo },
}) as unknown as Game;

// The nesting `mainView` actually builds — `.popup-container`, the section's `.mt-2`, the league's
// own div, then the wrapper. Not a shortcut: mounted straight into the flex column the container is,
// the wrapper becomes a flex item and stops the card's bottom margin collapsing out of it, so the
// box assertions below would be describing a DOM the popup never has.
const Harness = ({ mode, status = 'in', away, home, skipping = false }: {
	mode: revealMode;
	status?: 'in' | 'post';
	away?: string;
	home?: string;
	skipping?: boolean;
}) => {
	const subject = game(status, away, home);
	const shared = {
		game: subject,
		excitementResult: undefined,
		favoriteTeamIds: new Set<string>(),
		onToggleFavoriteTeam: () => {},
		onOpenGameDetail: () => {},
		bettingPrefs: { bettingEnabled: false },
	};
	return (
		<div className='popup-container d-flex flex-column'>
			<div className='mt-2'>
				<div>
					<GameCardReveal game={subject} mode={mode} index={0} skipping={skipping}>
						{status === 'post' ? <FinalGameCard {...shared} /> : <LiveGameCard {...shared} />}
					</GameCardReveal>
				</div>
			</div>
		</div>
	);
};

// The run of glyphs, not the 8rem box they are centred in: the box is fixed and the lettering
// overflows it, so the box says nothing about whether the two sides collide.
const inkOf = (selector: string) => cy.get(selector).then($el => {
	const range = $el[0].ownerDocument.createRange();
	range.selectNodeContents($el[0]);
	return range.getBoundingClientRect();
});

// The animations run on the document timeline, which `cy.clock` does not fake. Driving them through
// the Web Animations API is the only way to read a chosen frame, and it reads the real composited
// state rather than a re-derivation of it.
const scrubTo = (ms: number) => {
	// `should('exist')` first, not politeness: the crest offsets are set from a layout effect, so
	// the commit that carries them has to have happened before the timeline is moved.
	cy.get('.game-card-reveal').should('exist');
	return cy.document().then(doc => {
		doc.getAnimations().forEach(animation => {
			animation.pause();
			animation.currentTime = ms;
		});
	});
};

// Every millisecond below is written where its beat sits in the poster's own choreography — the
// figures the stylesheet names, before `--reveal-rate` — and put onto the real timeline here. Two
// things move it: the rate, and the opening beat that now runs ahead of the poster, so poster-zero is
// no longer timeline-zero. Writing the resolved figures instead would hide which beat was meant the
// next time either of those changes, and both have changed twice.
const spineMs = (ms: number) => revealOpenMs('full') + ms * revealFullRate;

// And the opening beat's own frames, which are measured from the start of the card.
const openMs = (ms: number) => ms * revealFullRate;

const rectOf = (selector: string) => cy.get(selector).then($el => $el[0].getBoundingClientRect());

// Which treatment a crest gets is only known once its pixels have been read, so any assertion about
// the plate has to wait for both images to have decoded. Asserted as a count of loaded ones rather
// than an attribute on the set, because `have.attr` reads the first element and passes on it alone.
const awaitCrests = () => cy.get('.game-card-reveal-crest-logo[data-crest-state="loaded"]')
	.should('have.length', 2);

// `polygon(0% 0%, calc(50% + 29px) 0%, ...)` → the x expression of each point. Kept as written
// rather than parsed into numbers: Chrome leaves percentages and calc intact here, so the only
// honest way to read a coordinate is to hand the expression back to the engine.
const clipPointsX = (el: Element) => (getComputedStyle(el).clipPath.match(/^polygon\((.*)\)$/)?.[1] ?? '')
	.split(',')
	.map(point => {
		const parts = point.trim().split(/\s+/);
		parts.pop();
		return parts.join(' ');
	});

// Resolves one of those expressions against the same box clip-path measures against, by asking the
// engine for the width it describes.
const resolveX = (el: Element, expression: string) => {
	const probe = el.ownerDocument.createElement('div');
	probe.style.cssText = `position:absolute;top:0;left:0;height:1px;width:${expression}`;
	el.appendChild(probe);
	const width = probe.getBoundingClientRect().width;
	probe.remove();
	return width;
};

describe('the popup open reveal', () => {
	beforeEach(() => cy.viewport(320, 560));

	it('builds the graphic out of a poster, two wipes and the group that crosses them', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal-half').should('have.length', 2);
		cy.get('.game-card-reveal-abbr').should('have.length', 2);
		cy.get('.game-card-reveal-crest').should('have.length', 2);
		// Three to a side: the thick bar and the two thinner ones running its path behind it.
		cy.get('.game-card-reveal-sweep').should('have.length', 6);
		cy.get('.game-card-reveal-sweep.is-chaser').should('have.length', 4);
		cy.get('.game-card-reveal-sweep.is-trailer').should('have.length', 2);
		cy.get('.game-card-reveal-abbr-edge').first().should('have.text', 'MIA');
		cy.get('.game-card-reveal-abbr-face').first().should('have.text', 'MIA');
	});

	// One choreography at two speeds, so the quick version is the same DOM. If it ever renders
	// fewer parts, something has started cutting beats instead of taking them faster.
	it('draws every part of the graphic in the quick version too', () => {
		cy.mount(<Harness mode='quick' />);
		cy.get('.game-card-reveal-half').should('have.length', 2);
		cy.get('.game-card-reveal-abbr').should('have.length', 2);
		cy.get('.game-card-reveal-crest').should('have.length', 2);
		cy.get('.game-card-reveal-sweep').should('have.length', 6);
		cy.get('.game-card-reveal').should('have.css', '--reveal-rate', '0.8');
	});

	// And the rate is the only thing that differs between them, which is the whole reason the long cut
	// costs nothing structural. A second timeline would show up here as two numbers to maintain.
	it('plays the long cut as the same graphic at a longer rate', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal').should('have.css', '--reveal-rate', String(revealFullRate));
	});

	it('leaves the card alone entirely when there is no reveal to play', () => {
		cy.mount(<Harness mode='none' />);
		cy.get('.game-card').should('exist');
		cy.get('.game-card-reveal').should('not.exist');
	});

	// The card is a node somebody can already be using — the tab picker inside it is a `<select>` —
	// and what ends the graphic is that somebody interacting with the popup. React reconciles children
	// by position, so the wrapper and every layer's slot have to outlive the ending: drop the wrapper
	// and the card is reparented, collapse the holes the layers leave and the card slides up into a
	// slot that used to hold a different element. Either is a rebuild rather than a move, and it takes
	// the focus, an open dropdown, and the element a running `select` is holding with it.
	it('leaves the card the same element after the graphic ends', () => {
		cy.clock();
		cy.mount(<Harness mode='quick' />);
		cy.get('.game-card-reveal-stage').should('exist');
		cy.get('.game-card').then($card => {
			const before = $card[0];
			cy.tick(revealDurationMs('quick') + 1000);
			cy.get('.game-card-reveal-stage').should('not.exist');
			cy.get('.game-card').should($after => expect($after[0]).to.equal(before));
		});
	});

	// ── The opening beat ──────────────────────────────────────────────────────────

	// And the overhang is cut at the card rather than painted outside it, which is the difference
	// between artwork placed past the frame and artwork spilling out of a container.
	it('cuts the overhang at the card\'s own edge', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			rectOf('.game-card-reveal-opening').then(layer => {
				expect(layer.left, 'clipped to the card').to.be.closeTo(card.left, 0.1);
				expect(layer.right, 'clipped to the card').to.be.closeTo(card.right, 0.1);
				// The same pixel of bleed the poster's layers take, for the same reason.
				expect(layer.top).to.be.closeTo(card.top - revealStageBleedPx, 0.1);
				expect(layer.bottom).to.be.closeTo(card.bottom + revealStageBleedPx, 0.1);
			});
			cy.get('.game-card-reveal-opening')
				.should('have.css', 'clip-path', `inset(0px -${revealStageBleedPx}px round 9px)`);
		});
	});

	// Each crest's colour goes across its own half of the card at full size rather than into a disc.
	// `teamCrest`'s own wrapper is that field, which is what keeps the colour right without this file
	// deciding it: where the artwork reads on its team's colour the component comes back bare and the
	// stylesheet paints the team colour.
	it('lays each team\'s colour across its own half of the card', () => {
		cy.mount(<Harness mode='full' />);
		awaitCrests();
		// Arizona's gold on Arizona's red reads, so the field is the team colour.
		cy.get('.game-card-reveal-opening-field.is-home')
			.should('have.class', 'is-bare')
			.and('have.css', 'background-color', 'rgb(167, 25, 48)')
			// Not a disc any more, and nothing rounded left behind.
			.and('have.css', 'border-radius', '0px');
	});

	// And where it does not read, the crest component's tinted plate wins on an inline style — which is
	// the right way round: that plate exists for exactly the crest that cannot be seen on its team's
	// colour, and here it becomes the lighter field that crest needs rather than a disc behind it.
	it('takes the crest\'s own plate colour for that half where the artwork cannot read', () => {
		cy.mount(<Harness mode='full' />);
		awaitCrests();
		// Miami's navy on Miami's navy does not read, and the popup carries no monochrome marks.
		cy.get('.game-card-reveal-opening-field.is-away')
			.should('not.have.class', 'is-bare')
			.and('have.css', 'background-color', 'rgb(255, 255, 255)');
	});

	// The two fields cover the card between them, the way the poster's halves do at full width — so
	// there is no third surface showing through and the layer behind them paints nothing.
	it('covers the whole card between the two fields', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			rectOf('.game-card-reveal-opening-field.is-away').then(away => {
				rectOf('.game-card-reveal-opening-field.is-home').then(home => {
					expect(away.left).to.be.closeTo(card.left, 0.5);
					expect(home.right).to.be.closeTo(card.right, 0.5);
					// Each is half the card plus the lean, so together they overlap across the seam
					// rather than leaving a gap at it.
					expect(away.right).to.be.greaterThan(home.left);
				});
			});
		});
		cy.get('.game-card-reveal-opening').should('have.css', 'background-image', 'none');
	});

	// Oversized is still the point, and the field is what cuts it: the mark overruns its half on every
	// side and nothing of it is allowed to paint outside the card.
	it('clips each oversized mark to the card, on every side', () => {
		cy.mount(<Harness mode='full' />);
		awaitCrests();
		scrubTo(openMs(revealOpenBeatMs));
		rectOf('.game-card').then(card => {
			// The mark's own box is bigger than the card, which is what makes it oversized at all.
			cy.get('.game-card-reveal-opening-logo').should($marks => {
				[...$marks].forEach(mark => {
					expect(mark.getBoundingClientRect().height).to.be.greaterThan(card.height);
				});
			});
			// And every field that cuts them is inside the card, so none of that box is painted.
			cy.get('.game-card-reveal-opening-field').should($fields => {
				[...$fields].forEach(field => {
					const box = field.getBoundingClientRect();
					expect(box.top, 'field top').to.be.at.least(card.top - revealStageBleedPx);
					expect(box.bottom, 'field bottom').to.be.at.most(card.bottom + revealStageBleedPx);
					expect(box.left, 'field left').to.be.at.least(card.left - 0.5);
					expect(box.right, 'field right').to.be.at.most(card.right + 0.5);
					expect(getComputedStyle(field).overflow, 'field clips').to.equal('hidden');
				});
			});
		});
	});

	// The transition out of the beat is the colour covering it, not a dissolve: the opening sits under
	// the halves, so the poster arriving is what takes it off screen. If the stacking ever inverts, the
	// oversized pair would ride over the poster instead.
	it('keeps the opening beat under the colour that replaces it', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal-opening').then($opening => {
			cy.get('.game-card-reveal-stage').then($stage => {
				const opening = Number(getComputedStyle($opening[0]).zIndex);
				const stage = Number(getComputedStyle($stage[0]).zIndex);
				const base = Number(getComputedStyle($opening[0].previousElementSibling!).zIndex);
				expect(opening, 'over the dark base').to.be.greaterThan(base);
				expect(opening, 'under the poster').to.be.lessThan(stage);
			});
		});
	});

	// It has to be gone before the colour parts again at the end, or the retreat uncovers it a second
	// time — which is the one way a layer that is only ever hidden rather than removed can come back.
	it('is gone before the colour retreats off the card', () => {
		cy.mount(<Harness mode='full' />);
		// 78% of the poster is where the halves start retreating.
		scrubTo(spineMs(revealBaseDurationMs * 0.78));
		cy.get('.game-card-reveal-opening').should('have.css', 'opacity', '0');
	});

	// And no later open of the day gets one at all, which is what keeps that version byte-identical.
	it('gives the quick version no opening beat, and starts its poster at once', () => {
		cy.mount(<Harness mode='quick' />);
		cy.get('.game-card-reveal-opening').should('not.exist');
		cy.get('.game-card-reveal').should('have.css', '--reveal-spine', '0ms');
	});

	// The poster's own anchor, which every delay in its half of the stylesheet is taken from. On the
	// first open it is the opening beat's length; a card that read the cascade instead would start its
	// poster over crests still arriving.
	it('anchors the poster after the opening beat', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal').should('have.css', '--reveal-spine', `${revealOpenMs('full')}ms`);
		cy.get('.game-card-reveal').should('have.css', '--reveal-delay', '0ms');
	});

	// The tricode is wiped, never faded: the crest layer and the lettering layer are clipped along
	// one line from opposite sides, so every pixel is showing exactly one of them. If these two
	// edges ever drift apart you get a gap showing the bare colour, or an overlap showing both.
	it('trades lettering for crest along a single edge, with no gap and no overlap', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(2000));
		cy.get('.game-card-reveal-wipe.is-away').then($wipe => {
			cy.get('.game-card-reveal-mask.is-away').then($mask => {
				const wipe = clipPointsX($wipe[0]);
				const mask = clipPointsX($mask[0]);
				// The wipe keeps what is left of the edge and the mask what is right of it, so the
				// edge is the wipe's 2nd and 3rd points and the mask's 1st and 4th.
				expect(wipe[1], 'edge at the top of the card').to.equal(mask[0]);
				expect(wipe[2], 'edge at the bottom of the card').to.equal(mask[3]);
				// And it really is leaning, rather than the two agreeing on a vertical line.
				expect(wipe[1]).not.to.equal(wipe[2]);
			});
		});
	});

	// The seam pivots on the card's centre and crosses it by one lean at each end, so a lean taken
	// from the height alone puts a tall card's join an eighth of the way into the other team's half:
	// 39.7px on the 210px live card the shipped popup draws, where the bottom row of the away half is
	// 63% the home team's colour. The stub card here is 148px, which is why this has to say how tall
	// the card is rather than take the fixture's word for it.
	it('holds the seam within a tenth of the card whatever the card\'s height', () => {
		cy.mount(<Harness mode='full' />);
		// Short card: the full angle, untouched.
		rectOf('.game-card').then(card => {
			cy.get('.game-card-reveal').should($wrapper => {
				const style = getComputedStyle($wrapper[0]);
				const lean = parseFloat(style.getPropertyValue('--reveal-lean'));
				const skew = parseFloat(style.getPropertyValue('--reveal-skew'));
				expect(lean, 'lean on a short card').to.be.lessThan(card.width * revealLeanWidthCap);
				expect(skew, 'angle on a short card').to.be.closeTo(revealSweepAngleDeg, 0.01);
			});
		});
		// And as tall as the real thing: bounded, with the bars still skewed by the angle it leans at.
		// Taken back off at the end of the test, because the runner's document outlives a mount and a
		// style left in it makes every card in every later spec in this file 210px tall.
		let padding: HTMLStyleElement | null = null;
		cy.document().then(doc => {
			padding = doc.createElement('style');
			padding.textContent = '.game-card { padding-bottom: 75px; }';
			doc.head.appendChild(padding);
		});
		rectOf('.game-card').then(card => {
			expect(card.height, 'the card this measures').to.be.greaterThan(205);
			cy.get('.game-card-reveal').should($wrapper => {
				const style = getComputedStyle($wrapper[0]);
				const lean = parseFloat(style.getPropertyValue('--reveal-lean'));
				const skew = parseFloat(style.getPropertyValue('--reveal-skew'));
				expect(lean, 'lean on a tall card').to.be.closeTo(card.width * revealLeanWidthCap, 0.01);
				expect(skew, 'angle on a tall card').to.be.lessThan(revealSweepAngleDeg);
				// The bar is the edge it reveals along, so its skew has to be the lean's own angle.
				const stage = card.height + revealStageBleedPx * 2;
				expect(Math.tan((skew * Math.PI) / 180) * (stage / 2), 'what that angle leans').to.be.closeTo(lean, 0.05);
			});
		});
		// Which is what the halves are actually cut to: each one is half the card plus a lean.
		rectOf('.game-card').then(card => {
			cy.get('.game-card-reveal-half.is-home').should($half => {
				const overhang = $half[0].getBoundingClientRect().width - card.width / 2;
				expect(overhang, 'how far the home colour reaches past the centre')
					.to.be.closeTo(card.width * revealLeanWidthCap, 0.5);
			});
		});
		cy.then(() => padding?.remove());
	});

	// A parked bar is a bar you can see, and a skewed strip is wider than the bar it draws: skewing
	// about the centre throws the strip's ends sideways by its own half-height times the angle, so the
	// bounding box of a 22px bar is 22px plus two leans. Parked at a flat 18% of the card's width, the
	// far corner was still 13.7px over a live card — a white wedge in the top-left corner for the first
	// second and a half of every open, and in the bottom-left for the last.
	it('parks every bar clear of the card, corners and all', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			// Before the pass and after it, which is most of the graphic. The far end has to clear the
			// last bar to finish travelling and still fall before the wrapper is taken away at 3400: the
			// trailing bar leaves at 1760 and drags for 1120, so nothing is parked until 2880. It was
			// 2700 when the pass was two bars of 1000ms each, and that now reads a bar mid-flight.
			([0, 2950] as const).forEach(spine => {
				const ms = spineMs(spine);
				scrubTo(ms);
				cy.get('.game-card-reveal-sweep').should($bars => {
					[...$bars].forEach(bar => {
						const box = bar.getBoundingClientRect();
						const over = Math.min(box.right, card.right) - Math.max(box.left, card.left);
						// Zero is the design — the strip's far corner lands on the card's own edge — so the
						// tolerance is the float noise a skewed box measures with (0.0124px here) rather than
						// slack. The bug it pins was 13.7px, three orders of magnitude the other side of it.
						expect(over, `${bar.className} over the card at ${ms}ms`).to.be.at.most(0.05);
					});
				});
			});
		});
	});

	// And that one edge is the bar itself, not a line near it.
	it('cuts along the bar rather than somewhere close to it', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(2000));
		rectOf('.game-card-reveal-sweeps').then(layer => {
			rectOf('.game-card-reveal-sweep.is-away').then(bar => {
				cy.get('.game-card-reveal-wipe.is-away').then($wipe => {
					const [, top, bottom] = clipPointsX($wipe[0]);
					const edgeMid = (resolveX($wipe[0], top as string) + resolveX($wipe[0], bottom as string)) / 2;
					// Halfway down the card the leaning edge is where the bar's own trailing side
					// is. The bar's rect is the bounding box of a skewed strip, so its left is the
					// bottom corner — half the lean ahead of where the strip crosses the middle.
					expect(edgeMid, 'edge halfway down the card')
						.to.be.closeTo(bar.left - layer.left + (bar.width - 22) / 2, 2);
				});
			});
		});
	});

	// Every layer here is drawn against the card's own border box, and is meant to stay that way
	// wherever the wrapper is nested. Pinning the gap on the wrapper is what makes that true without
	// depending on the card's bottom margin collapsing out through it — which it does here and does
	// not the moment anything makes the wrapper a flex item, at a cost of 8px on every layer.
	it('draws its layers against exactly the box the card occupies', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card-reveal').then(wrapper => {
			rectOf('.game-card').then(card => {
				expect(card.top, 'top').to.be.closeTo(wrapper.top, 0.5);
				expect(card.bottom, 'bottom').to.be.closeTo(wrapper.bottom, 0.5);
				expect(card.left, 'left').to.be.closeTo(wrapper.left, 0.5);
				expect(card.right, 'right').to.be.closeTo(wrapper.right, 0.5);
			});
		});
		// And the gap between cards survives the move onto the wrapper.
		cy.get('.game-card-reveal').should('have.css', 'margin-bottom', '8px');
		cy.get('.game-card-reveal > .game-card').should('have.css', 'margin-bottom', '0px');
	});

	// Against it, and then a pixel past it. A cover of exactly the card's shape cannot hide the card's
	// own edges: both boundaries are antialiased, so at a pixel the card only partly paints the cover
	// only partly covers, and the rest of the card shows through — 22% of its `#dee2e6` border along
	// the first and last row of every corner, plus a hairline across the whole bottom edge, whose own
	// row is shared because a card's height is computed and lands mid-pixel. Both read as white lines
	// in the corners. Containment does not fix it and a pixel of bleed does.
	it('bleeds a pixel past the card, so the card\'s own edges cannot show through the cover', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			(['.game-card-reveal-stage', '.game-card-reveal-sweeps'] as const).forEach(selector => {
				cy.get(selector).should($el => {
					const box = $el[0].getBoundingClientRect();
					expect(box.top, `${selector} above the card`).to.be.closeTo(card.top - revealStageBleedPx, 0.1);
					expect(box.bottom, `${selector} below the card`).to.be.closeTo(card.bottom + revealStageBleedPx, 0.1);
					// And not out to the sides, where `left: 25%` and `75%` are the crest slots.
					expect(box.left, `${selector} left`).to.be.closeTo(card.left, 0.1);
					expect(box.right, `${selector} right`).to.be.closeTo(card.right, 0.1);
				});
			});
		});
		// The other two sides come from the clip, at the card's own 8px radius plus the same pixel:
		// grown rather than merely square, or the corners stop being the card's corners.
		cy.get('.game-card').should('have.css', 'border-radius', '8px');
		cy.get('.game-card-reveal-stage').should('have.css', 'clip-path', 'inset(0px -1px round 9px)');
		cy.get('.game-card-reveal-sweeps').should('have.css', 'clip-path', 'inset(0px -1px round 9px)');
	});

	// The bleed must not bend the seam. The lean is half the horizontal run of a leaning edge across
	// the box it leans over, and that box is the stage rather than the card — the same run over a
	// taller box is a shallower angle, and the bar that reveals along the seam is skewed by the angle
	// itself, so the two would stop being one line.
	it('measures the lean across the box that leans, not across the card', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			const bled = card.height + revealStageBleedPx * 2;
			cy.get('.game-card-reveal').should($wrapper => {
				const lean = parseFloat(getComputedStyle($wrapper[0]).getPropertyValue('--reveal-lean'));
				expect(lean, 'lean').to.be.closeTo((bled * revealLeanRatio) / 2, 0.01);
			});
		});
	});

	// The last beat takes the colour off the edge it came in from rather than parking a rectangle on
	// the card's rounded border. What is left is the card's own 5px rail, in the same colour, which
	// has been painted underneath since the first frame.
	it('takes the colour all the way off, onto the rail the card draws for itself', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(revealBaseDurationMs) + 50);
		cy.get('.game-card-reveal-half.is-away').should($el => {
			expect($el[0].getBoundingClientRect().width).to.be.closeTo(0, 0.5);
		});
		cy.get('.game-card-reveal-half.is-home').should($el => {
			expect($el[0].getBoundingClientRect().width).to.be.closeTo(0, 0.5);
		});
		cy.get('.game-card').should('have.css', 'border-left-width', '5px');
		cy.get('.game-card').should('have.css', 'border-right-width', '5px');
	});

	// A finished game is the one flat card in the product — grey on both edges, no team colour — and
	// takes the same ending, which is the reason it no longer needs keyframes of its own.
	it('ends the same way on a finished game, which has no rails at all', () => {
		cy.mount(<Harness mode='full' status='post' />);
		scrubTo(spineMs(revealBaseDurationMs) + 50);
		cy.get('.game-card-reveal-half.is-away').should($el => {
			expect($el[0].getBoundingClientRect().width).to.be.closeTo(0, 0.5);
		});
	});

	// The reason the offsets are measured in a layout effect rather than derived from the design.
	// If this drifts, the crest visibly jumps at the handoff.
	it('walks each crest onto the card\'s own crest slot, to the pixel', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(revealBaseDurationMs) + 50);
		rectOf('.game-card-reveal-wipe.is-away .game-card-reveal-crest').then(overlay => {
			cy.get('.game-card .team-crest').first().then($real => {
				const real = $real[0].getBoundingClientRect();
				expect(overlay.left, 'away crest left').to.be.closeTo(real.left, 1);
				expect(overlay.top, 'away crest top').to.be.closeTo(real.top, 1);
				expect(overlay.width, 'away crest width').to.be.closeTo(real.width, 1);
			});
		});
		rectOf('.game-card-reveal-wipe.is-home .game-card-reveal-crest').then(overlay => {
			cy.get('.game-card .team-crest').last().then($real => {
				const real = $real[0].getBoundingClientRect();
				expect(overlay.left, 'home crest left').to.be.closeTo(real.left, 1);
				expect(overlay.top, 'home crest top').to.be.closeTo(real.top, 1);
			});
		});
	});

	// And the mark inside it lands too, which the box matching does not imply: the crest used to be
	// drawn at three quarters of its box when the colour treatment gave it a plate, so matching the
	// boxes alone left the artwork three quarters the size of the card's own and it jumped the rest
	// at the handoff. Every crest is bare now, so the mark is the box.
	it('lands the mark itself on the card\'s crest', () => {
		cy.mount(<Harness mode='full' />);
		awaitCrests();
		scrubTo(spineMs(revealBaseDurationMs) + 50);
		cy.get('.game-card .team-crest').first().then($real => {
			const real = $real[0].getBoundingClientRect();
			cy.get('.game-card-reveal-wipe.is-away .game-card-reveal-crest-logo').should($mark => {
				const box = $mark[0].getBoundingClientRect();
				expect(box.width, 'mark width').to.be.closeTo(real.width, 1);
				expect(box.left, 'mark left').to.be.closeTo(real.left, 1);
				expect(box.top, 'mark top').to.be.closeTo(real.top, 1);
			});
		});
	});

	// Both sides draw their mark at one size. A card showing two crests at two different sizes is the
	// same bug seen from the other end.
	it('draws both sides at one size', () => {
		cy.mount(<Harness mode='full' />);
		awaitCrests();
		scrubTo(spineMs(2000));
		rectOf('.game-card-reveal-wipe.is-away .game-card-reveal-crest-logo').then(away => {
			cy.get('.game-card-reveal-wipe.is-home .game-card-reveal-crest-logo').should($home => {
				expect($home[0].getBoundingClientRect().width).to.be.closeTo(away.width, 1);
			});
		});
	});

	// The poster is sized off the card, so it cannot be clipped by it. A fixed scale was right for
	// one card height and wrong for a pre-game card carrying odds and weather.
	it('keeps the poster crest inside the card at its largest', () => {
		cy.mount(<Harness mode='full' />);
		awaitCrests();
		scrubTo(spineMs(1000));
		rectOf('.game-card').then(card => {
			cy.get('.game-card-reveal-crest-plate').first().should($plate => {
				const box = $plate[0].getBoundingClientRect();
				expect(box.top, 'plate top').to.be.greaterThan(card.top);
				expect(box.bottom, 'plate bottom').to.be.lessThan(card.bottom);
				expect(box.width, 'plate width').to.be.lessThan(card.width / 2);
			});
		});
	});

	// ESPN's abbreviation is not capped, and at one size the two sides run into each other over the
	// seam. Measured on the 296px card: ARMY against NAVY overlapped by 7.4px and UCONN against UMASS
	// by 52, for the second and a half both tricodes are on screen together.
	it('keeps two long tricodes clear of each other over the seam', () => {
		([['ARMY', 'NAVY'], ['UCONN', 'UMASS']] as const).forEach(([away, home]) => {
			cy.mount(<Harness mode='full' away={away} home={home} />);
			// Pinned to the frame the lettering overshoots on, which is the closest the two sides ever
			// come — 620ms plus 70% of the 420ms entry. Read unscrubbed this passed on the backwards
			// fill, where both sides are still parked outward and 44px apart, so it was asserting on the
			// one moment that could never fail. Measured at the overshoot the gap is 25.6px against
			// 28.0px at rest, so the settle costs 2.4 of it.
			scrubTo(spineMs(620 + 420 * 0.7));
			inkOf('.game-card-reveal-mask.is-away .game-card-reveal-abbr-edge').then(awayInk => {
				inkOf('.game-card-reveal-mask.is-home .game-card-reveal-abbr-edge').then(homeInk => {
					// 4px of clearance, which is the two 2px strokes sitting outside each silhouette.
					expect(homeInk.left - awayInk.right, `${away} v ${home}`).to.be.greaterThan(4);
				});
			});
		});
	});

	// And a three-character tricode, which is every professional club, is not shrunk for it.
	it('leaves a three-character tricode at full size', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal').should('have.css', '--reveal-abbr-scale', '1');
		cy.get('.game-card-reveal-abbr-edge').first().should('have.css', 'font-size', '54.4px');
	});

	// An outline of live text is not a stroke on that text: a stroke follows contours a filled glyph
	// hides, and DM Sans builds an N out of overlapping stems, so the diagonal came out drawn straight
	// through both of them. The face copy covers all of that, and it can only do so in the colour
	// actually behind the lettering.
	it('knocks the lettering out of the colour behind it rather than stroking it hollow', () => {
		cy.mount(<Harness mode='full' />);
		// Pinned to a frame in the hold, not read at mount: the face fills to white before the bar
		// arrives, so left to real time this is a race against that beat rather than an assertion.
		scrubTo(spineMs(1000));
		cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-face')
			.should('have.css', 'color', 'rgb(12, 35, 64)');
		cy.get('.game-card-reveal-mask.is-home .game-card-reveal-abbr-face')
			.should('have.css', 'color', 'rgb(167, 25, 48)');
		// Opaque, with the softening taken as opacity on the parent: at any alpha below 1 the stroke's
		// own self-overlaps compound into bright nicks at every junction.
		cy.get('.game-card-reveal-abbr-edge').first()
			.should('have.css', '-webkit-text-stroke-color', 'rgb(255, 255, 255)');
		// Exactly over one another, or the outline is a drop shadow.
		rectOf('.game-card-reveal-mask.is-away .game-card-reveal-abbr-edge').then(edge => {
			cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-face').should($face => {
				const box = $face[0].getBoundingClientRect();
				expect(box.left).to.be.closeTo(edge.left, 0.1);
				expect(box.top).to.be.closeTo(edge.top, 0.1);
			});
		});
	});

	// Outlined while the poster holds, filled solid by the time the bar reaches it — broadcast type
	// trades between those two states rather than sitting in one. It costs no element: the copy behind
	// is already solid white, so the glyph reads filled the moment the face stops being the surface
	// colour. What this pins is that it has finished before the wipe, because a bar crossing a
	// half-filled glyph is a third state nobody designed.
	it('fills the outlined lettering before the bar arrives to take it', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(1400));
		cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-face')
			.should('not.have.css', 'color', 'rgb(255, 255, 255)');
		scrubTo(spineMs(1500));
		cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-face')
			.should('have.css', 'color', 'rgb(255, 255, 255)');
		cy.get('.game-card-reveal-mask.is-home .game-card-reveal-abbr-face')
			.should('have.css', 'color', 'rgb(255, 255, 255)');
	});

	// The poster is bounded to the card it is drawn on, and the hold is a slow push rather than a
	// freeze — so the push has to run up to that bound and not through it. Read at both ends of the
	// hold plus the middle, because a keyframe that overshot would only show between them.
	it('pushes the poster crest up to its bound through the hold, never past it', () => {
		cy.mount(<Harness mode='full' />);
		awaitCrests();
		rectOf('.game-card').then(card => {
			([0, 700, 1496] as const).forEach(spine => {
				scrubTo(spineMs(spine));
				cy.get('.game-card-reveal-crest-plate').should($plates => {
					[...$plates].forEach(plate => {
						const box = plate.getBoundingClientRect();
						expect(box.top, `top at ${spine}ms`).to.be.at.least(card.top);
						expect(box.bottom, `bottom at ${spine}ms`).to.be.at.most(card.bottom);
						expect(box.width, `width at ${spine}ms`).to.be.lessThan(card.width / 2);
					});
				});
			});
		});
	});

	// Skipping has to leave the card readable for the whole of the fade, not after it. Every beat of
	// the card coming into focus fills `both`, so a graphic that merely faded off would take the card
	// with it and hand back a blank one — worse than the animation somebody was escaping.
	it('releases the card underneath the moment the graphic is asked to leave', () => {
		cy.mount(<Harness mode='full' skipping />);
		cy.get('.game-card-reveal.is-skipping').should('exist');
		cy.get('.game-card-center').should('have.css', 'opacity', '1');
		cy.get('.game-card-status-row').should('have.css', 'opacity', '1');
		cy.get('.game-card .team-crest').should('have.css', 'opacity', '1');
		// And the dark plate goes at once rather than fading, because for most of the graphic's life it
		// is already gone — a fade with no `from` would take it back to full and flash it over the card.
		cy.get('.game-card-reveal-base').should('have.css', 'opacity', '0');
	});

	// The card's own crest arrives in one step under an overlay that is still fully opaque, rather
	// than fading up into it: two identical crossfading copies are each half transparent at the
	// midpoint, so the pair washes a quarter of the way to the card and the mark pales and recovers.
	it('brings the card\'s own crest up in one step rather than fading it into the overlay', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(revealBaseDurationMs * 0.93) - 20);
		cy.get('.game-card .team-crest').first().should('have.css', 'opacity', '0');
		scrubTo(spineMs(revealBaseDurationMs * 0.93) + 20);
		cy.get('.game-card .team-crest').first().should('have.css', 'opacity', '1');
	});

	// It has to be standing still before it starts handing over, or what you see is one crest
	// fading out while it is still travelling past the one fading in underneath it.
	it('has stopped moving before the card\'s own crest fades up under it', () => {
		cy.mount(<Harness mode='full' />);
		const handoffStart = revealBaseDurationMs * 0.93;
		scrubTo(spineMs(handoffStart));
		rectOf('.game-card-reveal-wipe.is-away .game-card-reveal-crest').then(atHandoff => {
			scrubTo(spineMs(revealBaseDurationMs));
			rectOf('.game-card-reveal-wipe.is-away .game-card-reveal-crest').then(atEnd => {
				expect(atEnd.left, 'left').to.be.closeTo(atHandoff.left, 0.5);
				expect(atEnd.top, 'top').to.be.closeTo(atHandoff.top, 0.5);
				expect(atEnd.width, 'width').to.be.closeTo(atHandoff.width, 0.5);
			});
		});
	});

	// The card is not simply uncovered, it arrives: everything on it comes up as the colour leaves.
	it('brings the card\'s own contents into focus as the colour goes', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(2400));
		cy.get('.game-card-center').should('have.css', 'opacity', '0');
		scrubTo(spineMs(revealBaseDurationMs));
		cy.get('.game-card-center').should('have.css', 'opacity', '1');
		cy.get('.game-card-status-row').should('have.css', 'opacity', '1');
		cy.get('.team-abbreviation').first().should('have.css', 'opacity', '1');
	});

	// Nothing in the stage may take a click: the card underneath is live the whole time the graphic
	// is over it, and a game you cannot open because an animation is still finishing is a bug.
	it('never takes a click from the card underneath it', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal-stage').should('have.css', 'pointer-events', 'none');
		cy.get('.game-card-reveal-sweeps').should('have.css', 'pointer-events', 'none');
	});

	it('finishes sooner in the quick version than in the full one', () => {
		expect(revealDurationMs('quick')).to.be.lessThan(revealDurationMs('full'));
	});
});

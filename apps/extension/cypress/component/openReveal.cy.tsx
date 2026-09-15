import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import GameCardReveal from '../../entrypoints/popup/components/gameCardReveal';
import { revealBaseDurationMs, revealDurationMs, type revealMode } from '../../entrypoints/popup/cardReveal';
import type { Game } from '@arenaswap/core/types';

const game = (status: 'in' | 'post') => ({
	id: 'g1',
	status,
	league: 'mlb',
	sportType: 'baseball',
	period: 5,
	topOfInning: true,
	awayTeam: { id: 'a', name: 'Miami', abbreviation: 'MIA', score: 3, color: '#00A3E0' },
	homeTeam: { id: 'h', name: 'Arizona', abbreviation: 'ARI', score: 1, color: '#A71930' },
}) as unknown as Game;

const Harness = ({ mode, status = 'in' }: { mode: revealMode; status?: 'in' | 'post' }) => {
	const subject = game(status);
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
			<GameCardReveal game={subject} mode={mode} index={0}>
				{status === 'post' ? <FinalGameCard {...shared} /> : <LiveGameCard {...shared} />}
			</GameCardReveal>
		</div>
	);
};

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

const rectOf = (selector: string) => cy.get(selector).then($el => $el[0].getBoundingClientRect());

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

	it('builds the graphic out of a poster, two wipes and their chasers', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal-half').should('have.length', 2);
		cy.get('.game-card-reveal-abbr').should('have.length', 2);
		cy.get('.game-card-reveal-crest').should('have.length', 2);
		cy.get('.game-card-reveal-sweep').should('have.length', 4);
		cy.get('.game-card-reveal-sweep.is-chaser').should('have.length', 2);
		cy.get('.game-card-reveal-abbr').first().should('have.text', 'MIA');
	});

	// One choreography at two speeds, so the quick version is the same DOM. If it ever renders
	// fewer parts, something has started cutting beats instead of taking them faster.
	it('draws every part of the graphic in the quick version too', () => {
		cy.mount(<Harness mode='quick' />);
		cy.get('.game-card-reveal-half').should('have.length', 2);
		cy.get('.game-card-reveal-abbr').should('have.length', 2);
		cy.get('.game-card-reveal-crest').should('have.length', 2);
		cy.get('.game-card-reveal-sweep').should('have.length', 4);
		cy.get('.game-card-reveal').should('have.css', '--reveal-rate', '0.8');
	});

	it('leaves the card alone entirely when there is no reveal to play', () => {
		cy.mount(<Harness mode='none' />);
		cy.get('.game-card').should('exist');
		cy.get('.game-card-reveal').should('not.exist');
	});

	// The tricode is wiped, never faded: the crest layer and the lettering layer are clipped along
	// one line from opposite sides, so every pixel is showing exactly one of them. If these two
	// edges ever drift apart you get a gap showing the bare colour, or an overlap showing both.
	it('trades lettering for crest along a single edge, with no gap and no overlap', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(2000);
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

	// And that one edge is the bar itself, not a line near it.
	it('cuts along the bar rather than somewhere close to it', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(2000);
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

	// The whole point of the last beat: the colour does not fade off the card, it becomes the rails
	// the card was always going to draw. 5px is `buildGameCardStyle`'s own border width.
	it('collapses onto rails of exactly the width the card draws for itself', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(revealBaseDurationMs + 50);
		cy.get('.game-card-reveal-half.is-away').should($el => {
			expect($el[0].getBoundingClientRect().width).to.be.closeTo(5, 0.5);
		});
		cy.get('.game-card-reveal-half.is-home').should($el => {
			expect($el[0].getBoundingClientRect().width).to.be.closeTo(5, 0.5);
		});
	});

	// A finished game is the one flat card in the product — grey on both edges, no team colour — so
	// there is nothing for the colour to land on and it goes all the way out.
	it('takes the colour all the way off a finished game, which has no rails', () => {
		cy.mount(<Harness mode='full' status='post' />);
		scrubTo(revealBaseDurationMs + 50);
		cy.get('.game-card-reveal-half.is-away').should($el => {
			expect($el[0].getBoundingClientRect().width).to.be.closeTo(0, 0.5);
		});
	});

	// The reason the offsets are measured in a layout effect rather than derived from the design.
	// If this drifts, the crest visibly jumps at the handoff.
	it('walks each crest onto the card\'s own crest slot, to the pixel', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(revealBaseDurationMs + 50);
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

	// It has to be standing still before it starts handing over, or what you see is one crest
	// fading out while it is still travelling past the one fading in underneath it.
	it('has stopped moving before the card\'s own crest fades up under it', () => {
		cy.mount(<Harness mode='full' />);
		const handoffStart = revealBaseDurationMs * 0.93;
		scrubTo(handoffStart);
		rectOf('.game-card-reveal-wipe.is-away .game-card-reveal-crest').then(atHandoff => {
			scrubTo(revealBaseDurationMs);
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
		scrubTo(2400);
		cy.get('.game-card-center').should('have.css', 'opacity', '0');
		scrubTo(revealBaseDurationMs);
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

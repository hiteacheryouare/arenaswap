import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import GameCardReveal from '../../../entrypoints/popup/components/gameCardReveal';
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
} from '../../../entrypoints/popup/cardReveal';
import type { Game } from '@arenaswap/core/types';

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
			<div className='mt-3'>
				<div>
					<GameCardReveal game={subject} mode={mode} index={0} skipping={skipping}>
						{status === 'post' ? <FinalGameCard {...shared} /> : <LiveGameCard {...shared} />}
					</GameCardReveal>
				</div>
			</div>
		</div>
	);
};

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

const spineMs = (ms: number) => revealOpenMs('full') + ms * revealFullRate;

const halvesRetreatStart = revealBaseDurationMs * 0.78;
const handoffStart = revealBaseDurationMs * 0.93;
const trailingBarParkedMs = 1760 + 1120;
const lettersOvershootMs = 620 + 420 * 0.7;
const minTricodeGapPx = 4;

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
		cy.get('.game-card-reveal-sweep').should('have.length', 6);
		cy.get('.game-card-reveal-sweep.is-chaser').should('have.length', 4);
		cy.get('.game-card-reveal-sweep.is-trailer').should('have.length', 2);
		cy.get('.game-card-reveal-abbr-edge').first().should('have.text', 'MIA');
		cy.get('.game-card-reveal-abbr-face').first().should('have.text', 'MIA');
	});

	it('draws every part of the graphic in the quick version too', () => {
		cy.mount(<Harness mode='quick' />);
		cy.get('.game-card-reveal-half').should('have.length', 2);
		cy.get('.game-card-reveal-abbr').should('have.length', 2);
		cy.get('.game-card-reveal-crest').should('have.length', 2);
		cy.get('.game-card-reveal-sweep').should('have.length', 6);
		cy.get('.game-card-reveal').should('have.css', '--reveal-rate', '0.8');
	});

	it('plays the long cut as the same graphic at a longer rate', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal').should('have.css', '--reveal-rate', String(revealFullRate));
	});

	it('leaves the card alone entirely when there is no reveal to play', () => {
		cy.mount(<Harness mode='none' />);
		cy.get('.game-card').should('exist');
		cy.get('.game-card-reveal').should('not.exist');
	});

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

	it('cuts the overhang at the card\'s own edge', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			rectOf('.game-card-reveal-opening').then(layer => {
				expect(layer.left, 'clipped to the card').to.be.closeTo(card.left, 0.1);
				expect(layer.right, 'clipped to the card').to.be.closeTo(card.right, 0.1);
				expect(layer.top).to.be.closeTo(card.top - revealStageBleedPx, 0.1);
				expect(layer.bottom).to.be.closeTo(card.bottom + revealStageBleedPx, 0.1);
			});
			cy.get('.game-card-reveal-opening')
				.should('have.css', 'clip-path', `inset(0px -${revealStageBleedPx}px round 9px)`);
		});
	});

	it('lays each team\'s colour across its own half of the card', () => {
		cy.mount(<Harness mode='full' />);
		awaitCrests();
		cy.get('.game-card-reveal-opening-field.is-home')
			.should('have.class', 'is-bare')
			.and('have.css', 'background-color', 'rgb(167, 25, 48)')
			.and('have.css', 'border-radius', '0px');
	});

	it('keeps the team colour behind a crest that matches it', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal-opening-field.is-away')
			.should('have.class', 'is-bare')
			.and('have.css', 'background-color', 'rgb(12, 35, 64)');
	});

	it('covers the whole card between the two fields', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			rectOf('.game-card-reveal-opening-field.is-away').then(away => {
				rectOf('.game-card-reveal-opening-field.is-home').then(home => {
					expect(away.left).to.be.closeTo(card.left, 0.5);
					expect(home.right).to.be.closeTo(card.right, 0.5);
					expect(away.right).to.be.greaterThan(home.left);
				});
			});
		});
		cy.get('.game-card-reveal-opening').should('have.css', 'background-image', 'none');
	});

	it('clips each oversized mark to the card, on every side', () => {
		cy.mount(<Harness mode='full' />);
		awaitCrests();
		scrubTo(openMs(revealOpenBeatMs));
		rectOf('.game-card').then(card => {
			cy.get('.game-card-reveal-opening-logo').should($marks => {
				[...$marks].forEach(mark => {
					expect(mark.getBoundingClientRect().height).to.be.greaterThan(card.height);
				});
			});
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

	it('is gone before the colour retreats off the card', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(halvesRetreatStart));
		cy.get('.game-card-reveal-opening').should('have.css', 'opacity', '0');
	});

	it('gives the quick version no opening beat, and starts its poster at once', () => {
		cy.mount(<Harness mode='quick' />);
		cy.get('.game-card-reveal-opening').should('not.exist');
		cy.get('.game-card-reveal').should('have.css', '--reveal-spine', '0ms');
	});

	it('anchors the poster after the opening beat', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal').should('have.css', '--reveal-spine', `${revealOpenMs('full')}ms`);
		cy.get('.game-card-reveal').should('have.css', '--reveal-delay', '0ms');
	});

	it('trades lettering for crest along a single edge, with no gap and no overlap', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(2000));
		cy.get('.game-card-reveal-wipe.is-away').then($wipe => {
			cy.get('.game-card-reveal-mask.is-away').then($mask => {
				const wipe = clipPointsX($wipe[0]);
				const mask = clipPointsX($mask[0]);
				expect(wipe[1], 'edge at the top of the card').to.equal(mask[0]);
				expect(wipe[2], 'edge at the bottom of the card').to.equal(mask[3]);
				expect(wipe[1]).not.to.equal(wipe[2]);
			});
		});
	});

	it('holds the seam within a tenth of the card whatever the card\'s height', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			cy.get('.game-card-reveal').should($wrapper => {
				const style = getComputedStyle($wrapper[0]);
				const lean = parseFloat(style.getPropertyValue('--reveal-lean'));
				const skew = parseFloat(style.getPropertyValue('--reveal-skew'));
				expect(lean, 'lean on a short card').to.be.lessThan(card.width * revealLeanWidthCap);
				expect(skew, 'angle on a short card').to.be.closeTo(revealSweepAngleDeg, 0.01);
			});
		});
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
				const stage = card.height + revealStageBleedPx * 2;
				expect(Math.tan((skew * Math.PI) / 180) * (stage / 2), 'what that angle leans').to.be.closeTo(lean, 0.05);
			});
		});
		scrubTo(spineMs(1500));
		rectOf('.game-card').then(card => {
			cy.get('.game-card-reveal-half.is-home').should($half => {
				const overhang = $half[0].getBoundingClientRect().width - card.width / 2;
				expect(overhang, 'how far the home colour reaches past the centre')
					.to.be.closeTo(card.width * revealLeanWidthCap, 0.5);
			});
		});
		cy.then(() => padding?.remove());
	});

	it('parks every bar clear of the card, corners and all', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			([0, trailingBarParkedMs + 70] as const).forEach(spine => {
				const ms = spineMs(spine);
				scrubTo(ms);
				cy.get('.game-card-reveal-sweep').should($bars => {
					[...$bars].forEach(bar => {
						const box = bar.getBoundingClientRect();
						const over = Math.min(box.right, card.right) - Math.max(box.left, card.left);
						expect(over, `${bar.className} over the card at ${ms}ms`).to.be.at.most(0.05);
					});
				});
			});
		});
	});

	it('cuts along the bar rather than somewhere close to it', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(2000));
		rectOf('.game-card-reveal-sweeps').then(layer => {
			rectOf('.game-card-reveal-sweep.is-away').then(bar => {
				cy.get('.game-card-reveal-wipe.is-away').then($wipe => {
					const [, top, bottom] = clipPointsX($wipe[0]);
					const edgeMid = (resolveX($wipe[0], top as string) + resolveX($wipe[0], bottom as string)) / 2;
					expect(edgeMid, 'edge halfway down the card')
						.to.be.closeTo(bar.left - layer.left + (bar.width - 22) / 2, 2);
				});
			});
		});
	});

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
		cy.get('.game-card-reveal').should('have.css', 'margin-bottom', '8px');
		cy.get('.game-card-reveal > .game-card').should('have.css', 'margin-bottom', '0px');
	});

	it('bleeds a pixel past the card, so the card\'s own edges cannot show through the cover', () => {
		cy.mount(<Harness mode='full' />);
		rectOf('.game-card').then(card => {
			(['.game-card-reveal-stage', '.game-card-reveal-sweeps'] as const).forEach(selector => {
				cy.get(selector).should($el => {
					const box = $el[0].getBoundingClientRect();
					expect(box.top, `${selector} above the card`).to.be.closeTo(card.top - revealStageBleedPx, 0.1);
					expect(box.bottom, `${selector} below the card`).to.be.closeTo(card.bottom + revealStageBleedPx, 0.1);
					expect(box.left, `${selector} left`).to.be.closeTo(card.left, 0.1);
					expect(box.right, `${selector} right`).to.be.closeTo(card.right, 0.1);
				});
			});
		});
		cy.get('.game-card').should('have.css', 'border-radius', '8px');
		cy.get('.game-card-reveal-stage').should('have.css', 'clip-path', 'inset(0px -1px round 9px)');
		cy.get('.game-card-reveal-sweeps').should('have.css', 'clip-path', 'inset(0px -1px round 9px)');
	});

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

	it('takes the colour all the way off, onto the card painted in the same colours', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(revealBaseDurationMs) + 50);
		cy.get('.game-card-reveal-half.is-away').should($el => {
			expect($el[0].getBoundingClientRect().width).to.be.closeTo(0, 0.5);
		});
		cy.get('.game-card-reveal-half.is-home').should($el => {
			expect($el[0].getBoundingClientRect().width).to.be.closeTo(0, 0.5);
		});
		cy.get('.game-card').should('have.class', 'is-team-colored')
			.and('have.css', 'background-image').and('contain', 'rgb(12, 35, 64)');
	});

	it('ends the same way on a finished game, which has no rails at all', () => {
		cy.mount(<Harness mode='full' status='post' />);
		scrubTo(spineMs(revealBaseDurationMs) + 50);
		cy.get('.game-card-reveal-half.is-away').should($el => {
			expect($el[0].getBoundingClientRect().width).to.be.closeTo(0, 0.5);
		});
	});

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

	it('keeps two long tricodes clear of each other over the seam', () => {
		([['ARMY', 'NAVY'], ['UCONN', 'UMASS']] as const).forEach(([away, home]) => {
			cy.mount(<Harness mode='full' away={away} home={home} />);
			scrubTo(spineMs(lettersOvershootMs));
			inkOf('.game-card-reveal-mask.is-away .game-card-reveal-abbr-edge').then(awayInk => {
				inkOf('.game-card-reveal-mask.is-home .game-card-reveal-abbr-edge').then(homeInk => {
					expect(homeInk.left - awayInk.right, `${away} v ${home}`).to.be.greaterThan(minTricodeGapPx);
				});
			});
		});
	});

	it('leaves a three-character tricode at full size', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal').should('have.css', '--reveal-abbr-scale', '1');
		cy.get('.game-card-reveal-abbr-edge').first().should('have.css', 'font-size', '54.4px');
	});

	it('knocks the lettering out of the colour behind it rather than stroking it hollow', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(1000));
		cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-face')
			.should('have.css', 'color', 'rgb(12, 35, 64)');
		cy.get('.game-card-reveal-mask.is-home .game-card-reveal-abbr-face')
			.should('have.css', 'color', 'rgb(167, 25, 48)');
		cy.get('.game-card-reveal-abbr-edge').first()
			.should('have.css', '-webkit-text-stroke-color', 'rgb(255, 255, 255)');
		rectOf('.game-card-reveal-mask.is-away .game-card-reveal-abbr-edge').then(edge => {
			cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-face').should($face => {
				const box = $face[0].getBoundingClientRect();
				expect(box.left).to.be.closeTo(edge.left, 0.1);
				expect(box.top).to.be.closeTo(edge.top, 0.1);
			});
		});
	});

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

	it('releases the card underneath the moment the graphic is asked to leave', () => {
		cy.mount(<Harness mode='full' skipping />);
		cy.get('.game-card-reveal.is-skipping').should('exist');
		cy.get('.game-card-center').should('have.css', 'opacity', '1');
		cy.get('.game-card-status-row').should('have.css', 'opacity', '1');
		cy.get('.game-card .team-crest').should('have.css', 'opacity', '1');
		cy.get('.game-card-reveal-base').should('have.css', 'opacity', '0');
		cy.get('.game-card-reveal-opening').should('have.css', 'opacity', '0');
	});

	it('brings the card\'s own crest up in one step rather than fading it into the overlay', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(handoffStart) - 20);
		cy.get('.game-card .team-crest').first().should('have.css', 'opacity', '0');
		scrubTo(spineMs(handoffStart) + 20);
		cy.get('.game-card .team-crest').first().should('have.css', 'opacity', '1');
	});

	it('has stopped moving before the card\'s own crest fades up under it', () => {
		cy.mount(<Harness mode='full' />);
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

	it('brings the card\'s own contents into focus as the colour goes', () => {
		cy.mount(<Harness mode='full' />);
		scrubTo(spineMs(2400));
		cy.get('.game-card-center').should('have.css', 'opacity', '0');
		scrubTo(spineMs(revealBaseDurationMs));
		cy.get('.game-card-center').should('have.css', 'opacity', '1');
		cy.get('.game-card-status-row').should('have.css', 'opacity', '1');
		cy.get('.team-abbreviation').first().should('have.css', 'opacity', '1');
	});

	it('never takes a click from the card underneath it', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal-stage').should('have.css', 'pointer-events', 'none');
		cy.get('.game-card-reveal-sweeps').should('have.css', 'pointer-events', 'none');
	});

	it('finishes sooner in the quick version than in the full one', () => {
		expect(revealDurationMs('quick')).to.be.lessThan(revealDurationMs('full'));
	});
});

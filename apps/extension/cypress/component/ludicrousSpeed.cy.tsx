import LudicrousSpeedOverlay from '../../entrypoints/popup/components/ludicrousSpeedOverlay';
import { buildScript, type Beat } from '../../entrypoints/popup/components/ludicrousScript';
import { cockpitBrakeRect, cockpitWindowRect } from '../../entrypoints/popup/components/ludicrousCockpit';
import { i18n } from '#i18n';

const popupW = 320;
const popupH = 560;

/* The sequence used to be walked with the transport keys it shipped with, which meant the spec
   could only ever assert the order of the beats and never their timing. Those keys are gone, so it
   is walked on a faked clock instead: only setTimeout is stubbed, leaving requestAnimationFrame and
   the CSS animations real, so the canvas still paints and the brake still has its entry ramp. What
   the clock buys is that every wait below is the script's own duration rather than a guess. */
const script = buildScript();
let cursor = 0;

const mountOverlay = (onClose: () => void = () => {}) => {
	cursor = 0;
	cy.viewport(popupW, popupH);
	cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
	cy.mount(<LudicrousSpeedOverlay onClose={onClose} />);
	cy.get('.ls-overlay').should('exist');
};

// Runs the clock forward beat by beat rather than in one jump, so React commits between them.
const stepTo = (index: number) => {
	while (cursor < index) {
		cy.tick(script[cursor]!.ms);
		cursor += 1;
	}
};

const beatIndex = (match: (beat: Beat) => boolean, from = 0) => {
	const found = script.findIndex((beat, i) => i >= from && match(beat));
	expect(found, 'the script still has the beat this test is about').to.be.greaterThan(-1);
	return found;
};

const nextPhase = () => stepTo(beatIndex(beat => Boolean(beat.phase) || Boolean(beat.end), cursor + 1));

const phaseBeats = script.flatMap((beat, i) => (beat.phase ? [i] : []));

/* What the text layer reads on each beat. Several beats set no display of their own — the brake
   arrives under a line already on screen — so it is the last one that did. Ticking the clock only
   schedules React's commit, so every step below settles on a retrying assertion against this before
   anything reads the DOM; `.then` and `.invoke` do not retry and read the previous beat. */
const textAt: string[] = [];
script.reduce((previous, beat, i) => {
	const text = beat.display ? beat.display.text : previous;
	textAt[i] = text;
	return text;
}, '');

const checkText = (index: number) => {
		cy.get('.ls-text').should('have.text', textAt[index]);
		cy.get('.ls-overlay').then($overlay => {
			const canvas = $overlay.find('.ls-canvas')[0]!;
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			const win = cockpitWindowRect(w, h);
			const view = [...$overlay[0]!.classList].find(c => c.startsWith('ls-view-'))!;
			const el = $overlay.find('.ls-text')[0]!;
			const label = `${view} "${(el.textContent ?? '').slice(0, 24)}"`;
			if (!el.textContent?.trim()) return;
			const r = el.getBoundingClientRect();
			expect(r.left, `${label} left`).to.be.at.least(0);
			expect(r.right, `${label} right`).to.be.at.most(w);
			expect(r.top, `${label} top`).to.be.at.least(0);
			expect(r.bottom, `${label} bottom`).to.be.at.most(h);
			if (view === 'ls-view-cockpit') {
				expect(r.top, `${label} clears the glass`).to.be.at.least(win.y + win.h);
			}
		});
	};

describe('ludicrous speed overlay', () => {
	it('closes when the backdrop is clicked', () => {
		const onClose = cy.stub().as('onClose');
		mountOverlay(onClose);
		cy.get('.ls-overlay').click('topLeft');
		cy.get('.ls-overlay').should('have.class', 'ls-view-rear');
		cy.tick(700);
		cy.get('.ls-overlay').should('have.class', 'closing');
		cy.tick(450);
		cy.get('@onClose').should('have.been.called');
	});

	it('cuts between the three cameras in the order the sequence calls for', () => {
		// One entry per phase beat, read off the script so a beat added later cannot be skipped.
		const views = ['rear', 'full', 'full', 'full', 'full', 'full', 'cockpit', 'rear'];
		expect(phaseBeats, 'one expected camera per phase beat').to.have.length(views.length);

		mountOverlay();
		cy.get('.ls-overlay').should('have.class', 'ls-view-cockpit');
		views.forEach(view => {
			nextPhase();
			cy.get('.ls-overlay').should('have.class', `ls-view-${view}`);
		});
	});

	it('the emergency brake is part of the cockpit console and stops the ship', () => {
		const onClose = cy.stub().as('onClose');
		mountOverlay(onClose);
		// The brake deliberately arrives a couple of beats after the cut to the bridge rather than
		// sharing its entrance with the payoff line.
		stepTo(beatIndex(beat => beat.brake === 'visible'));
		cy.get('.ls-overlay').should('have.class', 'ls-view-cockpit');
		cy.get('.ls-emergency-brake').should('be.visible');

		// Measured off the canvas rather than assumed: the runner's viewport is not exactly the
		// popup's, and the assertion that matters is that the button lands on the placard the canvas
		// drew, at whatever size it drew it. Retrying rather than one-shot, because the button has an
		// entry animation and its first frame is 5px low.
		cy.get('.ls-canvas').then($c => {
			const canvas = $c[0]!;
			const expected = cockpitBrakeRect(canvas.clientWidth, canvas.clientHeight);
			cy.get('.ls-emergency-brake').should($b => {
				const r = $b[0]!.getBoundingClientRect();
				expect(r.left, 'brake left').to.be.closeTo(expected.x, 1);
				expect(r.top, 'brake top').to.be.closeTo(expected.y, 1);
				expect(r.width, 'brake width').to.be.closeTo(expected.w, 1);
				expect(r.height, 'brake height').to.be.closeTo(expected.h, 1);
				expect(r.bottom, 'brake sits inside the popup').to.be.at.most(canvas.clientHeight);
			});
		});
		cy.get('.ls-emergency-brake').click();
		cy.tick(500);
		cy.get('.ls-overlay').should('have.class', 'ls-view-rear');
		cy.tick(3800);
		cy.get('.ls-overlay').should('have.class', 'closing');
		cy.tick(450);
		cy.get('@onClose').should('have.been.called');
	});

	it('never lets a text beat overflow the popup or land on the cockpit glass', () => {
		mountOverlay();
		checkText(0);
		// Every beat, not only the phase beats: the alignment fault this covers was per line. The last
		// beat is the one that closes the overlay and carries no text of its own.
		for (let i = 1; i < script.length - 1; i += 1) {
			stepTo(i);
			checkText(i);
		}
	});

	it('holds the PLAID sign back until the plaid has arrived', () => {
		mountOverlay();
		// The entry transition carries no text at all; the sign lands on the phase after it.
		stepTo(beatIndex(beat => beat.phase === 'plaidentry'));
		cy.get('.ls-text').should('not.contain.text', 'PLAID');
		stepTo(beatIndex(beat => beat.phase === 'plaid'));
		cy.get('.ls-text.plaid-rect').should('contain.text', 'PLAID');
	});

	it('leaves the brake live long enough to notice it and decide', () => {
		mountOverlay();
		stepTo(beatIndex(beat => beat.brake === 'visible'));
		cy.get('.ls-emergency-brake').should('be.visible');
		// The label reads NEVER USE, so the joke only works if there is time to consider it anyway.
		cy.tick(6000);
		cy.get('.ls-emergency-brake').should('be.visible').and('not.have.class', 'pressed');
	});

	it('plays the slowdown out instead of cutting away from it', () => {
		const onClose = cy.stub().as('onClose');
		mountOverlay(onClose);
		stepTo(beatIndex(beat => beat.brake === 'visible'));
		cy.get('.ls-emergency-brake').should('be.visible').click();
		cy.tick(500);
		cy.get('.ls-overlay').should('have.class', 'ls-view-rear');
		// Braking is a beat, not an exit: nothing closes while the ship is still coming off its speed.
		cy.tick(2500);
		cy.get('@onClose').should('not.have.been.called');
		cy.tick(1300);
		cy.get('.ls-overlay').should('have.class', 'closing');
		cy.tick(450);
		cy.get('@onClose').should('have.been.called');
	});

	it('lets the payoff line hold the screen on its own', () => {
		mountOverlay();
		const panic = beatIndex(beat => beat.phase === 'panic');
		// The cut lands first and carries no text, so the line does not share its entrance.
		stepTo(panic);
		cy.get('.ls-overlay').should('have.class', 'ls-view-cockpit');
		cy.get('.ls-text').should('not.contain.text', 'passed');
		cy.get('.ls-emergency-brake').should('not.exist');
		stepTo(panic + 1);
		cy.get('.ls-text').should('contain.text', 'passed');
		cy.tick(2000);
		cy.get('.ls-text').should('contain.text', 'passed');
	});

	it('nothing paints or fires after unmount', () => {
		mountOverlay();
		cy.window().then(win => {
			const pending = new Set<number>();
			const raf = win.requestAnimationFrame.bind(win);
			const caf = win.cancelAnimationFrame.bind(win);
			cy.stub(win, 'requestAnimationFrame').callsFake((cb: FrameRequestCallback) => {
				let id = 0;
				id = raf(t => {
					pending.delete(id);
					cb(t);
				});
				pending.add(id);
				return id;
			});
			cy.stub(win, 'cancelAnimationFrame').callsFake((id: number) => {
				pending.delete(id);
				caf(id);
			});

			cy.wait(400);
			cy.then(() => {
				cy.mount(<div data-testid='after' />);
			});
			cy.get('[data-testid=after]').should('exist');
			cy.get('.ls-overlay').should('not.exist');
			// Nothing is still queued: the last frame the loop asked for was cancelled on unmount.
			cy.wait(200).then(() => expect([...pending]).to.have.length(0));
		});
	});
});

/* The egg shipped with the scrubbing controls it was reviewed under — a 4x playback toggle behind
   `f` that persisted itself to localStorage, and `->` / `n` scene jumps — advertised in a strip of
   hardcoded English that no locale file ever carried. It is click to skip and nothing else now. */
describe('ludicrous speed overlay has no transport controls', () => {
	const removedKeys = ['ArrowRight', 'ArrowDown', 'n', 'f'];

	it('ignores the keys that used to scrub and fast-forward the sequence', () => {
		mountOverlay();
		// Parked on a beat with a line on it, so a jump of either kind would change what is on screen.
		stepTo(2);
		expect(textAt[2], 'the beat under test has a line on it').to.not.equal('');
		cy.get('.ls-text').should('have.text', textAt[2]);
		removedKeys.forEach(key => cy.get('.ls-overlay').trigger('keydown', { key }));
		cy.get('.ls-text').should('have.text', textAt[2]);
		cy.get('.ls-overlay').should('have.class', 'ls-view-cockpit');
	});

	it('never writes the playback rate it used to remember', () => {
		mountOverlay();
		removedKeys.forEach(key => cy.get('.ls-overlay').trigger('keydown', { key }));
		cy.window().then(win => {
			expect(win.localStorage.getItem('arenaswap.ludicrous.rate'), 'stored playback rate').to.equal(null);
		});
	});

	// A rate left behind by someone who pressed `f` while the sequence was in review.
	it('a stale stored rate has no effect on the timing', () => {
		cy.window().then(win => win.localStorage.setItem('arenaswap.ludicrous.rate', '4'));
		mountOverlay();
		// Pinned to the line that should still be up rather than to the absence of the next one: at 4x
		// the sequence is six beats further on by now, which "not the second line" is also true of.
		cy.tick(script[0]!.ms - 1);
		cy.get('.ls-text').should('have.text', textAt[0]);
		cy.tick(1);
		cy.get('.ls-text').should('have.text', textAt[1]);
	});

	it('renders no string outside the locale files', () => {
		mountOverlay();
		cy.get('.ls-transport').should('not.exist');
		cy.get('.ls-skip').should('have.text', i18n.t('ludicrousSpeed.skip'));
	});

	// Enter and Space are the click on a role='button', not controls of their own, so they stay.
	it('still skips from the keyboard', () => {
		const onClose = cy.stub().as('onClose');
		mountOverlay(onClose);
		cy.get('.ls-overlay').trigger('keydown', { key: 'Enter' });
		cy.get('.ls-overlay').should('have.class', 'ls-view-rear');
		cy.tick(700);
		cy.get('.ls-overlay').should('have.class', 'closing');
		cy.tick(450);
		cy.get('@onClose').should('have.been.called');
	});
});

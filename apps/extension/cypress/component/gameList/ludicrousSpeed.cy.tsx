import LudicrousSpeedOverlay from '../../../entrypoints/popup/components/ludicrousSpeedOverlay';
import { buildScript, type Beat } from '../../../entrypoints/popup/components/ludicrousScript';
import { cockpitBrakeRect, cockpitWindowRect } from '../../../entrypoints/popup/components/ludicrousCockpit';
import { i18n } from '#i18n';

const popupW = 320;
const popupH = 560;

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

/* Ticking the clock only schedules React's commit, so every step below settles on a retrying
   assertion against this before anything reads the DOM; `.then` and `.invoke` do not retry and
   read the previous beat. */
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
		const views = ['cockpit', 'rear', 'full', 'full', 'full', 'full', 'full', 'cockpit', 'rear'];
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
		stepTo(beatIndex(beat => beat.brake === 'visible'));
		cy.get('.ls-overlay').should('have.class', 'ls-view-cockpit');
		cy.get('.ls-emergency-brake').should('be.visible');

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
		for (let i = 1; i < script.length - 1; i += 1) {
			stepTo(i);
			checkText(i);
		}
	});

	it('holds the PLAID sign back until the plaid has arrived', () => {
		mountOverlay();
		stepTo(beatIndex(beat => beat.phase === 'plaidentry'));
		cy.get('.ls-text').should('not.contain.text', 'PLAID');
		stepTo(beatIndex(beat => beat.phase === 'plaid'));
		cy.get('.ls-text.plaid-rect').should('contain.text', 'PLAID');
	});

	it('leaves the brake live long enough to notice it and decide', () => {
		mountOverlay();
		stepTo(beatIndex(beat => beat.brake === 'visible'));
		cy.get('.ls-emergency-brake').should('be.visible');
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
			cy.wait(200).then(() => expect([...pending]).to.have.length(0));
		});
	});
});

describe('ludicrous speed overlay has no transport controls', () => {
	const removedKeys = ['ArrowRight', 'ArrowDown', 'n', 'f'];

	it('ignores the keys that used to scrub and fast-forward the sequence', () => {
		mountOverlay();
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

	it('a stale stored rate has no effect on the timing', () => {
		cy.window().then(win => win.localStorage.setItem('arenaswap.ludicrous.rate', '4'));
		mountOverlay();
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

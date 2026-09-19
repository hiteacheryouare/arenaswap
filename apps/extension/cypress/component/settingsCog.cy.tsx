import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';

const mountHeader = (interactive = true) => {
	cy.viewport(320, 560);
	cy.mount(
		<div className='popup-container'>
			<PopupHeader enabled interactive={interactive} onToggleEnabled={cy.stub()} onOpenSettings={cy.stub()} onStartTour={cy.stub()} />
		</div>,
	);
};

const glyphTransform = (selector: string) =>
	cy.get(selector).then(([icon]: JQuery<HTMLElement>) => getComputedStyle(icon, '::before').transform);

// A quarter turn, as the browser resolves it. Written out rather than recomputed from the angle,
// so a rule that stops applying cannot agree with an expectation derived from the same source.
const quarterTurn = 'matrix(0, 1, -1, 0, 0, 0)';

describe('the settings cog', () => {
	it('sits square until the button is reached', () => {
		mountHeader();
		glyphTransform('.bi-gear-fill').should('equal', 'none');
	});

	// Read through a retrying assertion rather than a one-shot `then`: the turn is a transition, so
	// the first frame after focus is still the identity matrix.
	it('turns a quarter when the button takes focus', () => {
		mountHeader();
		cy.get('.bi-gear-fill').parent().focus();
		cy.get('.bi-gear-fill').should(([icon]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(icon, '::before').transform).to.equal(quarterTurn);
		});
	});

	it('takes the turn slowly enough to be a turn rather than a jump', () => {
		mountHeader();
		cy.get('.bi-gear-fill').then(([icon]: JQuery<HTMLElement>) => {
			const before = getComputedStyle(icon, '::before');
			expect(before.transitionProperty).to.equal('transform');
			expect(parseFloat(before.transitionDuration)).to.be.greaterThan(0);
		});
	});

	// The two header buttons share `.popup-settings-icon`, so a rule hung on that class would spin
	// the help mark as well — which is a question mark, and a rotated question mark is a different
	// shape rather than the same one further round.
	it('leaves the help mark alone', () => {
		mountHeader();
		cy.get('.bi-question-circle').parent().focus();
		glyphTransform('.bi-question-circle').should('equal', 'none');
	});

	// Chrome's own media emulation, because a `prefers-reduced-motion` block cannot be exercised
	// from the page. The whole flourish is off rather than merely instant: a gear that snaps a
	// quarter turn under the pointer is motion too, and it is the motion this reader opted out of.
	it('holds still for a reader who asked for less motion', () => {
		cy.wrap(Cypress.automation('remote:debugger:protocol', {
			command: 'Emulation.setEmulatedMedia',
			params: { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
		}));
		mountHeader();
		cy.get('.bi-gear-fill').parent().focus();
		glyphTransform('.bi-gear-fill').should('equal', 'none');
		cy.then(() => Cypress.automation('remote:debugger:protocol', {
			command: 'Emulation.setEmulatedMedia',
			params: { features: [] },
		}));
	});

	// Addressed through the gear glyph rather than as the last `.popup-settings-button`: the header
	// carries a third button now, and an ordinal selector that meant the cog by accident would have
	// silently started asserting against that one instead.
	//
	// The website mounts this same header as a picture of the popup, with both buttons disabled — and
	// a disabled button still matches `:hover`. Focus is not a route in either direction there, so
	// the guard is checked as the rule's own selector against the two rendered states.
	it('stays inert on a header that is only being shown', () => {
		mountHeader(false);
		cy.get('.bi-gear-fill').parent().should(([button]: JQuery<HTMLElement>) => {
			expect(button.matches('.popup-settings-button:not(:disabled)')).to.equal(false);
		});
		mountHeader();
		cy.get('.bi-gear-fill').parent().should(([button]: JQuery<HTMLElement>) => {
			expect(button.matches('.popup-settings-button:not(:disabled)')).to.equal(true);
		});
	});

	// Transforms do not lay out, and the one here is on the pseudo-element rather than the `<i>`,
	// so nothing in the header may move under it.
	it('moves no part of the header with it', () => {
		mountHeader();
		cy.get('.bi-gear-fill').parent().then(([button]: JQuery<HTMLElement>) => {
			const resting = button.getBoundingClientRect();
			button.focus();
			const turned = button.getBoundingClientRect();
			expect(turned.x).to.equal(resting.x);
			expect(turned.width).to.equal(resting.width);
			expect(turned.height).to.equal(resting.height);
		});
	});
});

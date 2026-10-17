// The phone menu is Bootstrap's Drawer on a modal <dialog>. A synthetic Escape never reaches a
// dialog's own cancel, so the key goes through Chrome itself.
const pressEscape = () => {
	for (const type of ['keyDown', 'keyUp']) {
		cy.then(() => Cypress.automation('remote:debugger:protocol', {
			command: 'Input.dispatchKeyEvent',
			params: { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
		}));
	}
};

// Bootstrap ignores a close while the drawer is still opening, as a person never could, so the
// tests that close it wait for the open to finish first.
const openFully = () => {
	cy.get('#nav-drawer').then(([drawer]) => {
		drawer.addEventListener('shown.bs.drawer', () => drawer.setAttribute('data-test-shown', ''), { once: true });
	});
	cy.get('#nav-toggle').click();
	cy.get('#nav-drawer').should('have.attr', 'data-test-shown');
};

describe('the phone menu', () => {
	beforeEach(() => {
		cy.viewport(390, 844);
		cy.visit('/');
	});

	it('opens as a modal dialog hung under the bar', () => {
		cy.get('#nav-toggle').click();
		cy.get('#nav-toggle').should('have.attr', 'aria-expanded', 'true');
		cy.get('#nav-drawer').should('have.attr', 'open');
		cy.get('#nav-drawer').should(([drawer]) => {
			expect(drawer.matches(':modal')).to.equal(true);
			expect(drawer.getBoundingClientRect().top).to.equal(64);
		});
		cy.get('#nav-drawer a').first().should('be.visible');
	});

	it('closes on Escape and hands focus back to the button', () => {
		openFully();
		// Chrome sends the key to whichever frame has focus, and that starts out as Cypress's own.
		cy.window().then(win => win.focus());
		cy.get('#nav-drawer a').first().focus();
		pressEscape();
		cy.get('#nav-drawer').should('not.have.attr', 'open');
		cy.get('#nav-toggle').should('have.attr', 'aria-expanded', 'false').and('have.focus');
	});

	it('closes from the X in the bar', () => {
		openFully();
		cy.get('#nav-toggle').then(([toggle]) => {
			const box = toggle.getBoundingClientRect();
			cy.get('body').click(box.left + box.width / 2, box.top + box.height / 2);
		});
		cy.get('#nav-drawer').should('not.have.attr', 'open');
		cy.get('#nav-toggle').should('have.attr', 'aria-expanded', 'false');
	});
});

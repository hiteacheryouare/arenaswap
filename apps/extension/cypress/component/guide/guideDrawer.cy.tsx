// The sheet this spec is about. Already loaded globally by the support file, so this is for the
// dependency rather than the styles — and it makes the file a module, without which the JSX
// below compiles to a require() call and the spec fails before any test runs.
import '../../../assets/guide.scss';

const mountDrawer = (closing = false) => {
	cy.viewport(1280, 800);
	cy.mount(
		<div className='guide-page'>
			<div className='guide-main'>
				<div className='guide-scroller' />
				<dialog open className='guide-drawer' data-closing={closing ? 'true' : undefined}>
					<div className='popup-container'>detail</div>
				</dialog>
			</div>
		</div>,
	);
};

describe('the guide detail drawer', () => {
	it('fills the height of the tab rather than stopping at the popup frame', () => {
		mountDrawer();
		cy.get('.guide-drawer .popup-container').then(([inner]: JQuery<HTMLElement>) => {
			const height = inner.getBoundingClientRect().height;
			expect(height).to.be.greaterThan(560);
			const drawer = inner.closest('.guide-drawer')!.getBoundingClientRect();
			expect(Math.round(height)).to.equal(Math.round(drawer.height));
		});
	});

	it('keeps the width the detail screen is designed against', () => {
		mountDrawer();
		cy.get('.guide-drawer .popup-container').then(([inner]: JQuery<HTMLElement>) => {
			expect(Math.round(inner.getBoundingClientRect().width)).to.equal(320);
		});
	});

	it('slides in when it opens', () => {
		mountDrawer();
		cy.get('.guide-drawer').then(([drawer]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(drawer);
			expect(style.animationName).to.equal('guideDrawerIn');
			expect(parseFloat(style.animationDuration)).to.be.greaterThan(0);
		});
	});

	it('slides back out when it closes', () => {
		mountDrawer(true);
		cy.get('.guide-drawer').then(([drawer]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(drawer);
			expect(style.animationName).to.equal('guideDrawerOut');
			expect(parseFloat(style.animationDuration)).to.be.greaterThan(0);
			expect(style.animationFillMode).to.equal('forwards');
		});
	});

	// Off rather than instant: a panel that snaps across the screen is the motion the reader opted
	// out of. Chrome's own media emulation, since a media query cannot be exercised from the page.
	it('does not animate under reduced motion, opening or closing', () => {
		cy.wrap(Cypress.automation('remote:debugger:protocol', {
			command: 'Emulation.setEmulatedMedia',
			params: { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
		}));
		mountDrawer();
		cy.get('.guide-drawer').should(([drawer]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(drawer).animationName).to.equal('none');
		});
		mountDrawer(true);
		cy.get('.guide-drawer').should(([drawer]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(drawer).animationName).to.equal('none');
		});
		cy.then(() => Cypress.automation('remote:debugger:protocol', {
			command: 'Emulation.setEmulatedMedia',
			params: { features: [] },
		}));
	});
});

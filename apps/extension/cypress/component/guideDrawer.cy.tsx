// The sheet this spec is about. Already loaded globally by the support file, so this is for the
// dependency rather than the styles — and it makes the file a module, without which the JSX
// below compiles to a require() call and the spec fails before any test runs.
import '../../assets/guide.scss';

// The drawer is markup in the guide's own app shell rather than a component of its own, so what is
// worth pinning is the stylesheet contract it depends on — which is where both of its defects were.
const mountDrawer = (closing = false) => {
	cy.viewport(1280, 800);
	cy.mount(
		<div className='guide-page'>
			<div className='guide-main'>
				<div className='guide-scroller' />
				<aside className='guide-drawer' data-closing={closing ? 'true' : undefined}>
					<div className='popup-container'>detail</div>
				</aside>
			</div>
		</div>,
	);
};

describe('the guide detail drawer', () => {
	// The detail screen is a hard 320x560. 320 is the width it is laid out against and is kept; 560
	// is the popup's frame rather than anything about the content, and left alone it leaves a band
	// of empty surface under the detail in a full browser tab.
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

	// The exit is a different keyframe rather than the entry reversed, and it has `forwards` so the
	// panel stays off screen for the frame between the animation ending and React unmounting it.
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

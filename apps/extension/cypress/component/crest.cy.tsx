// The three states are driven by CSS off `data-crest-state`, so this spec loads the real
// stylesheets and measures boxes: the point of the component is that the placeholder occupies
// exactly the image's footprint, and that is not something the markup alone can show.
import { useState } from 'react';
import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import Crest from '@arenaswap/ui/src/components/crest';

const loadableLogo = `data:image/svg+xml,${encodeURIComponent(
	"<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><circle cx='32' cy='32' r='30' fill='#004C54'/></svg>",
)}`;

// Declares itself a PNG and is not one, so the decode fails rather than the request.
const brokenLogo = 'data:image/png;base64,bm90YXBuZw==';

const slowLogo = () => `/crest-test/${Cypress._.uniqueId('logo')}.png`;

const stallRequest = (url: string) => {
	cy.intercept('GET', url, {
		delay: 20000,
		statusCode: 200,
		headers: { 'content-type': 'image/svg+xml' },
		body: "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'/>",
	});
};

describe('Crest', () => {
	it('shows the placeholder while the logo is still in flight', () => {
		const url = slowLogo();
		stallRequest(url);
		cy.mount(<Crest logo={url} abbreviation='PHI' className='team-crest' />);

		cy.get('.crest').should('have.attr', 'data-crest-state', 'pending');
		cy.get('.crest-fallback').should('be.visible').and('have.text', 'PHI');
	});

	it('hides the placeholder once the logo lands', () => {
		cy.mount(<Crest logo={loadableLogo} abbreviation='PHI' className='team-crest' />);

		cy.get('.crest').should('have.attr', 'data-crest-state', 'loaded');
		cy.get('.crest-fallback').should('not.be.visible');
		cy.get('.crest img').should('be.visible');
	});

	it('keeps the placeholder up and drops the image when the logo never decodes', () => {
		cy.mount(<Crest logo={brokenLogo} abbreviation='PHI' className='team-crest' />);

		cy.get('.crest').should('have.attr', 'data-crest-state', 'failed');
		cy.get('.crest-fallback').should('be.visible').and('have.text', 'PHI');
		cy.get('.crest img').should('not.be.visible');
	});

	it('shows the placeholder for a team with no logo at all', () => {
		cy.mount(<Crest abbreviation='PHI' className='team-crest' />);

		cy.get('.crest').should('have.attr', 'data-crest-state', 'missing');
		cy.get('.crest-fallback').should('be.visible');
		cy.get('.crest img').should('not.exist');
	});

	// The docs site hydrates its islands after the page has loaded, so `load` has already fired and
	// been discarded by the time React attaches a handler. Without the mount-time `complete` check
	// the crest would sit at `pending` for good, showing a placeholder behind a loaded logo.
	it('settles a logo that finished loading before the handler was attached', () => {
		cy.window().then(win => new Promise<void>(resolve => {
			const warm = new win.Image();
			warm.addEventListener('load', () => resolve(), { once: true });
			warm.src = loadableLogo;
		}));
		cy.mount(<Crest logo={loadableLogo} abbreviation='PHI' className='team-crest' />);

		cy.get('.crest').should('have.attr', 'data-crest-state', 'loaded');
	});

	// A failure is remembered against the URL that failed, not as a flag. League marks start on a
	// hardcoded URL and move to ESPN's once the live list arrives, and a flag would hide the good one.
	it('retries when the URL changes after a failure', () => {
		const Harness = () => {
			const [logo, setLogo] = useState(brokenLogo);
			return (
				<>
					<Crest logo={logo} abbreviation='PHI' className='team-crest' />
					<button type='button' onClick={() => setLogo(loadableLogo)}>swap</button>
				</>
			);
		};
		cy.mount(<Harness />);

		cy.get('.crest').should('have.attr', 'data-crest-state', 'failed');
		cy.contains('button', 'swap').click();
		cy.get('.crest').should('have.attr', 'data-crest-state', 'loaded');
	});

	it('holds the same box in every state', () => {
		const url = slowLogo();
		stallRequest(url);
		cy.mount(
			<>
				<Crest logo={url} abbreviation='PHI' className='team-crest' />
				<Crest logo={loadableLogo} abbreviation='PHI' className='team-crest' />
				<Crest logo={brokenLogo} abbreviation='PHI' className='team-crest' />
				<Crest abbreviation='PHI' className='team-crest' />
			</>,
		);

		cy.get('.crest').should('have.length', 4).each($crest => {
			const box = $crest[0].getBoundingClientRect();
			expect(box.width).to.equal(64);
			expect(box.height).to.equal(64);
		});
		cy.get('[data-crest-state="pending"] .crest-fallback').then($fallback => {
			const box = $fallback[0].getBoundingClientRect();
			expect(box.width).to.equal(64);
			expect(box.height).to.equal(64);
		});
	});

	it('omits the placeholder entirely when asked to, and still holds its box', () => {
		const url = slowLogo();
		stallRequest(url);
		cy.mount(<Crest logo={url} abbreviation='PHI' className='gd-bar-logo' fallback='none' />);

		cy.get('.crest-fallback').should('not.exist');
		cy.get('.crest').then($crest => {
			expect($crest[0].getBoundingClientRect().width).to.equal(18);
		});
	});

	it('names itself only when nothing else does', () => {
		cy.mount(<Crest logo={loadableLogo} abbreviation='PHI' label='Philadelphia Eagles' className='team-crest' />);
		cy.get('.crest').should('have.attr', 'role', 'img').and('have.attr', 'aria-label', 'Philadelphia Eagles');
		cy.get('.crest img').should('have.attr', 'alt', '');

		cy.mount(<Crest logo={loadableLogo} abbreviation='PHI' className='team-crest' />);
		cy.get('[role="img"]').should('not.exist');
	});
});

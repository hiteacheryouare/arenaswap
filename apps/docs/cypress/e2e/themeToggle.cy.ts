import { contrast, luminance, toRgb } from '../colour';

// The site follows the OS until a visitor picks a theme in the nav, and the head's boot script
// decides before the first paint. Colours are read off computed styles: a theme that sets the right
// attribute and paints the wrong surface is the failure that matters here, and a DOM check misses it.

const emulateScheme = (scheme: 'light' | 'dark') => {
	cy.then(() => Cypress.automation('remote:debugger:protocol', {
		command: 'Emulation.setEmulatedMedia',
		params: { features: [{ name: 'prefers-color-scheme', value: scheme }] },
	}));
};

const white = 'rgb(255, 255, 255)';
const darkPage = 'rgb(0, 0, 0)';
const darkCard = 'rgb(13, 13, 13)';

const expectTheme = (theme: 'light' | 'dark') => {
	cy.get('html').should('have.attr', 'data-bs-theme', theme);
	cy.get('body').should('have.css', 'background-color', theme === 'light' ? white : darkPage);
};

describe('the site theme', () => {
	afterEach(() => emulateScheme('dark'));

	it('follows the OS when nothing is stored', () => {
		emulateScheme('light');
		cy.visit('/');
		expectTheme('light');
		cy.get('meta[name="theme-color"]').should('have.attr', 'content', '#ffffff');

		emulateScheme('dark');
		cy.visit('/');
		expectTheme('dark');
	});

	it('steps to the opposite of the OS first, and back to the OS last', () => {
		emulateScheme('dark');
		cy.visit('/');
		cy.get('[data-theme-toggle]').should('have.attr', 'aria-label', 'Theme: Match my system');

		cy.get('[data-theme-toggle]').click();
		expectTheme('light');
		cy.get('[data-theme-toggle]').should('have.attr', 'aria-label', 'Theme: Light');

		cy.get('[data-theme-toggle]').click();
		expectTheme('dark');
		cy.get('[data-theme-toggle]').should('have.attr', 'aria-label', 'Theme: Dark');

		cy.get('[data-theme-toggle]').click();
		expectTheme('dark');
		cy.get('[data-theme-toggle]').should('have.attr', 'aria-label', 'Theme: Match my system');
	});

	it('keeps a stored choice over the OS across a reload, from the first paint', () => {
		emulateScheme('dark');
		cy.visit('/');
		cy.get('[data-theme-toggle]').click();
		expectTheme('light');

		// Read before any bundle runs: only the inline boot script can have set it by then.
		cy.visit('/faq/', {
			onBeforeLoad: win => {
				win.document.addEventListener('readystatechange', () => {
					if (win.document.readyState === 'interactive') win.document.documentElement.dataset.themeAtParse = win.document.documentElement.dataset.bsTheme;
				});
			},
		});
		cy.get('html').should('have.attr', 'data-theme-at-parse', 'light');
		expectTheme('light');
	});

	it('swaps the footer to the black marks and keeps the popup demos dark', () => {
		emulateScheme('light');
		cy.visit('/');
		cy.get('.footer-arenaswap-mark:visible').should('have.length', 1).and('have.attr', 'src').and('include', 'full_logo_black');
		cy.get('.latticeco-mark:visible').should('have.length', 1).and('have.attr', 'src').and('include', 'lattice-rosette-black');

		cy.get('.settings-panel-demo').should('have.css', 'background-color', darkCard);
		cy.get('.browser-popup .popup-section-title').should($title => {
			const [red] = getComputedStyle($title[0]).color.match(/\d+/g)!.map(Number);
			expect(red, 'popup ink stays light').to.be.greaterThan(180);
		});
	});

	it('puts the Bootstrap surfaces the dark page re-themed on light ones', () => {
		emulateScheme('light');
		cy.visit('/de/docs/extension/getting-started/');
		cy.get('.untranslated-notice').should($notice => {
			const surface = getComputedStyle($notice[0]).backgroundColor;
			expect(luminance(surface), 'a light surface').to.be.greaterThan(0.6);
			$notice.find('p').each((_, line) => {
				const style = getComputedStyle(line);
				const ink = toRgb(style.color);
				const ground = toRgb(surface);
				const opacity = Number(style.opacity);
				const seen = `rgb(${ink.map((channel, index) => ground[index]! + (channel - ground[index]!) * opacity).join(', ')})`;
				expect(contrast(surface, seen), `${line.className} contrast`).to.be.greaterThan(4.5);
			});
		});

		cy.get('.lang-switch-trigger').click();
		cy.get('.lang-switch-menu').should('have.css', 'background-color', 'rgb(245, 245, 245)');
		cy.get('.lang-switch-menu .menu-item:not(.active)').first().should($item => {
			const style = getComputedStyle($item[0]);
			expect(contrast('rgb(245, 245, 245)', style.color), 'menu item contrast').to.be.greaterThan(4.5);
		});
	});
});

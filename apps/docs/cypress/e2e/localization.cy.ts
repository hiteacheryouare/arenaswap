// What a browser can answer and a unit test cannot: whether the twelve languages fit the layout
// they were written for, and whether a visit stays in the language it started in.
//
// The string bundles themselves are guarded at build time — src/i18n/ui.ts throws on any locale
// whose shape has drifted from en.json — so nothing here re-checks that a key exists.

const locales = ['de', 'es', 'fil', 'fr', 'it', 'ja', 'ko', 'pt-BR', 'pt-PT', 'zh-CN', 'zh-TW'];
const everyLocale = ['', ...locales.map(locale => `${locale}/`)];

// 992px is where the desktop links appear. Anything that overflows, overflows here first.
const navWidths = [992, 1280];

const readRow = () =>
	cy.get('.nav-row').then($row => ({
		row: $row[0].getBoundingClientRect(),
		logo: $row.find('.nav-logo')[0].getBoundingClientRect(),
		links: $row.find('.nav-desktop-links')[0].getBoundingClientRect(),
		end: $row.find('.nav-end')[0].getBoundingClientRect(),
	}));

describe('the navigation fits every language', () => {
	everyLocale.forEach(locale => {
		it(`does not collide at 992 or 1280: /${locale}`, () => {
			navWidths.forEach(width => {
				cy.viewport(width, 900);
				cy.visit(`/${locale}`);
				cy.get('.nav-desktop-links a').should('be.visible');

				readRow().then(({ row, logo, links, end }) => {
					expect(logo.right, `logo clear of the links at ${width}`).to.be.lessThan(links.left + 1);
					expect(links.right, `links clear of the call to action at ${width}`).to.be.lessThan(end.left + 1);
					expect(end.right, `nothing past the right edge at ${width}`).to.be.lessThan(row.right + 1);
				});

				// A wrapped navigation link reads as a layout bug rather than as a long word. This is
				// what caught Spanish and both Portuguese locales expanding FAQ to a two-word phrase.
				cy.get('.nav-desktop-links a').each($link => {
					const style = window.getComputedStyle($link[0]);
					const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.5;
					expect($link[0].getBoundingClientRect().height, 'link stayed on one line')
						.to.be.lessThan(lineHeight + 14);
				});
			});
		});
	});
});

describe('the install button holds its label', () => {
	everyLocale.forEach(locale => {
		// The browser name is substituted in at runtime, so the longest real label is a language's
		// own sentence wrapped around "Google Chrome" rather than anything in the string bundle.
		it(`stays on one line: /${locale}`, () => {
			cy.viewport(1280, 900);
			cy.visit(`/${locale}`);
			cy.get('.hero-actions [data-install-cta]').then($cta => {
				expect($cta[0].getBoundingClientRect().height, 'call to action stayed one line')
					.to.be.lessThan(60);
			});
		});
	});
});

describe('a visit stays in the language it started in', () => {
	locales.forEach(locale => {
		// Three hops deep, through the documentation, which is the tree that is not translated and
		// therefore the one that used to drop you back into English along with the whole chrome.
		it(`survives the documentation in ${locale}`, () => {
			cy.viewport(1280, 900);
			cy.visit(`/${locale}/`);

			cy.get('.nav-desktop-links a').each($link => {
				expect($link[0].getAttribute('href'), 'navigation link keeps the locale')
					.to.match(new RegExp(`^/arenaswap/${locale}/`));
			});

			cy.get('.nav-desktop-links a').eq(2).click();
			cy.location('pathname').should('eq', `/arenaswap/${locale}/docs/`);
			cy.get('html').should('have.attr', 'lang', locale);
			cy.get('.untranslated-notice').should('be.visible');

			cy.get('.docs-hub-list a').first().click();
			cy.location('pathname').should('match', new RegExp(`^/arenaswap/${locale}/docs/`));

			cy.get('.docs-nav a').eq(3).click();
			cy.location('pathname').should('match', new RegExp(`^/arenaswap/${locale}/docs/`));
			cy.get('html').should('have.attr', 'lang', locale);
			cy.get('.untranslated-notice').should('be.visible');

			cy.get('footer .footer-links a').each($link => {
				const href = $link[0].getAttribute('href') ?? '';
				if (href.startsWith('/arenaswap/')) {
					expect(href, 'footer link keeps the locale').to.match(new RegExp(`^/arenaswap/${locale}/`));
				}
			});
		});
	});

	it('leaves the English pages on their own URLs, with no notice', () => {
		cy.visit('/docs/extension/getting-started/');
		cy.get('html').should('have.attr', 'lang', 'en');
		cy.get('.untranslated-notice').should('not.exist');
	});

	// An untranslated page announces no alternates, because an alternate announces a translation.
	it('points an untranslated page at the English original', () => {
		cy.request('/de/docs/extension/getting-started/').its('body').then((html: string) => {
			expect(html).to.contain('<link rel="canonical" href="https://hiteacheryouare.github.io/arenaswap/docs/extension/getting-started/"');
			expect(html).not.to.contain('<link rel="alternate" hreflang');
		});
	});

	it('announces all twelve alternates on a translated page', () => {
		cy.request('/de/faq/').its('body').then((html: string) => {
			const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([a-zA-Z-]+)"/g)].map(match => match[1]);
			expect(alternates).to.have.members([...locales, 'en', 'x-default']);
			expect(html).to.contain('<link rel="canonical" href="https://hiteacheryouare.github.io/arenaswap/de/faq/"');
		});
	});
});

describe('the language switcher', () => {
	it('lists twelve languages and marks the current one', () => {
		cy.visit('/');
		cy.get('.lang-switch-trigger').click();
		cy.get('.lang-switch-menu').should('be.visible');
		cy.get('.lang-switch-menu .dropdown-item').should('have.length', 12);
		cy.get('.lang-switch-menu .dropdown-item.active').should('contain.text', 'English');
		cy.get('.lang-switch-menu').then($menu => {
			const rect = $menu[0].getBoundingClientRect();
			expect(rect.right, 'menu inside the viewport').to.be.lessThan(1281);
			expect(rect.bottom, 'menu inside the viewport').to.be.lessThan(901);
		});
	});

	// Bootstrap 5.3 builds these out of tokens this theme never overrode, so both were the light
	// defaults: hovering an item put light ink on #f8f9fa, and the active item was white on $primary
	// at 3.22:1. Read off the computed style, because that is the only place the answer lives. The
	// menu is the v3 raised surface and the current language sits on the pressed wash, in ink.
	it('is themed for a dark page rather than left on Bootstrap defaults', () => {
		cy.visit('/');
		cy.get('.lang-switch-trigger').click();
		cy.get('.lang-switch-menu').should('have.css', 'background-color', 'rgb(34, 38, 45)');
		cy.get('.lang-switch-menu .dropdown-item.active')
			.should('have.css', 'color', 'rgb(243, 245, 247)')
			.and('have.css', 'background-color', 'rgba(243, 245, 247, 0.1)');
	});

	it('keeps your place when you change language', () => {
		cy.visit('/legal/privacy/');
		cy.get('.lang-switch-trigger').click();
		cy.get('.lang-switch-menu .dropdown-item').eq(1).click();
		cy.location('pathname').should('eq', '/arenaswap/de/legal/privacy/');
		cy.get('html').should('have.attr', 'lang', 'de');
	});

	it('keeps your place on a page that was never translated', () => {
		cy.visit('/docs/extension/getting-started/');
		cy.get('.lang-switch-note').should('not.exist');
		cy.get('.lang-switch-trigger').click();
		cy.get('.lang-switch-menu .dropdown-item').eq(1).click();
		cy.location('pathname').should('eq', '/arenaswap/de/docs/extension/getting-started/');
	});

	// The 404 is the one page GitHub Pages can only serve one copy of — it answers every unknown URL
	// under the base with that file — so it is the only place the switcher falls back to a home page.
	it('sends the 404 to each locale home, and says why', () => {
		cy.visit('/404.html');
		cy.get('.lang-switch-trigger').click();
		cy.get('.lang-switch-menu .lang-switch-note').should('be.visible');
		cy.get('.lang-switch-menu .dropdown-item').eq(1).should('have.attr', 'href', '/arenaswap/de/');
	});

	it('is a plain list in the drawer, where a nested dropdown would open twice', () => {
		cy.viewport(390, 844);
		cy.visit('/');
		cy.get('.lang-switch').should('not.be.visible');
		cy.get('#nav-toggle').click();
		cy.get('.lang-switch-list a').should('have.length', 12);
		cy.get('.lang-switch-list').then($list => {
			expect($list[0].getBoundingClientRect().right, 'inside the viewport').to.be.lessThan(391);
		});
	});
});

describe('the untranslated notice', () => {
	// Bootstrap computes a light and a dark set of the -bg-subtle tokens and this site sets no
	// colour mode, so an unthemed alert is a pale slab on the dark page. It is drawn on the v3 surface.
	it('is a Bootstrap alert that reads on the dark page', () => {
		cy.visit('/de/docs/extension/getting-started/');
		cy.get('.untranslated-notice')
			.should('have.class', 'alert')
			.and('have.css', 'background-color', 'rgb(26, 29, 34)')
			.and('have.css', 'color', 'rgb(196, 203, 212)');
	});

	it('names the language it is written in, in every locale', () => {
		locales.forEach(locale => {
			cy.visit(`/${locale}/docs/`);
			cy.get('.untranslated-notice-heading').should('not.be.empty');
			cy.get('.untranslated-notice-body').should('not.be.empty');
			cy.get('.untranslated-notice').then($notice => {
				expect($notice[0].getBoundingClientRect().width, 'notice inside the reading column')
					.to.be.lessThan(1281);
			});
		});
	});
});

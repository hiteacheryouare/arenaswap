// Where the install button sends people, which is the only thing this whole site is for.
//
// The detection is an inline script in Shell.astro: it reads the user agent, picks a store, and
// rewrites the call to action in place. Getting it wrong sends a Firefox visitor to the Chrome Web
// Store, where there is nothing they can install, and nothing about that page says so. The script
// runs before anything else on the page, so the agent has to be in place before the document is,
// which is what `onBeforeLoad` is for.

const chromeWebStore = 'https://chromewebstore.google.com/detail/arenaswap/gibojibgihombdmmfnhnimajppamfeee';
const firefoxAddons = 'https://addons.mozilla.org/addon/arenaswap/';
const edgeAddons = 'https://microsoftedge.microsoft.com/addons/detail/arenaswap/oeballpnidkinkcbjokogdgjckdjeeba';

const chromeAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const firefoxAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:132.0) Gecko/20100101 Firefox/132.0';
const edgeAgent = `${chromeAgent} Edg/140.0.0.0`;
const operaAgent = `${chromeAgent} OPR/115.0.0.0`;
const vivaldiAgent = `${chromeAgent} Vivaldi/7.0.3495.11`;
const safariAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

interface Pretend {
	agent?: string;
	brave?: boolean;
}

const visitAs = (url: string, { agent = chromeAgent, brave = false }: Pretend) => {
	cy.visit(url, {
		onBeforeLoad: win => {
			Object.defineProperty(win.navigator, 'userAgent', { value: agent, configurable: true });
			// Brave exposes an object here and no mark of its own in the agent string, which is the
			// only reason the check is shaped differently from the others.
			if (brave) Object.defineProperty(win.navigator, 'brave', { value: {}, configurable: true });
		},
	});
};

describe('the install button points at a store the visitor can install from', () => {
	const cases: { name: string; pretend: Pretend; href: string; label: string }[] = [
		{ name: 'Chrome', pretend: { agent: chromeAgent }, href: chromeWebStore, label: 'Chrome' },
		{ name: 'Firefox', pretend: { agent: firefoxAgent }, href: firefoxAddons, label: 'Firefox' },
		{ name: 'Edge', pretend: { agent: edgeAgent }, href: edgeAddons, label: 'Edge' },
		// The Chromium forks install from the Chrome Web Store but are named for themselves, because
		// "Add to Chrome" in a Brave window reads as the wrong button.
		{ name: 'Brave', pretend: { agent: chromeAgent, brave: true }, href: chromeWebStore, label: 'Brave' },
		{ name: 'Opera', pretend: { agent: operaAgent }, href: chromeWebStore, label: 'Opera' },
		{ name: 'Vivaldi', pretend: { agent: vivaldiAgent }, href: chromeWebStore, label: 'Vivaldi' },
		// Anything unrecognised gets the Chrome Web Store, which is the largest catalogue and the
		// only honest guess.
		{ name: 'Safari', pretend: { agent: safariAgent }, href: chromeWebStore, label: 'Chrome' },
	];

	cases.forEach(({ name, pretend, href, label }) => {
		it(`sends ${name} to the right store, on every call to action on the page`, () => {
			visitAs('/', pretend);

			// Three of them render on the home page: the navigation bar, the drawer and the hero.
			cy.get('[data-install-cta]').should('have.length.at.least', 3);
			cy.get('[data-install-cta]').each($cta => {
				expect($cta.attr('href'), `${name} call to action target`).to.equal(href);
				expect($cta.text(), `${name} call to action label`).to.contain(label);
			});
		});
	});

	// `applyAlternates` fills the two links in document order from a list that is always
	// [the other two stores], so the name written into each link has to match the store behind it.
	// A visitor who clicks "Edge" and lands on addons.mozilla.org has been lied to.
	it('names each alternate store after the store it links to', () => {
		visitAs('/', { agent: chromeAgent });

		cy.get('[data-install-alternate]').should('have.length', 2);
		cy.get('[data-install-alternate]').each($link => {
			const expected = $link.text().trim() === 'Firefox' ? firefoxAddons : edgeAddons;
			expect($link.attr('href'), `${$link.text().trim()} alternate target`).to.equal(expected);
		});
	});

	it('offers the other two stores, never the one you are already on', () => {
		visitAs('/', { agent: firefoxAgent });

		cy.get('[data-install-alternate]').then($links => {
			const targets = [...$links].map(link => link.getAttribute('href'));
			expect(targets, 'Firefox is not offered to a Firefox visitor').to.not.include(firefoxAddons);
			expect(targets).to.have.members([chromeWebStore, edgeAddons]);
		});
	});

	// The browser name is a proper noun and is not translated, but the sentence around it is, and
	// several languages do not put the name last. The script substitutes into the locale's own
	// template rather than concatenating, and this is the only place that is checked.
	it('writes the browser name into the language of the page', () => {
		visitAs('/', { agent: firefoxAgent });
		cy.get('[data-install-cta]').first().invoke('text').then(english => {
			visitAs('/ja/', { agent: firefoxAgent });
			cy.get('[data-install-cta]').first().invoke('text').then(japanese => {
				expect(japanese, 'the Japanese page still names the browser').to.contain('Firefox');
				expect(japanese.trim(), 'the Japanese page did not fall back to English').to.not.equal(english.trim());
			});
		});
	});
});

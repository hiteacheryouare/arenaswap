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
		{ name: 'Brave', pretend: { agent: chromeAgent, brave: true }, href: chromeWebStore, label: 'Brave' },
		{ name: 'Opera', pretend: { agent: operaAgent }, href: chromeWebStore, label: 'Opera' },
		{ name: 'Vivaldi', pretend: { agent: vivaldiAgent }, href: chromeWebStore, label: 'Vivaldi' },
		{ name: 'Safari', pretend: { agent: safariAgent }, href: chromeWebStore, label: 'Chrome' },
	];

	cases.forEach(({ name, pretend, href, label }) => {
		it(`sends ${name} to the right store, on every call to action on the page`, () => {
			visitAs('/', pretend);

			cy.get('[data-install-cta]').should('have.length.at.least', 3);
			cy.get('[data-install-cta]').each($cta => {
				expect($cta.attr('href'), `${name} call to action target`).to.equal(href);
				expect($cta.text(), `${name} call to action label`).to.contain(label);
			});
		});
	});

	it('names each alternate store after the store it links to', () => {
		visitAs('/', { agent: chromeAgent });

		cy.get('.hero-actions-alt').should('have.length', 2).each($row => {
			expect($row.find('[data-install-alternate]'), 'alternates in one row').to.have.length(2);
		});
		cy.get('[data-install-alternate]').each($link => {
			const expected = $link.text().trim() === 'Firefox' ? firefoxAddons : edgeAddons;
			expect($link.attr('href'), `${$link.text().trim()} alternate target`).to.equal(expected);
		});
	});

	it('offers the other two stores, never the one you are already on', () => {
		visitAs('/', { agent: firefoxAgent });

		cy.get('.hero-actions-alt').each($row => {
			const targets = [...$row.find('[data-install-alternate]')].map(link => link.getAttribute('href'));
			expect(targets, 'Firefox is not offered to a Firefox visitor').to.not.include(firefoxAddons);
			expect(targets).to.have.members([chromeWebStore, edgeAddons]);
		});
	});

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

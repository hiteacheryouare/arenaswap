import type { SiteReport } from '../siteCrawl';

describe('the built site holds together', () => {
	let report: SiteReport;

	before(() => {
		cy.task<SiteReport>('crawlSite').then(result => { report = result; });
	});

	it('has no internal link pointing at a page that was not built', () => {
		const described = report.brokenLinks.map(link =>
			`${link.target} <- ${link.from.slice(0, 3).join(', ')}${link.from.length > 3 ? ` (+${link.from.length - 3} more)` : ''}`,
		);
		expect(described, 'every href and src under the base path resolves').to.deep.equal([]);
	});

	it('declares the language of the URL it was built for, on every page', () => {
		expect(report.langMismatches, 'html lang matches the locale segment').to.deep.equal([]);
	});

	it('renders no raw translation key as visible text', () => {
		expect(report.leakedKeys, 'no dotted key shapes in the rendered text').to.deep.equal([]);
	});

	it('lists every public page in the sitemap, and nothing that was not built', () => {
		expect(report.sitemapMissing, 'built page absent from the sitemap').to.deep.equal([]);
		expect(report.sitemapUnreachable, 'sitemap entry with no page behind it').to.deep.equal([]);
		expect(report.sitemapNotCanonical, 'sitemap entry whose page names another URL as canonical').to.deep.equal([]);
	});

	it('builds the same page in all twelve languages', () => {
		expect(report.localeGaps, 'every locale has the same set of pages as English').to.deep.equal([]);
	});
});

describe('the site answers the URLs a visitor can reach it by', () => {
	it('does not build a page for a locale it does not ship', () => {
		cy.request({ url: '/xx/', failOnStatusCode: false }).its('status').should('eq', 404);
		cy.request({ url: '/en/', failOnStatusCode: false }).its('status').should('eq', 404);
	});

	it('still answers the URLs it has retired', () => {
		const retired = [
			['blog/', '/arenaswap/releases/'],
			['blog/introducing-v2/', '/arenaswap/releases/2.0.0/'],
			['credits/', '/arenaswap/legal/credits/'],
		];

		retired.forEach(([from, to]) => {
			cy.request(`/${from}`).its('body').should('contain', `url=${to}`);
		});
	});

	it('serves the release feed as XML with an entry per release', () => {
		cy.request('/releases/rss.xml').then(response => {
			expect(response.headers['content-type']).to.contain('xml');
			const items = [...(response.body as string).matchAll(/<item>/g)];
			expect(items.length, 'one item per release note').to.be.greaterThan(0);
			expect(response.body).to.contain('<link>https://hiteacheryouare.github.io/arenaswap/releases/');
		});
	});
});

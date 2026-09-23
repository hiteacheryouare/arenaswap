import type { SiteReport } from '../siteCrawl';

// Whole-site checks against the finished build, rather than against the handful of pages the other
// specs happen to open. 358 pages went out the door the last time anybody deployed; these are the
// failures that would have shipped quietly, in twelve languages at once, with nothing on screen to
// say anything was wrong.
//
// The walk happens in the plugin process (cypress/siteCrawl.ts) over the same directory the static
// server is serving. One `cy.task`, then assertions on what came back.

describe('the built site holds together', () => {
	let report: SiteReport;

	before(() => {
		cy.task<SiteReport>('crawlSite').then(result => { report = result; });
	});

	// A renamed page still 404s from the footer of every other page, in every language, and the
	// build says nothing. This is the one that catches it.
	it('has no internal link pointing at a page that was not built', () => {
		const described = report.brokenLinks.map(link =>
			`${link.target} <- ${link.from.slice(0, 3).join(', ')}${link.from.length > 3 ? ` (+${link.from.length - 3} more)` : ''}`,
		);
		expect(described, 'every href and src under the base path resolves').to.deep.equal([]);
	});

	// Astro's i18n routing hands `Astro.currentLocale` to the layout, and the layout puts it on
	// <html lang>. A page that slips out of the `[...locale]` tree gets English chrome and tells a
	// screen reader and a translation engine the wrong language, which no rendering shows.
	it('declares the language of the URL it was built for, on every page', () => {
		expect(report.langMismatches, 'html lang matches the locale segment').to.deep.equal([]);
	});

	// `islandTranslator` renders a missing key as the key itself rather than throwing, so a rename
	// in @arenaswap/ui puts `main.sectionActiveLiveTabs` on the page where a heading belongs. The
	// build stays green and the screenshot looks broken.
	it('renders no raw translation key as visible text', () => {
		expect(report.leakedKeys, 'no dotted key shapes in the rendered text').to.deep.equal([]);
	});

	it('lists every public page in the sitemap, and nothing that was not built', () => {
		expect(report.sitemapMissing, 'built page absent from the sitemap').to.deep.equal([]);
		expect(report.sitemapUnreachable, 'sitemap entry with no page behind it').to.deep.equal([]);
	});

	// Twelve locales, one page tree. A locale that falls a page behind is invisible until somebody
	// reading in that language follows a link that only exists in English.
	it('builds the same page in all twelve languages', () => {
		expect(report.localeGaps, 'every locale has the same set of pages as English').to.deep.equal([]);
	});
});

// The rest goes through the server, because these are answers the filesystem does not have.
describe('the site answers the URLs a visitor can reach it by', () => {
	// GitHub Pages serves 404.html for anything unknown under the base, and Astro's `manual`
	// routing means an unrecognised first segment is simply not a page. Worth pinning: the rest
	// parameter matches anything, and a change that let it match `xx` would build 358 more pages.
	it('does not build a page for a locale it does not ship', () => {
		cy.request({ url: '/xx/', failOnStatusCode: false }).its('status').should('eq', 404);
		cy.request({ url: '/en/', failOnStatusCode: false }).its('status').should('eq', 404);
	});

	// Published URLs that were retired rather than deleted. A visitor following a two-year-old link
	// should land on the page that replaced it, not on the 404.
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

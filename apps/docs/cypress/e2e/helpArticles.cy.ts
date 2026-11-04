import { localeCodes } from '../../src/i18n/locales';

// The help and PowerScore docs read as a book: a sidebar listing every article and Previous / Next
// links at the foot of each. Both are generated from each article's `order`, so two articles sharing
// a number, or a new one slotted in badly, leave a page that Next skips or visits twice while every
// link on the site still resolves.

interface navLink {
	href: string;
	label: string;
}

const sidebarLinks = (section: string) => cy.get('nav.docs-nav').then($nav => {
	const heading = $nav.find(`h2 a[href$="/docs/${section}/"]`).closest('h2');
	return heading.next('ul').find('a').toArray().map(link => ({
		href: new URL((link as HTMLAnchorElement).href).pathname,
		label: link.textContent!.trim(),
	}));
});

// The adjacent article's path, or '' at the end of the section.
const adjacent = (which: 'previous' | 'next'): Cypress.Chainable<string> => cy.document().then(doc => {
	const link = [...doc.querySelectorAll<HTMLAnchorElement>('nav.docs-adjacent a')]
		.find(anchor => anchor.classList.contains('docs-adjacent-next') === (which === 'next'));
	return cy.wrap(link ? new URL(link.href).pathname : '', { log: false });
});

const walk = (from: string, which: 'previous' | 'next', visited: string[] = []): Cypress.Chainable<string[]> => {
	cy.visit(from.replace(/^\/arenaswap\//, ''));
	return adjacent(which).then((onward): Cypress.Chainable<string[]> => {
		const seen = [...visited, from];
		if (!onward || seen.length > 40) return cy.wrap(seen, { log: false });
		return walk(onward, which, seen);
	});
};

describe('reading the docs from start to finish', () => {
	for (const section of ['extension', 'powerscore']) {
		it(`reaches every ${section} article the sidebar lists with Next, once each, and Previous walks it back`, () => {
			cy.visit(`docs/${section}/`);
			sidebarLinks(section).then((listed: navLink[]) => {
				const listedPaths = listed.map(link => link.href);
				walk(listedPaths[0]!, 'next').should('deep.equal', listedPaths);
				walk(listedPaths.at(-1)!, 'previous').should('deep.equal', listedPaths.toReversed());
			});
		});
	}
});

// The questions are there for search: FAQPage structured data is what earns the expandable answers
// under a search result. If it drifts from what the page shows, the result quotes an answer the page
// no longer gives, and nothing on screen looks wrong.
const faqOnPage = (doc: Document) => [...doc.querySelectorAll('details.faq-item')].map(item => ({
	q: item.querySelector('summary')!.textContent!.trim(),
	a: item.querySelector('.accordion-body')!.textContent!.trim(),
}));

const faqInData = (doc: Document) => [...doc.querySelectorAll('script[type="application/ld+json"]')]
	.map(script => JSON.parse(script.textContent!) as { '@type': string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] })
	.filter(data => data['@type'] === 'FAQPage')
	.flatMap(data => data.mainEntity ?? [])
	.map(entry => ({ q: entry.name, a: entry.acceptedAnswer.text }));

const readPage = (path: string) => cy.request(path).its('body').then((html: string) => new DOMParser().parseFromString(html, 'text/html'));

describe('the questions search engines are told about', () => {
	for (const locale of localeCodes) {
		const prefix = locale === 'en' ? '' : `${locale}/`;
		it(`match the questions and answers on the FAQ page, word for word: /${prefix}faq/`, () => {
			readPage(`${prefix}faq/`).then(doc => {
				const shown = faqOnPage(doc);
				expect(shown, 'questions on the page').to.have.length.greaterThan(3);
				expect(faqInData(doc)).to.deep.equal(shown);
				for (const { q, a } of shown) expect(`${q} ${a}`, 'no unfilled placeholder').not.to.match(/\{\w+\}/);
			});
		});
	}

	// Every article that carries a "Common questions" block, whichever articles the build holds.
	it('match the common questions on every help article that has them', () => {
		cy.visit('docs/extension/');
		cy.get('nav.docs-nav ul a').then($links => {
			const paths = [...new Set($links.toArray().map(link => new URL((link as HTMLAnchorElement).href).pathname.replace(/^\/arenaswap\//, '')))];
			let withQuestions = 0;
			for (const path of paths) {
				readPage(path).then(doc => {
					const shown = faqOnPage(doc);
					if (shown.length > 0) withQuestions++;
					expect(faqInData(doc), path).to.deep.equal(shown);
				});
			}
			cy.then(() => expect(withQuestions, 'articles with common questions').to.be.greaterThan(0));
		});
	});
});

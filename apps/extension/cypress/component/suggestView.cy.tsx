import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fil from '../../locales/fil.json';
import fr from '../../locales/fr.json';
// Not `it` — that would shadow Mocha's global it() and break every test in this file.
import itLocale from '../../locales/it.json';
import ja from '../../locales/ja.json';
import ko from '../../locales/ko.json';
import ptBR from '../../locales/pt_BR.json';
import ptPT from '../../locales/pt_PT.json';
import zhCN from '../../locales/zh_CN.json';
import zhTW from '../../locales/zh_TW.json';
import SuggestView from '../../entrypoints/popup/components/suggestView';
import type { Game } from '@arenaswap/core/types';
import type { TabSuggestion } from '../../utils/tabSuggestions';

// A 4x4 solid #008348 PNG. A data URI so the test needs no network and cannot taint the canvas on
// its own — what it is proving is that a crest is readable back off the page at all.
const greenCrest = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAD0lEQVR4nGNgaPZAIOI4AEWjDLFo9OSUAAAAAElFTkSuQmCC';
const navyCrest = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGPklndkgAEmOAsvBwAVtABz/BlSUAAAAABJRU5ErkJggg==';
const whiteCrest = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGP8//8/AwwwwVl4OQCWbgMF7ZjH1AAAAABJRU5ErkJggg==';

const channelsOf = (color: string): number[] => (
	(color.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number)
);

const relativeLuminance = (color: string): number => {
	const [red, green, blue] = channelsOf(color).map(value => {
		const channel = value / 255;
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return (0.2126 * red!) + (0.7152 * green!) + (0.0722 * blue!);
};

const contrastRatio = (a: string, b: string): number => {
	const [high, low] = [relativeLuminance(a), relativeLuminance(b)].toSorted((x, y) => y - x);
	return (high! + 0.05) / (low! + 0.05);
};

const makeGame = (id: string, away: string, home: string): Game => ({
	id,
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period: 2,
	clockSeconds: 300,
	awayTeam: { id: `${id}-a`, name: `${away} Team`, abbreviation: away, score: 48 },
	homeTeam: { id: `${id}-h`, name: `${home} Team`, abbreviation: home, score: 50 },
});

const games = [makeGame('g1', 'BOS', 'NYK'), makeGame('g2', 'LAL', 'GSW')];

const openTabs = [
	{ id: 1, title: 'Celtics vs Knicks Live', url: 'https://example.com/1' },
	{ id: 2, title: 'Lakers vs Warriors Live', url: 'https://example.com/2' },
];

const suggestions: TabSuggestion[] = [
	{ tabId: 1, gameId: 'g1', score: 97, preChecked: true },
	{ tabId: 2, gameId: 'g2', score: 40, preChecked: false },
];

const defaultProps = {
	suggestions,
	games,
	openTabs,
	formatTabLabel: (tab: { title?: string }) => tab.title ?? '',
	onApply: () => {},
	onBack: () => {},
};

describe('suggestView', () => {
	it('renders one row per suggestion with the strong one pre-checked', () => {
		cy.mount(<SuggestView {...defaultProps} />);
		cy.get('.suggest-row').should('have.length', 2);
		cy.get('#suggest-1\\:g1').should('be.checked');
		cy.get('#suggest-2\\:g2').should('not.be.checked');
	});

	it('never shows a score or a confidence indicator', () => {
		cy.mount(<SuggestView {...defaultProps} />);
		cy.get('.suggest-list').should('not.contain.text', '97');
		cy.get('.suggest-list').should('not.contain.text', '40');
	});

	it('hands the apply callback only the checked rows', () => {
		const onApply = cy.stub().as('apply');
		cy.mount(<SuggestView {...defaultProps} onApply={onApply} />);
		cy.contains('button', 'Assign 1 tab').click();
		cy.get('@apply').should(stub => {
			expect((stub as unknown as sinon.SinonStub).firstCall.args[0]).to.deep.equal([suggestions[0]]);
		});
	});

	it('releases a game when a second tab claims it', () => {
		const twoForOne: TabSuggestion[] = [
			{ tabId: 1, gameId: 'g1', score: 97, preChecked: true },
			{ tabId: 2, gameId: 'g1', score: 61, preChecked: true },
		];
		cy.mount(<SuggestView {...defaultProps} suggestions={twoForOne} />);
		// Only the stronger row may hold the game on mount.
		cy.get('#suggest-1\\:g1').should('be.checked');
		cy.get('#suggest-2\\:g1').should('not.be.checked');

		cy.get('#suggest-2\\:g1').click();
		cy.get('#suggest-2\\:g1').should('be.checked');
		cy.get('#suggest-1\\:g1').should('not.be.checked');
	});

	it('disables the button when nothing is checked', () => {
		cy.mount(<SuggestView {...defaultProps} suggestions={[suggestions[1]!]} />);
		cy.contains('button', 'Assign tabs').should('be.disabled');
	});

	it('shows the empty state with no suggestions', () => {
		cy.mount(<SuggestView {...defaultProps} suggestions={[]} />);
		cy.get('.suggest-row').should('not.exist');
		cy.contains('Nothing you have open').should('be.visible');
	});

	it('draws the pairs as one card under a titled header', () => {
		cy.mount(<SuggestView {...defaultProps} />);
		cy.get('.as-subhead h2').should('have.text', 'Suggested tabs');
		cy.get('.st-back').should('have.attr', 'aria-label', 'Back');
		cy.get('.st-card.suggest-list .suggest-row').should('have.length', 2);
		cy.get('.suggest-row').first().should('contain.text', 'BOS').and('contain.text', 'NYK').and('contain.text', 'Celtics vs Knicks Live');
	});

	it('keeps the apply button in reach at the foot of the sheet', () => {
		cy.viewport(320, 560);
		cy.mount(<div className='popup-root'><SuggestView {...defaultProps} /></div>);
		cy.get('.suggest-foot .btn-primary').should(([button]: JQuery<HTMLElement>) => {
			expect(button.getBoundingClientRect().bottom).to.be.at.most(560);
		});
	});

	it('calls back when the header is used', () => {
		const onBack = cy.stub().as('back');
		cy.mount(<SuggestView {...defaultProps} onBack={onBack} />);
		cy.get('.st-back').click();
		cy.get('@back').should('have.been.called');
	});
});

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

// The crests are measured against the card they sit on, like every other crest on the board: a
// mark that reads there is drawn bare, and one that disappears into it gets a tinted plate.
describe('suggestView crests', () => {
	beforeEach(() => cy.viewport(320, 560));

	const withLogos = (logo: string) => ({
		...defaultProps,
		games: games.map(game => ({
			...game,
			awayTeam: { ...game.awayTeam, logo },
			homeTeam: { ...game.homeTeam, logo },
		})),
	});

	it('draws both crests of every pair at row size', () => {
		cy.mount(<SuggestView {...withLogos(whiteCrest)} />);
		cy.get('.suggest-crest').should('have.length', 4).each(($crest: JQuery<HTMLElement>) => {
			const box = $crest[0]!.getBoundingClientRect();
			expect(box.width, 'crest width').to.equal(20);
			expect(box.height, 'crest height').to.equal(20);
		});
	});

	it('leaves a crest bare where it reads on the card', () => {
		cy.mount(<SuggestView {...withLogos(whiteCrest)} />);
		cy.get('.suggest-crest .as-crest').should('have.length', 4).each(($disc: JQuery<HTMLElement>) => {
			expect($disc[0]).to.have.class('is-bare');
		});
	});

	it('puts a light plate, tinted from the crest, behind a crest that disappears into the card', () => {
		cy.mount(<SuggestView {...withLogos(navyCrest)} />);
		cy.get('.suggest-list').then(([card]: JQuery<HTMLElement>) => {
			const surface = getComputedStyle(card).backgroundColor;
			cy.get('.suggest-crest .as-crest').should('have.length', 4).each(($disc: JQuery<HTMLElement>) => {
				const disc = $disc[0]!;
				expect(disc).not.to.have.class('is-bare');
				expect(getComputedStyle(disc).backgroundImage).to.contain('11, 31, 65');
				expect(contrastRatio(getComputedStyle(disc).backgroundColor, surface), 'the plate stands off the card').to.be.at.least(3);
			});
		});
	});

	it('letters a missing crest in its team colour rather than leaving a hole', () => {
		cy.mount(<SuggestView {...defaultProps} />);
		cy.get('.suggest-crest .crest-fallback').first()
			.should('have.text', 'BOS')
			.and(([el]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(el).backgroundColor).not.to.equal('rgba(0, 0, 0, 0)');
			});
	});

	it('keeps every row inside the popup', () => {
		cy.mount(<SuggestView {...withLogos(greenCrest)} />);
		cy.get('.suggest-row').each(($row: JQuery<HTMLElement>) => {
			const row = $row[0]!;
			expect(row.scrollWidth, 'row does not overflow').to.be.at.most(row.clientWidth);
		});
	});
});

describe('suggestView locale widths', () => {
	// The apply button spans the popup and must not wrap: a two-line primary button pushes the row
	// list up and reads as a layout bug rather than a long word.
	it('fits every locale apply label on one line', () => {
		cy.viewport(320, 560);
		cy.mount(<SuggestView {...defaultProps} />);
		cy.get('.suggest-foot button').then(([button]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(button);
			const budget = button.getBoundingClientRect().width
				- parseFloat(style.paddingLeft)
				- parseFloat(style.paddingRight);

			const probe = document.createElement('span');
			probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${style.font}`;
			document.body.appendChild(probe);

			for (const [name, locale] of Object.entries(locales)) {
				const suggest = locale.suggest as unknown as { applyNone: string; apply: { n: string } };
				for (const label of [suggest.applyNone, suggest.apply.n.replace('$1', '12')]) {
					probe.textContent = label;
					expect(probe.getBoundingClientRect().width, `${name} apply label fits the button`)
						.to.be.at.most(budget);
				}
			}
			probe.remove();
		});
	});
});

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

	it('calls back when the header is used', () => {
		const onBack = cy.stub().as('back');
		cy.mount(<SuggestView {...defaultProps} onBack={onBack} />);
		cy.get('.setup-header').click();
		cy.get('@back').should('have.been.called');
	});
});

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

// The two crests in a row sit on the popup's #0d1117, where a navy or black mark is a silhouette.
// The white disc is the only thing separating them from it, so its plate is measured rather than
// trusted to the stylesheet — a disc that resolves to the surface behind it is the whole defect.
describe('suggestView crest discs', () => {
	beforeEach(() => cy.viewport(320, 560));

	const withCrests = {
		...defaultProps,
		games: games.map(game => ({
			...game,
			awayTeam: { ...game.awayTeam, logo: greenCrest },
			homeTeam: { ...game.homeTeam, logo: greenCrest },
		})),
	};

	it('puts a light plate behind every crest', () => {
		cy.mount(<SuggestView {...withCrests} />);
		cy.get('.suggest-crest-disc').should('have.length', 4);
		cy.get('.popup-container').then(([container]: JQuery<HTMLElement>) => {
			const surface = getComputedStyle(container).backgroundColor;
			cy.get('.suggest-crest-disc').each(($disc: JQuery<HTMLElement>) => {
				const plate = getComputedStyle($disc[0]!).backgroundColor;
				expect(contrastRatio(plate, surface), `${plate} on ${surface}`).to.be.at.least(3);
			});
		});
	});

	it('tints the plate with a colour read out of the crest itself', () => {
		cy.mount(<SuggestView {...withCrests} />);
		cy.get('.suggest-crest-disc').first().should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).backgroundImage).to.contain('0, 131, 72');
		});
	});

	// The disc grows around the mark rather than squeezing it: at this size a crest shrunk to fit
	// inside its old footprint is a smaller crest than the one that was already hard to read.
	it('leaves the crest the size it was and rings it', () => {
		cy.mount(<SuggestView {...withCrests} />);
		cy.get('.suggest-crest').first().should(([crest]: JQuery<HTMLElement>) => {
			expect(crest.getBoundingClientRect().width, 'crest width').to.be.closeTo(15.2, 0.5);
		});
		cy.get('.suggest-crest-disc').first().should(([disc]: JQuery<HTMLElement>) => {
			const box = disc.getBoundingClientRect();
			expect(box.width, 'disc width').to.be.closeTo(20.32, 0.5);
			expect(box.width, 'disc is square').to.be.closeTo(box.height, 0.5);
		});
	});

	// The placeholder is the shared grey circle, which on a white plate would read as a hole rather
	// than as a crest still loading.
	it('drops the grey placeholder inside the plate', () => {
		cy.mount(<SuggestView {...defaultProps} />);
		cy.get('.suggest-crest .crest-fallback').first()
			.should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
	});

	it('keeps the widened row inside the popup', () => {
		cy.mount(<SuggestView {...withCrests} />);
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
		cy.get('.mt-auto button').then(([button]: JQuery<HTMLElement>) => {
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

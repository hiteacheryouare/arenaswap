import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import { MockGameSimulator } from '@arenaswap/core';
import type { Game } from '@arenaswap/core/types';
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

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

const crestPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// The shipped demo games, so these run the real parser over the real fixtures with no network.
// The team ids are what put the wash on the right two rows, which a redeclared game would not
// have. Only the crests are swapped, for a data URI that needs none.
const seededGames = new MockGameSimulator().seed();

const demoGame = (id: string): Game => {
	const game = seededGames.find(candidate => candidate.id === id)!;
	return {
		...game,
		homeTeam: { ...game.homeTeam, logo: crestPixel },
		awayTeam: { ...game.awayTeam, logo: crestPixel },
	};
};

// PHI v DAL: one NFL division holding both teams.
const football = demoGame('mock-5');
// PHI v CHI: two NBA divisions, one per team.
const basketball = demoGame('mock-2');
// LIV v ARS: a twenty-club ranked league table.
const soccer = demoGame('mock-12');
// NU v BC, college hockey — the league ESPN publishes no table for at all.
const noTable = demoGame('mock-10');
// TEM v PSU, pre-game.
const preGame = demoGame('mock-6');

const mount = (game: Game) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={undefined}
			scoreHistory={[]}
			powerScoreHistory={[]}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled: false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false }}
			favoriteTeamIds={new Set<string>()}
			openTabs={[] as never}
			registry={[]}
			onToggleFavoriteTeam={() => {}}
			onRegistryChange={() => {}}
			formatTabLabel={() => ''}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

const openStandings = (game: Game) => {
	mount(game);
	cy.get(`#dt-tab-${game.id}-standings`).click();
};

describe('detail screen tab strip', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('files a live game under three tabs', () => {
		mount(football);
		cy.get('.dt-tabs .nav-link').should('have.length', 3);
		cy.get('.dt-tabs .nav-link').then($tabs => {
			expect([...$tabs].map(tab => tab.textContent?.trim()))
				.to.deep.equal([en.detail.tabOverview, en.box.heading, en.detail.tabStandings]);
		});
	});

	it('opens on the overview, which is where the PowerScore is', () => {
		mount(football);
		cy.get('.dt-tabs .nav-link.active').should('have.text', en.detail.tabOverview);
		cy.get('.tab-pane.active .powerscore-breakdown').should('exist');
		cy.get('.dt-standings').should('not.be.visible');
	});

	it('draws no strip at all for a league with neither a box score nor a table', () => {
		mount(noTable);
		cy.get('.dt-tabs').should('not.exist');
		// The screen itself still rendered: this is not an empty mount asserting nothing.
		cy.get('.dt-body .dt-setup').should('exist');
	});

	it('offers a table but no box score before a start', () => {
		mount(preGame);
		cy.get('.dt-tabs .nav-link').then($tabs => {
			expect([...$tabs].map(tab => tab.textContent?.trim()))
				.to.deep.equal([en.detail.tabOverview, en.detail.tabStandings]);
		});
	});

	// Bootstrap's plugin owns the active classes and `aria-selected`; these assert it is actually
	// wired up rather than re-testing Bootstrap. The trap it guards is React: the detail screen
	// re-renders on every poll, and a `className` recomputed from React state would reset the
	// plugin's work on the next tick.
	it('hands the selection to Bootstrap, which moves it and the aria with it', () => {
		mount(football);
		cy.get(`#dt-tab-${football.id}-standings`).click();
		cy.get(`#dt-tab-${football.id}-standings`)
			.should('have.class', 'active')
			.and('have.attr', 'aria-selected', 'true');
		cy.get(`#dt-tab-${football.id}-overview`)
			.should('not.have.class', 'active')
			.and('have.attr', 'aria-selected', 'false');
	});

	it('shows exactly one pane, and the one the selected tab points at', () => {
		mount(football);
		cy.get(`#dt-tab-${football.id}-box`).click();
		cy.get('.tab-pane.active').should('have.length', 1);
		cy.get('.tab-pane.active').should('have.id', `dt-pane-${football.id}-box`);
		cy.get('.tab-pane.active .dt-box').should('exist');
	});

	it('labels the shown pane with the tab that opened it', () => {
		mount(football);
		cy.get(`#dt-tab-${football.id}-standings`).click();
		cy.get('.tab-pane.active')
			.should('have.attr', 'aria-labelledby', `dt-tab-${football.id}-standings`);
	});

	it('moves the selection with the arrow keys, which the plugin binds', () => {
		mount(football);
		cy.get('.dt-tabs .nav-link').eq(0).focus().trigger('keydown', { key: 'ArrowRight' });
		cy.get('.dt-tabs .nav-link.active').should('have.text', en.box.heading);

		cy.focused().trigger('keydown', { key: 'End' });
		cy.get('.dt-tabs .nav-link.active').should('have.text', en.detail.tabStandings);
		cy.focused().trigger('keydown', { key: 'Home' });
		cy.get('.dt-tabs .nav-link.active').should('have.text', en.detail.tabOverview);
	});

	// The plugin sets `tabindex="-1"` on the tabs it is not on and leaves the attribute off the
	// one it is, a button being focusable without it — so the property is what states the
	// contract here, not the attribute.
	it('keeps the strip one tab stop, with the selection roving inside it', () => {
		mount(football);
		// `should` rather than `then`: the third tab appears when the box score resolves and the
		// plugin is attached in an effect a commit later, so a single read lands before either.
		cy.get('.dt-tabs .nav-link').should($tabs => {
			const stops = [...$tabs].map(tab => (tab as HTMLButtonElement).tabIndex);
			expect(stops).to.deep.equal([0, -1, -1]);
		});
		cy.get(`#dt-tab-${football.id}-standings`).click();
		cy.get('.dt-tabs .nav-link').should($tabs => {
			const stops = [...$tabs].map(tab => (tab as HTMLButtonElement).tabIndex);
			expect(stops, 'the one tab stop follows the selection').to.deep.equal([-1, -1, 0]);
		});
	});

	// The selected label takes the ink and the orange rule; the others take the muted ink.
	it('draws the selection in ink over the accent rule, on the page', () => {
		mount(football);
		cy.get('.dt-tabs .nav-link.active').then($tab => {
			const style = getComputedStyle($tab[0]!);
			expect(style.color, 'selected label').to.equal('rgb(243, 245, 247)');
			expect(style.borderBottomColor, 'the rule').to.equal('rgb(247, 92, 3)');
			expect(parseFloat(style.borderBottomWidth), 'the rule weight').to.equal(2);
			expect(style.backgroundColor).to.equal('rgba(0, 0, 0, 0)');
		});
		cy.get('.dt-tabs .nav-link').not('.active').first().then($tab => {
			expect(getComputedStyle($tab[0]!).color).to.equal('rgb(140, 149, 161)');
		});
		cy.get('.dt-tabs').should('have.css', 'border-bottom-width', '1px');
	});

	// Spread across the width, the rule under each word rather than under a third of the strip.
	it('spreads the tabs across the width, each rule the width of its label', () => {
		mount(football);
		cy.get('.dt-tabs').then(([strip]: JQuery<HTMLElement>) => {
			const box = strip.getBoundingClientRect();
			const tabs = [...strip.querySelectorAll<HTMLElement>('.nav-link')];
			expect(tabs[0]!.getBoundingClientRect().left - box.left, 'first flush left').to.be.closeTo(4, 1);
			expect(box.right - tabs.at(-1)!.getBoundingClientRect().right, 'last flush right').to.be.closeTo(4, 1);
			for (const tab of tabs) {
				const range = tab.ownerDocument.createRange();
				range.selectNodeContents(tab);
				expect(tab.getBoundingClientRect().width, `${tab.textContent} rule measures the word`)
					.to.be.closeTo(range.getBoundingClientRect().width, 1);
			}
		});
	});

	// Substituted into the rendered strip rather than remounted under each locale, which is how
	// the box score measures its own column heads: the three tabs share the card's width, so a
	// label has to be measured in the box it will actually render in.
	it('fits every locale\'s tab labels on one line', () => {
		mount(football);
		cy.get('.dt-tabs .nav-link').then($tabs => {
			const baseline = [...$tabs].map(tab => tab.getBoundingClientRect().height);
			for (const [code, bundle] of Object.entries(locales)) {
				const labels = [
					(bundle as typeof en).detail.tabOverview,
					(bundle as typeof en).box.heading,
					(bundle as typeof en).detail.tabStandings,
				];
				[...$tabs].forEach((tab, index) => {
					const original = tab.textContent;
					tab.textContent = labels[index]!;
					expect(tab.getBoundingClientRect().height, `${code} tab ${index} on one line`)
						.to.be.at.most(baseline[index]! + 1);
					tab.textContent = original;
				});
				[...$tabs].forEach((tab, index) => { tab.textContent = labels[index]!; });
				const strip = $tabs[0]!.closest('.dt-tabs') as HTMLElement;
				expect(strip.scrollWidth, `${code} labels fit the strip together`).to.be.at.most(strip.clientWidth);
				[...$tabs].forEach(tab => { tab.textContent = ''; });
			}
		});
	});
});

describe('standings table', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('prints the whole league, not the matchup division', () => {
		openStandings(football);
		cy.get('.dt-standings-group').should('have.length', 8);
		cy.get('.dt-standings-table tbody tr').should('have.length', 32);
	});

	it('heads each conference once, over the divisions inside it', () => {
		openStandings(football);
		cy.get('.dt-standings-conference').then($headings => {
			expect([...$headings].map(heading => heading.textContent))
				.to.deep.equal(['American Football Conference', 'National Football Conference']);
		});
		cy.get('.dt-standings-group .dt-subheading').then($headings => {
			expect([...$headings].map(heading => heading.textContent)).to.deep.equal([
				'AFC East', 'AFC North', 'AFC South', 'AFC West',
				'NFC East', 'NFC North', 'NFC South', 'NFC West',
			]);
		});
	});

	it('gives basketball its six divisions under two conferences', () => {
		openStandings(basketball);
		cy.get('.dt-standings-conference').should('have.length', 2);
		cy.get('.dt-standings-group').should('have.length', 6);
		cy.get('.dt-standings-table tbody tr').should('have.length', 30);
	});

	it('draws no conference heading over a flat league table', () => {
		openStandings(soccer);
		cy.get('.dt-standings-conference').should('not.exist');
		cy.get('.dt-standings-group').should('have.length', 1);
		cy.get('.dt-standings-table tbody tr').should('have.length', 20);
	});

	it('heads a football table the way a football table is headed', () => {
		openStandings(football);
		cy.get('.dt-standings-table').first().find('thead th').then($th => {
			expect([...$th].map(th => th.textContent)).to.deep.equal([
				en.standings.wins, en.standings.losses, en.standings.ties, en.standings.winPercent,
			]);
		});
	});

	it('marks the two rows in the matchup with the accent rule and leaves the other thirty alone', () => {
		openStandings(football);
		cy.get('.dt-standings-table tbody tr').then($rows => {
			const marked = [...$rows].filter(row => getComputedStyle(row.firstElementChild!, '::before').content !== 'none');
			expect(marked).to.have.length(2);
			expect(marked.map(row => row.querySelector('.dt-standings-name')?.textContent))
				.to.deep.equal(['Philadelphia', 'Dallas']);
			const rule = getComputedStyle(marked[0]!.firstElementChild!, '::before');
			expect(rule.backgroundColor, 'the accent').to.equal('rgb(247, 92, 3)');
			expect(rule.width, 'a 3px rule').to.equal('3px');
		});
	});

	it('marks the two rows for a screen reader, not only for the eye', () => {
		openStandings(football);
		cy.get('.dt-standings-table tbody tr[aria-current="true"]').should('have.length', 2).and('have.class', 'is-playing');
	});

	// The rule carries it for the eye; the weight and the ink carry it for a glance down the numbers.
	it('sets the matchup rows semibold in ink and the rest of the numbers quiet', () => {
		openStandings(football);
		cy.contains('tr', 'Philadelphia').find('td').first().should('have.css', 'color', 'rgb(243, 245, 247)')
			.and('have.css', 'font-weight', '600');
		cy.contains('tr', 'Buffalo').find('td').first().should('have.css', 'color', 'rgb(140, 149, 161)');
	});

	it('leaves every other name on the card ink', () => {
		openStandings(football);
		cy.contains('.dt-standings-name', 'Buffalo').should('have.css', 'color', 'rgb(243, 245, 247)');
	});

	// The names line up down the table whether or not a row carries the rule.
	it('keeps every name on one left edge', () => {
		openStandings(football);
		cy.get('.dt-standings-table').first().find('.dt-standings-id').then($ids => {
			expect(new Set([...$ids].map(id => Math.round(id.getBoundingClientRect().left))).size).to.equal(1);
		});
	});

	it('numbers a league table and leaves a division unnumbered', () => {
		openStandings(soccer);
		cy.get('.dt-standings-table tbody tr').eq(0).find('.dt-standings-rank').should('have.text', '1');
		openStandings(football);
		cy.get('.dt-standings-rank').should('not.exist');
	});

	it('reads the record strings a college conference sends instead of a win column', () => {
		openStandings(preGame);
		cy.get('.dt-standings-table').first().find('thead th').then($th => {
			expect([...$th].map(th => th.textContent))
				.to.deep.equal([en.standings.conference, en.standings.overall]);
		});
		// College stays on the summary block, which knows nothing above the conference.
		cy.get('.dt-standings-conference').should('not.exist');
	});

	it('never pushes a cell past the popup edge, in any sport', () => {
		for (const game of [football, basketball, soccer, preGame]) {
			openStandings(game);
			cy.get('.dt-standings-table td, .dt-standings-table th').each($cell => {
				expect($cell[0].getBoundingClientRect().right, `${game.id} cell within 320px`)
					.to.be.at.most(320);
			});
		}
	});

	// Proven by substitution rather than by a fixture that happens to fit. "Manchester City" is
	// the widest name twenty real clubs produce here and it lands inside the column, so a table
	// that clips correctly and a table that cannot clip at all measure the same on this data.
	it('gives the name column away first rather than clipping a number', () => {
		openStandings(soccer);
		cy.get('.dt-standings-table tbody td').each($cell => {
			expect($cell[0].scrollWidth, 'number cell untruncated').to.be.at.most($cell[0].clientWidth + 1);
		});
		cy.contains('.dt-standings-name', 'Manchester City').then($name => {
			const element = $name[0];
			const numbersBefore = [...element.closest('tr')!.querySelectorAll('td')]
				.map(cell => Math.round(cell.getBoundingClientRect().width));

			element.textContent = 'Wolverhampton Wanderers Football Club';
			expect(element.scrollWidth, 'a longer name clips').to.be.greaterThan(element.clientWidth);
			expect(element.closest('th')!.getBoundingClientRect().right).to.be.at.most(320);

			const numbersAfter = [...element.closest('tr')!.querySelectorAll('td')]
				.map(cell => Math.round(cell.getBoundingClientRect().width));
			expect(numbersAfter, 'the numbers keep their columns').to.deep.equal(numbersBefore);
		});
	});
});

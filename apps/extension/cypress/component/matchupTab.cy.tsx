import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import { restPhrase } from '../../entrypoints/popup/components/recentForm';
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

// The shipped demo games, so these run the real parser over the real demo payloads.
const seededGames = new MockGameSimulator().seed();

const demoGame = (id: string): Game => {
	const game = seededGames.find(candidate => candidate.id === id)!;
	return {
		...game,
		homeTeam: { ...game.homeTeam, logo: crestPixel },
		awayTeam: { ...game.awayTeam, logo: crestPixel },
	};
};

// DET at NYM: grouped baseball stats with league ranks, and injured-list names to filter out.
const baseball = demoGame('mock-18');
// MTL at BOS: five Bruins on the report against none for Montreal.
const hockey = demoGame('mock-19');
// PSU at TEM: football, no injury report.
const football = demoGame('mock-6');

const detailView = (game: Game) => (
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
	/>
);

const openMatchup = (game: Game) => {
	cy.mount(detailView(game));
	cy.get(`#gd-tab-${game.id}-matchup`).click();
	cy.get(`#gd-pane-${game.id}-matchup`).should('be.visible');
};

const pane = (game: Game) => cy.get(`#gd-pane-${game.id}-matchup`);

describe('Matchup tab', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('sits between the overview and the table, with its three sections in order', () => {
		openMatchup(baseball);
		cy.get('.gd-tabs .nav-link').eq(1).should('have.text', en.detail.tabMatchup);
		pane(baseball).find('.gd-setup-heading').should($headings => {
			expect([...$headings].map(heading => heading.textContent)).to.deep.equal([
				en.detail.recentForm,
				`${baseball.awayTeam.abbreviation}${en.detail.seasonStats}${baseball.homeTeam.abbreviation}`,
				en.detail.injuries,
			]);
		});
	});

	it('is gone once the game is under way', () => {
		cy.mount(detailView({ ...football, status: 'in', period: 2, clockSeconds: 300 }));
		cy.get('.gd-tabs .nav-link').should('exist');
		cy.get(`#gd-tab-${football.id}-matchup`).should('not.exist');
	});

	// The trap: Bootstrap owns the active class, so the strip that loses the open tab at kickoff
	// would otherwise be left with no pane showing at all. A re-render rather than a second mount,
	// because that is what a poll does.
	it('lands back on the overview when the game starts with the tab open', () => {
		cy.mount(detailView(football)).then(({ rerender }) => {
			cy.get(`#gd-tab-${football.id}-matchup`).click();
			cy.get(`#gd-pane-${football.id}-matchup`).should('be.visible').then(() => {
				rerender(detailView({ ...football, status: 'in', period: 1, clockSeconds: 900 }));
			});
		});
		cy.get(`#gd-tab-${football.id}-matchup`).should('not.exist');
		cy.get('.gd-tabs .nav-link').should('exist');
		cy.get('.tab-pane.active').should('have.length', 1).and('have.id', `gd-pane-${football.id}-overview`);
		cy.get('.gd-tabs .nav-link.active').should('have.text', en.detail.tabOverview);
	});

	describe('recent form', () => {
		it('lists five results a side, oldest to newest', () => {
			openMatchup(baseball);
			pane(baseball).find('.gd-form-row').should('have.length', 2).each($row => {
				const cells = $row.find('.gd-form-cell');
				expect(cells).to.have.length(5);
				// The last cell is yesterday's game.
				expect(cells.last().attr('title')).to.contain(new Date(Date.now() - 24 * 3600_000).toLocaleDateString([], { month: 'short', day: 'numeric' }));
			});
			// Away first: Detroit's last game was a 2–3 loss at home to Kansas City.
			pane(baseball).find('.gd-form-row').first().find('.gd-form-abbreviation').should('have.text', 'DET');
			pane(baseball).find('.gd-form-row').first().find('.gd-form-cell').last()
				.should('have.attr', 'data-result', 'L')
				.and('have.attr', 'title', `vs KC · L 2–3 · ${new Date(Date.now() - 24 * 3600_000).toLocaleDateString([], { month: 'short', day: 'numeric' })}`);
		});

		it('notes rest for hockey and not for baseball', () => {
			openMatchup(hockey);
			pane(hockey).find('.gd-form-rest').should('have.length.at.least', 1);
			openMatchup(baseball);
			pane(baseball).find('.gd-form-row').should('have.length', 2);
			pane(baseball).find('.gd-form-rest').should('not.exist');
		});

		// Venue times in Eastern, written as UTC so the viewer's own timezone cannot move them.
		it('counts rest the way the venue sees it, matinees included', () => {
			const now = Date.parse('2026-03-03T15:00:00Z');
			// Sunday 1pm, then Monday 7:30pm: a back-to-back that lands on two different dates in Europe.
			expect(restPhrase('2026-03-01T18:00:00Z', '2026-03-03T00:30:00Z', now)).to.equal(en.detail.backToBack);
			// Saturday 7pm, then Monday 1pm: a day off, even though it is under 48 hours.
			expect(restPhrase('2026-03-01T00:00:00Z', '2026-03-02T18:00:00Z', Date.parse('2026-03-02T15:00:00Z'))).to.equal("1 day's rest");
			expect(restPhrase('2026-03-01T00:00:00Z', '2026-03-04T00:00:00Z', Date.parse('2026-03-03T15:00:00Z'))).to.equal("2 days' rest");
			// Past a week it is a break, not rest.
			expect(restPhrase('2026-02-20T00:00:00Z', '2026-03-04T00:00:00Z', Date.parse('2026-03-03T15:00:00Z'))).to.equal(null);
		});

		// The last five only hold games already played, so tomorrow's game may have one before it.
		it('says nothing about rest for a game that is not coming up next', () => {
			expect(restPhrase('2026-03-02T00:00:00Z', '2026-03-04T00:00:00Z', Date.parse('2026-03-02T12:00:00Z'))).to.equal(null);
		});
	});

	describe('season stats', () => {
		it('lines up the six baseball stats with league ranks', () => {
			openMatchup(baseball);
			pane(baseball).find('.gd-compare-row').should('have.length', 6);
			pane(baseball).find('.gd-compare-row').first().within(() => {
				cy.get('.gd-compare-label').should('have.text', en.detail.statRuns);
				cy.get('.gd-compare-value').first().should('contain.text', '712').and('contain.text', '#9');
				cy.get('.gd-compare-value').last().should('contain.text', '768').and('contain.text', '#3')
					.and('have.attr', 'data-better', 'true');
			});
		});

		// Detroit's 3.61 ERA beats the Mets' 4.02, so the away side is bold and owns the longer half.
		it('flips the winner and the bar for a stat where lower is better', () => {
			openMatchup(baseball);
			pane(baseball).find('.gd-compare-row').eq(4).within(() => {
				cy.get('.gd-compare-label').should('have.text', en.detail.statEra);
				cy.get('.gd-compare-value').first().should('have.attr', 'data-better', 'true');
				cy.get('.gd-compare-bar > span').then($halves => {
					expect($halves[0]!.getBoundingClientRect().width).to.be.greaterThan($halves[1]!.getBoundingClientRect().width);
				});
			});
		});
	});

	describe('injuries', () => {
		it('shows game-day statuses only, Out first', () => {
			openMatchup(baseball);
			pane(baseball).find('.gd-injury-team').first().find('.gd-injury-name').should($names => {
				expect([...$names].map(name => name.textContent)).to.deep.equal(['P. Meadows', 'M. Vierling']);
			});
			// Two of the three Mets are on the injured list, which is not news on game day.
			pane(baseball).find('.gd-injury-team').last().find('.gd-injury-row').should('have.length', 1)
				.find('.gd-injury-status').should('have.text', en.detail.injuryDayToDay);
		});

		it('caps a long report at four and expands on request', () => {
			openMatchup(hockey);
			const bruins = () => pane(hockey).find('.gd-injury-team').last();
			bruins().find('.gd-injury-row').should('have.length', 4);
			bruins().find('.gd-box-more').should('have.text', en.box.showAll.replace('{count}', '5')).click();
			bruins().find('.gd-injury-row').should('have.length', 5);
			bruins().find('.gd-injury-status').first().should('have.text', en.detail.injuryOut);
		});

		it('says so when one side has nobody on the report', () => {
			openMatchup(hockey);
			pane(hockey).find('.gd-injury-team').first().find('.gd-injury-none').should('have.text', en.detail.injuriesNone);
		});

		it('leaves the section out when neither team sent a report', () => {
			openMatchup(football);
			pane(football).find('.gd-form-row').should('have.length', 2);
			pane(football).find('.gd-injuries').should('not.exist');
		});
	});

	it('never pushes anything past the popup edge, in any sport', () => {
		for (const game of [baseball, hockey, football]) {
			openMatchup(game);
			pane(game).find('.gd-form-cell, .gd-compare-row > *, .gd-injury-row > *').each($element => {
				expect($element[0]!.getBoundingClientRect().right, `${game.id} within 320px`).to.be.at.most(320);
			});
		}
	});

	// Swapped in place so the real column widths measure every locale's longest strings.
	it('fits every locale\'s labels in their columns', () => {
		openMatchup(baseball);
		pane(baseball).find('.gd-compare-row').first().then(([row]) => {
			const label = row!.querySelector<HTMLElement>('.gd-compare-label')!;
			const oneLine = parseFloat(getComputedStyle(label).lineHeight) + 1;
			for (const [name, locale] of Object.entries(locales)) {
				const detail = locale.detail as unknown as Record<string, string>;
				for (const key of Object.keys(detail).filter(candidate => candidate.startsWith('stat') && candidate !== 'statRank')) {
					label.textContent = detail[key] ?? '';
					expect(label.getBoundingClientRect().height, `${name}.${key} stays on one line`).to.be.at.most(oneLine);
					expect(row!.getBoundingClientRect().right, `${name}.${key} keeps the row inside the card`).to.be.at.most(320);
				}
			}
		});
		pane(baseball).find('.gd-injury-status').first().then(([status]) => {
			const card = status!.closest('.gd-setup')!.getBoundingClientRect();
			for (const [name, locale] of Object.entries(locales)) {
				for (const key of ['injuryOut', 'injuryDoubtful', 'injuryQuestionable', 'injuryDayToDay'] as const) {
					status!.textContent = locale.detail[key];
					expect(status!.getBoundingClientRect().right, `${name}.${key} inside the card`).to.be.at.most(card.right);
				}
			}
		});
	});

	describe('tickets', () => {
		it('links this game\'s seller page without the referral tag, priced from the lowest seat', () => {
			cy.mount(detailView(baseball));
			cy.get('.game-info-link')
				.should('have.text', en.detail.ticketsCta)
				.and('have.attr', 'target', '_blank')
				.and('have.attr', 'rel', 'noopener noreferrer')
				.and('have.attr', 'href', 'https://www.vividseats.com/new-york-mets-tickets');
			cy.get('.game-info-price').should('have.text', en.detail.ticketsFrom.replace('{price}', (34).toLocaleString([], { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })));
		});

		it('is not offered once the game is under way', () => {
			cy.mount(detailView({ ...baseball, status: 'in', period: 3, clockSeconds: 0 }));
			cy.get('.game-info-panel').should('exist');
			cy.get('.game-info-link').should('not.exist');
		});
	});
});

import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';
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
const labelKeys = ['infoWatch', 'infoVenue', 'infoWeather', 'infoLine'] as const;

const liveGame: Game = {
	id: 'mock-7',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period: 3,
	clockSeconds: 402,
	venueName: 'Arrowhead Stadium',
	broadcasts: ['CBS', 'Paramount+', 'Westwood One'],
	weather: { temperatureF: 34, conditionLabel: 'Light Snow' },
	odds: { details: 'KC -3.5', overUnder: 47.5, provider: { name: 'ESPN BET' } },
	homeTeam: { id: '1', name: 'Kansas City Chiefs', abbreviation: 'KC', score: 21 },
	awayTeam: { id: '3', name: 'Buffalo Bills', abbreviation: 'BUF', score: 24 },
};

const excitement: PowerScoreResult = {
	gameId: 'mock-7',
	total: 72,
	closeness: 24,
	lateGame: 18,
	momentum: 16,
	leadChanges: 8,
	comeback: 6,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'close game, lead changes',
};

const mountDetail = (game: Game, bettingEnabled = true) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={game.status === 'pre' ? undefined : excitement}
			scoreHistory={[]}
			powerScoreHistory={[]}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false }}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

describe('game info panel', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('gives broadcast, venue and line a row each', () => {
		mountDetail(liveGame);
		cy.get('.game-info-row').should('have.length', 3);
		cy.get('.game-info-row').eq(0).should('contain.text', 'CBS • Paramount+ • Westwood One');
		cy.get('.game-info-row').eq(1).should('contain.text', 'Arrowhead Stadium');
		cy.get('.game-info-row').eq(2).should('contain.text', 'KC -3.5 • O/U 47.5');
	});

	it('stacks the location under the venue name, unbolded', () => {
		mountDetail({ ...liveGame, venueLocation: 'Kansas City, MO' });
		cy.get('.game-info-venue-name').should('have.text', 'Arrowhead Stadium');
		cy.get('.game-info-venue-location').should('have.text', 'Kansas City, MO');
		cy.get('.game-info-venue-name').then(([name]: JQuery<HTMLElement>) => {
			cy.get('.game-info-venue-location').should(([location]: JQuery<HTMLElement>) => {
				const nameWeight = Number(getComputedStyle(name).fontWeight);
				const locationWeight = Number(getComputedStyle(location).fontWeight);
				expect(nameWeight, 'venue name is the bolder of the two').to.be.greaterThan(locationWeight);
				expect(location.getBoundingClientRect().top, 'location sits on its own line below')
					.to.be.greaterThan(name.getBoundingClientRect().bottom - 1);
			});
		});
	});

	it('drops to the location alone when ESPN names no building', () => {
		mountDetail({ ...liveGame, venueName: undefined, venueLocation: 'Kansas City, MO' });
		cy.get('.game-info-row').should('have.length', 3);
		cy.get('.game-info-venue-name').should('not.exist');
		cy.get('.game-info-row').eq(1).should('contain.text', 'Kansas City, MO');
	});

	it('keeps the longest venue block inside the panel', () => {
		mountDetail({ ...liveGame, venueName: 'Mercedes-Benz Superdome', venueLocation: 'New Orleans, Louisiana' });
		cy.get('.game-info-row').eq(1).find('.game-info-value').should($value => {
			const el = $value[0];
			expect(el.scrollWidth, 'venue block does not overflow its column').to.be.at.most(el.clientWidth);
		});
	});

	// Conditions describe the venue, so they cost a sub-line rather than a row of their own.
	it('rides the weather inside the venue row', () => {
		mountDetail(liveGame);
		cy.get('.game-info-row').eq(1).find('.game-info-weather').should('contain.text', 'Light Snow · 34°F');
		cy.get('.game-info-weather').should('have.length', 1);
	});

	it('gives the weather its own row when the venue is unknown', () => {
		mountDetail({ ...liveGame, venueName: undefined });
		cy.get('.game-info-row').should('have.length', 3);
		cy.get('.game-info-row').eq(1).should('contain.text', 'Light Snow · 34°F');
		cy.get('.game-info-weather').should('not.exist');
	});

	it('drops the weather line indoors', () => {
		mountDetail({ ...liveGame, weather: undefined });
		cy.get('.game-info-row').should('have.length', 3);
		cy.get('.game-info-weather').should('not.exist');
	});

	// Attribution belongs to the odds, not to a line of its own — it used to take a full row.
	it('keeps the odds provider inside the line row', () => {
		mountDetail(liveGame);
		cy.get('.game-info-row').eq(2).find('.game-info-attribution').should('contain.text', 'ESPN BET');
		// Gated on data-bs-original-title because Bootstrap arrives on a lazily imported chunk and
		// only takes ownership of the element once it lands.
		cy.get('.game-info-attribution').should('have.attr', 'data-bs-original-title');
		cy.get('.game-info-attribution').trigger('mouseover');
		cy.get('.tooltip.show').should('be.visible')
			.and('contain.text', 'Odds provided by')
			.and('contain.text', 'ESPN BET');
		cy.get('.game-info-attribution').trigger('mouseout');
	});

	it('drops the line row when betting display is off', () => {
		mountDetail(liveGame, false);
		cy.get('.game-info-row').should('have.length', 2);
		cy.get('.game-info-panel').should('not.contain.text', 'O/U');
	});

	it('renders nothing at all when the game carries none of it', () => {
		mountDetail({ ...liveGame, venueName: undefined, broadcasts: undefined, weather: undefined, odds: undefined });
		cy.get('.game-info-panel').should('not.exist');
	});

	it('trails the breakdown on a live game', () => {
		mountDetail(liveGame);
		cy.get('.game-info-panel').then(([panel]: JQuery<HTMLElement>) => {
			cy.get('.powerscore-breakdown').should(([breakdown]: JQuery<HTMLElement>) => {
				expect(panel.getBoundingClientRect().top, 'panel below the breakdown once live')
					.to.be.greaterThan(breakdown.getBoundingClientRect().top);
			});
		});
	});

	// The pre-game screen has no breakdown to sit under at all — pregameDetail.cy.tsx owns that
	// arrangement. All this needs to know is that the panel still renders there.
	it('still renders before the game starts', () => {
		mountDetail({ ...liveGame, status: 'pre', period: 0, startTime: new Date(Date.now() + 3600_000).toISOString() });
		cy.get('.game-info-panel').should('exist');
		cy.get('.game-info-row').should('have.length', 3);
	});

	// The label column is fixed so the values share a left edge; a label that wraps breaks the grid.
	it('fits every locale label in the label column', () => {
		mountDetail(liveGame);
		cy.get('.game-info-label').first().then(([label]: JQuery<HTMLElement>) => {
			const column = label.getBoundingClientRect().width;
			const probe = label.cloneNode(true) as HTMLElement;
			probe.style.cssText = 'width:auto;display:inline-block;position:absolute;visibility:hidden';
			label.parentElement?.appendChild(probe);
			for (const [name, locale] of Object.entries(locales)) {
				const detail = locale.detail as unknown as Record<string, string>;
				for (const key of labelKeys) {
					probe.textContent = detail[key] ?? '';
					expect(probe.getBoundingClientRect().width, `${name}.${key} fits the label column`)
						.to.be.at.most(column);
				}
			}
			probe.remove();
		});
	});
});

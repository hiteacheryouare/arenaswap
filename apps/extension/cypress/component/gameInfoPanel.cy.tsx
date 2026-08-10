import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import ja from '../../locales/ja.json';
import ptBR from '../../locales/pt_BR.json';
import ptPT from '../../locales/pt_PT.json';
import zhCN from '../../locales/zh_CN.json';

const locales = { de, en, es, fr, ja, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN };
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
		cy.get('.game-info-attribution')
			.should('have.attr', 'title')
			.and('match', /Odds provided by/);
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

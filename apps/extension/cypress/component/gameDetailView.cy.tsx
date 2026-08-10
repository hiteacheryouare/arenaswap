import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import ja from '../../locales/ja.json';
import ptBR from '../../locales/pt_BR.json';
import ptPT from '../../locales/pt_PT.json';
import zhCN from '../../locales/zh_CN.json';

const locales = { de, en, es, fr, ja, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN };

const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

// Fixed clock so the countdown is deterministic across runs.
const now = new Date('2026-08-01T12:00:00.000Z');

const makePreGame = (msUntilStart: number): Game => ({
	id: 'g1',
	league: 'nba',
	sportType: 'basketball',
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	startTime: new Date(now.getTime() + msUntilStart).toISOString(),
	homeTeam: { id: 'h', name: 'Boston Celtics', abbreviation: 'BOS', score: 0 },
	awayTeam: { id: 'a', name: 'Oklahoma City Thunder', abbreviation: 'OKC', score: 0 },
});

interface MountOverrides {
	excitementResult?: PowerScoreResult;
	scoreHistory?: ScoreSnapshot[];
	powerScoreHistory?: PowerScoreSnapshot[];
}

const mountDetail = (game: Game, overrides: MountOverrides = {}) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={overrides.excitementResult}
			scoreHistory={overrides.scoreHistory ?? []}
			powerScoreHistory={overrides.powerScoreHistory ?? []}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled: false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

// `mock-` ids short-circuit useSummaryData to a deterministic LCG, so nothing hits the network.
// Only mock-4/14/16 also carry a canned playoff series.
const liveGameId = 'mock-7';
const seriesGameId = 'mock-14';
// mock-2 carries canned records and no playoff series, so only the record row changes height.
const recordsGameId = 'mock-2';

const excitement: PowerScoreResult = {
	gameId: liveGameId,
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

// The charts only render once history exists, so tests that need a scrollable page supply this.
const powerScoreHistory: PowerScoreSnapshot[] = Array.from({ length: 6 }, (_, i) => ({
	gameId: liveGameId,
	timestamp: now.getTime() - (6 - i) * minuteMs,
	total: 60 + i * 2,
	closeness: 20 + i,
	lateGame: 16 + i,
	momentum: 14 + i,
	leadChanges: 8,
	comeback: 6,
	baseTotal: 60 + i * 2,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'close game, lead changes',
}));

const makeLiveGame = (overrides: Partial<Game> = {}): Game => ({
	id: liveGameId,
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period: 3,
	clockSeconds: 402,
	venueName: 'TD Garden',
	broadcasts: ['ESPN'],
	weather: { temperatureF: 62, conditionLabel: 'Clear' },
	homeTeam: { id: '1', name: 'Boston Celtics', abbreviation: 'BOS', score: 108 },
	awayTeam: { id: '3', name: 'Oklahoma City Thunder', abbreviation: 'OKC', score: 112 },
	...overrides,
});

const makeInningGame = (): Game => makeLiveGame({
	league: 'mlb',
	sportType: 'baseball',
	period: 7,
	topOfInning: false,
	baseRunners: { first: true, second: false, third: true },
	bso: { balls: 2, strikes: 1, outs: 2 },
});

const expectSingleLine = (el: HTMLElement, label: string) => {
	const style = getComputedStyle(el);
	const decoration = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']
		.reduce((sum, prop) => sum + parseFloat(style[prop as keyof CSSStyleDeclaration] as string || '0'), 0);
	expect(el.scrollWidth, `${label}: no horizontal overflow`).to.be.at.most(el.clientWidth);
	expect(el.getBoundingClientRect().height, `${label}: single line`)
		.to.be.at.most(parseFloat(style.lineHeight) + decoration + 1);
};

describe('gameDetailView countdown', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
		cy.clock(now.getTime(), ['Date', 'setTimeout', 'clearTimeout']);
	});

	it('leads with the scheduled date and time', () => {
		mountDetail(makePreGame(2 * dayMs + 5 * hourMs));
		cy.get('.gd-countdown-when').should('not.be.empty');
	});

	it('counts down in days, hours and minutes when more than a day out', () => {
		mountDetail(makePreGame(2 * dayMs + 5 * hourMs + 13 * minuteMs));
		cy.get('.gd-countdown-seg').should('have.length', 3);
		cy.get('.gd-countdown-clock').should('contain.text', 'd');
		cy.get('.gd-countdown-clock').should('not.contain.text', 's');
	});

	it('switches to hours, minutes and seconds inside the final day', () => {
		mountDetail(makePreGame(5 * hourMs + 13 * minuteMs + 42_000));
		cy.get('.gd-countdown-seg').should('have.length', 3);
		cy.get('.gd-countdown-clock').should('contain.text', 's');
		cy.get('.gd-countdown-clock').should('not.contain.text', 'd');
	});

	it('rolls the seconds digit once a second', () => {
		mountDetail(makePreGame(2 * hourMs + 30_000));
		cy.get('.gd-countdown-clock').should('contain.text', '30');
		cy.tick(1000);
		cy.get('.gd-countdown-clock').should('contain.text', '29');
	});

	it('pads minutes and seconds to two digits so the row never reflows', () => {
		mountDetail(makePreGame(3 * hourMs + 5 * minuteMs + 7_000));
		cy.get('.gd-countdown-zero').should('have.length', 2);
	});

	it('falls back to "Starts soon" once the clock runs out', () => {
		mountDetail(makePreGame(0));
		cy.get('.gd-countdown-soon').should('have.text', 'Starts soon');
	});

	it('falls back to "Starts soon" when no start time is scheduled', () => {
		mountDetail({ ...makePreGame(0), startTime: undefined });
		cy.get('.gd-countdown-soon').should('have.text', 'Starts soon');
	});

	it('keeps the countdown on one line in every locale', () => {
		mountDetail(makePreGame(13 * dayMs + 23 * hourMs + 59 * minuteMs));
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.gd-countdown-clock').should(([el]: JQuery<HTMLElement>) => {
				el.querySelectorAll('.gd-countdown-unit').forEach((unit, index) => {
					unit.textContent = [locale.detail.unitDays, locale.detail.unitHours, locale.detail.unitMinutes][index] ?? '';
				});
				expect(el.scrollWidth, `no overflow in ${name}`).to.be.at.most(el.parentElement!.clientWidth);
			});
		});
	});
});

describe('gameDetailView hero', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('labels each crest with the full team name and nothing else', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.game-detail-team-name').should('have.length', 2);
		cy.get('.game-detail-team-name').first().should('have.text', 'Oklahoma City Thunder');
		cy.get('.game-detail-team-name').last().should('have.text', 'Boston Celtics');
		cy.get('.gd-hero').should('not.contain.text', 'OKC');
	});

	it('falls back to the abbreviation for a team with no full name', () => {
		const game = makeLiveGame();
		mountDetail({ ...game, awayTeam: { ...game.awayTeam, name: '' } }, { excitementResult: excitement });
		cy.get('.game-detail-team-name').first().should('have.text', 'OKC');
	});

	it('puts each team\'s record directly under its name', () => {
		mountDetail(makeLiveGame({ id: recordsGameId }), { excitementResult: excitement });
		cy.get('.game-detail-team-record').should('have.length', 2);
		cy.get('.game-detail-team-record').first().should('have.text', '33-38');
		cy.get('.game-detail-team-record').last().should('have.text', '41-30');
		cy.get('.gd-hero').should(([hero]: JQuery<HTMLElement>) => {
			const name = hero.querySelector('.gd-area-away-label')!.getBoundingClientRect();
			const record = hero.querySelector('.gd-area-away-record')!.getBoundingClientRect();
			expect(record.top, 'record sits below its name').to.be.at.least(name.bottom - 1);
			expect(record.top - name.bottom, 'record hugs the name').to.be.at.most(4);
		});
	});

	// The record has a grid row of its own precisely so this holds.
	it('keeps both records on one line when only one team name wraps', () => {
		const game = makeLiveGame({ id: recordsGameId });
		mountDetail({ ...game, homeTeam: { ...game.homeTeam, name: 'Heat' } }, { excitementResult: excitement });
		cy.get('.game-detail-team-name').first().should(([away]: JQuery<HTMLElement>) => {
			expect(away.getBoundingClientRect().height, 'away name wraps').to.be.greaterThan(14);
		});
		cy.get('.game-detail-team-record').should(([away, home]: JQuery<HTMLElement>) => {
			expect(away.getBoundingClientRect().top, 'records share a row')
				.to.be.closeTo(home.getBoundingClientRect().top, 1);
		});
	});

	it('omits the record row when the summary has no record for the game', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.game-detail-team-record').should('not.exist');
	});

	// mock-3 carries an eight-character NHL record, the widest any league produces, against an
	// 80px nowrap column — this is where clipping shows up first.
	it('fits the widest record a league produces inside its 80px column', () => {
		mountDetail(makeLiveGame({ id: 'mock-3' }), { excitementResult: excitement });
		cy.get('.game-detail-team-record').first().should('have.text', '30-28-9');
		cy.get('.game-detail-team-record').last().should('have.text', '28-28-10');
		cy.get('.game-detail-team-record').each(($el: JQuery<HTMLElement>) => {
			const el = $el[0];
			expectSingleLine(el, 'widest record');
			expect(el.getBoundingClientRect().width, 'record fits its column').to.be.at.most(80);
		});
		cy.get('.gd-hero').should(([hero]: JQuery<HTMLElement>) => {
			expect(hero.scrollWidth, 'hero does not overflow the popup').to.be.at.most(hero.clientWidth);
		});
	});

	it('keeps records on one line and inside the crest column', () => {
		mountDetail(makeLiveGame({ id: recordsGameId }), { excitementResult: excitement });
		cy.get('.game-detail-team-record').each(($el: JQuery<HTMLElement>) => {
			expectSingleLine($el[0], 'team record');
		});
		cy.get('.gd-hero').should(([hero]: JQuery<HTMLElement>) => {
			expect(hero.scrollWidth, 'hero does not overflow the popup').to.be.at.most(hero.clientWidth);
		});
	});

	// Records add a third row to the matchup grid, so the hero's height budget is re-asserted
	// against the layout every real game gets.
	it('keeps the hero and the breakdown inside their pixel budgets with records shown', () => {
		mountDetail(makeLiveGame({ id: recordsGameId }), { excitementResult: excitement });
		cy.get('.game-detail-team-record').should('have.length', 2);
		cy.get('.game-detail-header').then(([header]: JQuery<HTMLElement>) => {
			cy.get('.gd-hero').then(([hero]: JQuery<HTMLElement>) => {
				const height = hero.getBoundingClientRect().bottom - header.getBoundingClientRect().top;
				expect(height, 'hero height').to.be.at.most(190);
			});
		});
		cy.get('.powerscore-breakdown').then(([el]: JQuery<HTMLElement>) => {
			expect(el.getBoundingClientRect().top, 'breakdown starts high').to.be.at.most(200);
		});
	});

	it('keeps the hero inside its pixel budget', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.game-detail-header').then(([header]: JQuery<HTMLElement>) => {
			cy.get('.gd-hero').then(([hero]: JQuery<HTMLElement>) => {
				const height = hero.getBoundingClientRect().bottom - header.getBoundingClientRect().top;
				expect(height, 'hero height').to.be.at.most(190);
			});
		});
	});

	it('starts the PowerScore breakdown above the fold', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.powerscore-breakdown').then(([el]: JQuery<HTMLElement>) => {
			expect(el.getBoundingClientRect().top, 'breakdown starts high').to.be.at.most(200);
		});
	});

	// The tight case: the base diamond puts a ~30px glyph between two 2.4ch numerals.
	it('fits the score row and base diamond inside the centre column', () => {
		mountDetail(makeInningGame(), { excitementResult: excitement });
		cy.get('.base-diamond').should('exist');
		cy.get('.game-detail-score-row').should(([row]: JQuery<HTMLElement>) => {
			expect(row.scrollWidth, 'score row does not overflow its column').to.be.at.most(row.clientWidth);
		});
		cy.get('.gd-hero').should(([hero]: JQuery<HTMLElement>) => {
			expect(hero.scrollWidth, 'hero does not overflow the popup').to.be.at.most(hero.clientWidth);
		});
	});

	it('centres the balls/strikes/outs count under the matchup', () => {
		mountDetail(makeInningGame(), { excitementResult: excitement });
		cy.get('.gd-bso-row').then(([row]: JQuery<HTMLElement>) => {
			const indicator = row.querySelector('.bso-indicator') as HTMLElement;
			const rowBox = row.getBoundingClientRect();
			const box = indicator.getBoundingClientRect();
			const leftGap = box.left - rowBox.left;
			const rightGap = rowBox.right - box.right;
			expect(leftGap, 'BSO is centred').to.be.closeTo(rightGap, 2);
		});
	});

	// Venue/broadcast/weather ordering moved to gameInfoPanel.cy.tsx, which asserts it for both
	// the pre-game and live arrangements rather than only the live one.

	it('shows the PowerScore only in the breakdown, never twice in one screen', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.gd-hero').should('not.contain.text', 'PowerScore');
		cy.get('.powerscore-breakdown-row-total').should('exist');
	});

	it('drops the win probability row, leaving it to the chart below', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.gd-winprob').should('not.exist');
		cy.get('.gd-chip').should('not.exist');
		cy.get('.sparkline').should('not.exist');
	});

	it('keeps the PowerScore reason in the breakdown', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.powerscore-breakdown-reason').should('contain.text', 'Close game, lead changes');
	});

	it('says what is happening when the clock is frozen', () => {
		mountDetail(makeLiveGame({ intermission: true, period: 2 }), { excitementResult: excitement });
		cy.get('.game-detail-period').should('contain.text', 'Halftime');
	});

	it('shows a series without repeating its summary', () => {
		mountDetail(makeLiveGame({ id: seriesGameId }), { excitementResult: excitement });
		cy.get('.series-dots-summary').should('contain.text', 'series');
		cy.get('.gd-hero').find('.series-dots-summary').should('have.length', 1);
	});
});

describe('gameDetailView sticky bar', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('carries nothing but the back button at rest', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		cy.get('.game-detail-back-button').should('contain.text', 'Back');
		cy.get('.gd-bar-compact').should('not.have.class', 'is-visible');
		cy.get('.gd-bar-compact').should('have.css', 'opacity', '0');
	});

	it('fades the compact matchup in once the card scrolls away', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo('bottom');
		cy.get('.gd-bar-compact').should('have.class', 'is-visible');
		cy.get('.gd-bar-compact').should('have.css', 'opacity', '1');
		cy.get('.gd-bar-compact').should('contain.text', '108').and('contain.text', '112');
	});

	it('centres the compact matchup on the card axis', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo('bottom');
		cy.get('.game-detail-header').then(([header]: JQuery<HTMLElement>) => {
			cy.get('.gd-bar-compact').should(([bar]: JQuery<HTMLElement>) => {
				const headerBox = header.getBoundingClientRect();
				const barBox = bar.getBoundingClientRect();
				const headerCentre = headerBox.left + headerBox.width / 2;
				const barCentre = barBox.left + barBox.width / 2;
				expect(barCentre, 'compact matchup is centred').to.be.closeTo(headerCentre, 1);
			});
		});
	});

	it('keeps the same bar height in both states so nothing jumps', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		cy.get('.game-detail-header').then(([el]: JQuery<HTMLElement>) => {
			const atRest = el.getBoundingClientRect().height;
			cy.get('.popup-container').scrollTo('bottom');
			cy.get('.game-detail-header').should(([scrolled]: JQuery<HTMLElement>) => {
				expect(scrolled.getBoundingClientRect().height, 'bar height is stable').to.equal(atRest);
			});
		});
	});

	it('pins to the top of the scroll container', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo(0, 300);
		cy.get('.popup-container').then(([container]: JQuery<HTMLElement>) => {
			cy.get('.game-detail-header').should(([header]: JQuery<HTMLElement>) => {
				const drift = header.getBoundingClientRect().top - container.getBoundingClientRect().top;
				expect(drift, 'header stays pinned').to.be.closeTo(0, 1);
			});
		});
	});

	it('keeps the compact matchup on one line in every locale', () => {
		mountDetail(makeLiveGame({ intermission: true, period: 2 }), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo('bottom');
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.gd-bar-status').should(([el]: JQuery<HTMLElement>) => {
				el.textContent = locale.detail.intermission;
				expectSingleLine(el, `status in ${name}`);
			});
			cy.get('.gd-bar-compact').should(([el]: JQuery<HTMLElement>) => {
				expect(el.getBoundingClientRect().width, `compact fits in ${name}`).to.be.at.most(296);
			});
		});
	});
});

// The detail screen renders the scorer's number verbatim: the card you tapped, this screen and
// the score the auto-switcher acted on must never disagree.
describe('win probability volatility', () => {
	const withVolatility: PowerScoreResult = { ...excitement, total: 77, winProbabilityVariance: 5 };

	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('shows a volatility row when the engine measured a win probability line', () => {
		mountDetail(makeLiveGame(), { excitementResult: withVolatility });
		cy.contains('.powerscore-breakdown-row', /Volatility/).should('exist');
	});

	it('renders the engine total verbatim rather than re-applying volatility', () => {
		mountDetail(makeLiveGame(), { excitementResult: withVolatility });
		cy.contains('.powerscore-breakdown-row', /Volatility/)
			.find('span')
			.last()
			.should('have.text', '+5');
		// 77, not 77 + 5 — the variance is already inside the engine total.
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '77 / 100');
	});

	// No line means no measurement, so no row — not a fabricated zero.
	it('omits the row entirely when the engine had no win probability to measure', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.contains('.powerscore-breakdown-row', /Volatility/).should('not.exist');
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '72 / 100');
	});

	// Regression: the screen used to recompute volatility and add it on top, so a card reading
	// 77 opened a screen reading 82.
	it('matches the list card exactly, with volatility applied', () => {
		mountDetail(makeLiveGame(), { excitementResult: withVolatility });
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '77 / 100');
		cy.mount(
			<LiveGameCard
				game={makeLiveGame()}
				excitementResult={withVolatility}
				favoriteTeamIds={new Set<string>()}
				onToggleFavoriteTeam={() => {}}
				onOpenGameDetail={() => {}}
				bettingPrefs={{ bettingEnabled: false }}
			/>,
		);
		cy.get('.game-card-ps-score').should('have.text', '77 / 100');
	});

	it('matches the list card when there is no volatility to apply', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '72 / 100');
		cy.mount(
			<LiveGameCard
				game={makeLiveGame()}
				excitementResult={excitement}
				favoriteTeamIds={new Set<string>()}
				onToggleFavoriteTeam={() => {}}
				onOpenGameDetail={() => {}}
				bettingPrefs={{ bettingEnabled: false }}
			/>,
		);
		cy.get('.game-card-ps-score').should('have.text', '72 / 100');
	});
});

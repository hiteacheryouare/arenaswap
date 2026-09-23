import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';
import { countdownParts, formatCompactCountdown } from '../../entrypoints/popup/components/startCountdown';
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

const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

// Fixed clock so the countdown is deterministic across runs.
const now = new Date('2026-08-01T12:00:00.000Z');

// Three DM Sans stacks coexist in this project, so the first family is the assertion rather than
// the whole string.
const face = ($el: JQuery<HTMLElement>) => getComputedStyle($el[0]!).fontFamily.split(',')[0]!.replace(/["']/g, '');

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

const seasonLeaders = (side: string) => ([
	{ category: 'homeRuns', fallbackLabel: 'HR', player: `${side} Slugger`, value: '31 HR' },
	{ category: 'battingAverage', fallbackLabel: 'AVG', player: `${side} Bat`, value: '.312' },
	{ category: 'earnedRunAverage', fallbackLabel: 'ERA', player: `${side} Arm`, value: '2.94' },
]);

// A bare scheduled game is 422px of content in a 560px popup, so the hero never leaves the
// viewport and the sticky bar never reaches its compact state. This is what a real scheduled
// game carries — both probable pitchers, three team leaders a side, a venue, a broadcast, the
// weather and a line — and it runs to 808px, which puts the hero out of view.
const makeScheduledSlate = (msUntilStart: number): Game => ({
	...makePreGame(msUntilStart),
	league: 'mlb',
	sportType: 'baseball',
	venueName: 'Citizens Bank Park',
	broadcasts: ['NBCSP'],
	weather: { temperatureF: 74, conditionLabel: 'Clear' },
	odds: { details: 'PHI -1.5', overUnder: 8.5 },
	homeTeam: {
		id: 'h',
		name: 'Philadelphia Phillies',
		abbreviation: 'PHI',
		score: 0,
		leaders: seasonLeaders('Home'),
		probableStarter: { name: 'Home Ace', winLoss: '12-4', era: '2.81' },
	},
	awayTeam: {
		id: 'a',
		name: 'Atlanta Braves',
		abbreviation: 'ATL',
		score: 0,
		leaders: seasonLeaders('Away'),
		probableStarter: { name: 'Away Ace', winLoss: '9-7', era: '3.45' },
	},
});

interface MountOverrides {
	excitementResult?: PowerScoreResult;
	scoreHistory?: ScoreSnapshot[];
	powerScoreHistory?: PowerScoreSnapshot[];
	proTipsEnabled?: boolean;
	bettingEnabled?: boolean;
}

const mountDetail = (game: Game, overrides: MountOverrides = {}) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={overrides.excitementResult}
			scoreHistory={overrides.scoreHistory ?? []}
			powerScoreHistory={overrides.powerScoreHistory ?? []}
			proTipsEnabled={overrides.proTipsEnabled ?? false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled: overrides.bettingEnabled ?? false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false }}
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
	signalsSubtotal: 60 + i * 2,
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

// The hero is a band of the two teams' colours, and which colour a team is shown in is the
// resolver's answer rather than its published primary — two near-identical purples send one side to
// its alternate. Everything drawn on that hero, the crest included, has to be measured against the
// colour actually painted, so the resolved pair is what reaches it.
describe('the hero is painted in the colours the resolver chose', () => {
	const clashingPurples: Game = {
		id: 'mock-7',
		league: 'nba',
		sportType: 'basketball',
		status: 'in',
		period: 3,
		clockSeconds: 300,
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 80, color: '#552583', alternateColor: '#FDB927' },
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 78, color: '#5A2D81', alternateColor: '#63727A' },
	};

	it('paints the alternate when the two primaries clash', () => {
		mountDetail(clashingPurples);
		cy.get('.gd-hero-live').should('exist').then($hero => {
			const image = getComputedStyle($hero[0]!).backgroundImage;
			// The away side gave up its purple for its gold; the home side kept its own purple.
			expect(image, 'the away alternate').to.include('rgb(253, 185, 39)');
			expect(image, 'the home primary').to.include('rgb(90, 45, 129)');
			expect(image, 'and not the away primary').to.not.include('rgb(85, 37, 131)');
		});
	});
});

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

	// The fallback is a word, not a figure, so it takes the body face. Lekton is for the countdown
	// digits beside it and for every other number in the popup.
	it('sets "Starts soon" in the body font rather than the scoreboard face', () => {
		mountDetail(makePreGame(0));
		cy.get('.gd-countdown-soon').should($el => {
			expect(face($el), 'countdown fallback face').to.equal('DM Sans');
		});
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

	// Blank rather than lettered, since the abbreviation is already directly below it — but it still
	// holds the 46px disc inside its 52px box so the grid does not move when a logo arrives.
	it('holds a blank crest box above each team name', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.game-detail-team-logo').should('have.length', 2).each(($crest: JQuery<HTMLElement>) => {
			expect($crest.attr('data-crest-state')).to.equal('missing');
			expect($crest[0]!.getBoundingClientRect()).to.deep.include({ width: 52, height: 52 });
			expect($crest.text(), 'no letters in this one').to.equal('');
			expect($crest[0]!.querySelector('.crest-fallback')!.getBoundingClientRect())
				.to.deep.include({ width: 46, height: 46 });
		});
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
	//
	// The breakdown budget is 206 rather than the 200 the plain hero gets because the tab strip
	// now sits between the two, and a records hero is the tallest thing it can sit under. Still
	// comfortably inside the popup's 560px: what this guards is that the PowerScore is the first
	// thing on the screen, not an exact offset.
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
			expect(el.getBoundingClientRect().top, 'breakdown starts high').to.be.at.most(206);
		});
	});

	/* The two budgets above cover a hero with nothing extra on it. These two cover the shapes this
	   change adds, because neither of those fixtures carries a timeout row or an at-bat pair and so
	   neither would notice the hero growing.

	   Gridiron still fits: the timeout row costs a line and lands at 185 against the same 190.
	   Baseball deliberately does not. The at-bat pair is two 32px portraits on a plate, and it takes
	   the hero to 233 and the breakdown to 273 — half a 560px popup before the PowerScore starts.
	   That is a real cost, taken with eyes on it, and it is pinned here so it cannot grow again
	   quietly. If it ever has to come back down, the portraits are most of it. */
	it('keeps the gridiron hero inside the plain budget once timeouts are on it', () => {
		mountDetail(makeLiveGame({
			id: recordsGameId,
			league: 'nfl',
			sportType: 'football',
			period: 4,
			homeTeam: { id: '1', name: 'Boston Celtics', abbreviation: 'BOS', score: 17, timeouts: 1 },
			awayTeam: { id: '3', name: 'Oklahoma City Thunder', abbreviation: 'OKC', score: 17, timeouts: 3 },
		}), { excitementResult: excitement });

		cy.get('.gd-hero-live .timeout-dots').should('have.length', 2);
		cy.get('.game-detail-header').then(([header]: JQuery<HTMLElement>) => {
			cy.get('.gd-hero').then(([hero]: JQuery<HTMLElement>) => {
				const height = hero.getBoundingClientRect().bottom - header.getBoundingClientRect().top;
				expect(height, 'hero height').to.be.at.most(190);
			});
		});
	});

	it('holds the at-bat hero to its own, larger budget', () => {
		mountDetail({
			...makeInningGame(),
			id: recordsGameId,
			atBat: {
				pitcher: { name: 'Will Dion', jersey: '76', position: 'RP', summary: '1.1 IP, 0 ER, H, BB' },
				batter: { name: 'Nathan Church', jersey: '27', position: 'CF', summary: '0-2, K' },
			},
		}, { excitementResult: excitement });

		cy.get('.gd-atbat-panel').should('exist');
		cy.get('.game-detail-header').then(([header]: JQuery<HTMLElement>) => {
			cy.get('.gd-hero').then(([hero]: JQuery<HTMLElement>) => {
				const height = hero.getBoundingClientRect().bottom - header.getBoundingClientRect().top;
				expect(height, 'hero height with the at-bat pair').to.be.at.most(240);
			});
		});
		cy.get('.powerscore-breakdown').then(([el]: JQuery<HTMLElement>) => {
			expect(el.getBoundingClientRect().top, 'breakdown still on the first screen').to.be.at.most(280);
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

	it('shows the clock stall penalty row for a clock-based sport', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.contains('Clock stall penalty').should('exist');
	});

	it('hides the clock stall penalty row for a sport with no clock', () => {
		mountDetail(makeInningGame(), { excitementResult: excitement });
		cy.contains('Clock stall penalty').should('not.exist');
	});

	it('says what is happening when the clock is frozen', () => {
		mountDetail(makeLiveGame({ intermission: true, period: 2 }), { excitementResult: excitement });
		cy.get('.game-detail-period').should('contain.text', 'Halftime');
	});

	// Lekton is there to hold a ticking clock's columns still. The states that replace the clock with
	// a word have nothing to hold, so they read as the words they are.
	it('sets the word statuses in the body face and keeps the clock in Lekton', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.game-detail-period').should($el => expect(face($el), 'a running clock').to.equal('Lekton'));

		mountDetail(makeLiveGame({ intermission: true, period: 2 }), { excitementResult: excitement });
		cy.get('.game-detail-period').should($el => expect(face($el), 'halftime').to.equal('DM Sans'));

		mountDetail(makeLiveGame({ status: 'post' }), { excitementResult: excitement });
		cy.get('.game-detail-period').should($el => expect(face($el), 'a final').to.equal('DM Sans'));
	});

	it('shows a series without repeating its summary', () => {
		mountDetail(makeLiveGame({ id: seriesGameId }), { excitementResult: excitement });
		cy.get('.series-dots-summary').should('contain.text', 'series');
		// The summary is a label, not tabular data, so it belongs in the sans face rather than Lekton.
		cy.get('.series-dots-summary').should('have.css', 'font-family').and('contain', 'DM Sans');
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

	it('keeps its scores while a game is under way', () => {
		mountDetail(makeLiveGame({ startTime: new Date(now.getTime() - hourMs).toISOString() }), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo('bottom');
		cy.get('.gd-bar-score').should('have.length', 2);
		// startTime is populated for every status, so the countdown is kept off a live bar by the
		// pre-game gate alone. Pinned to the whole string: a period and clock is what belongs here.
		cy.get('.gd-bar-status').should('have.text', 'Q3 \u2022 6:42');
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

// Before a start the two scores are both 0 and stay 0 until first pitch, so the bar hands its
// whole job to the abbreviations and the figures are noise. The countdown takes the slot the
// live status text holds, which resolveStatusText leaves empty for a scheduled game.
describe('gameDetailView sticky bar before a start', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
		cy.clock(now.getTime(), ['Date', 'setTimeout', 'clearTimeout']);
	});

	const mountScrolled = (game: Game) => {
		mountDetail(game, { proTipsEnabled: true, bettingEnabled: true });
		cy.get('.popup-container').scrollTo('bottom');
		cy.get('.gd-bar-compact').should('have.class', 'is-visible');
	};

	it('drops both scores and keeps the matchup', () => {
		mountScrolled(makeScheduledSlate(5 * hourMs + 13 * minuteMs + 42_000));
		cy.get('.gd-bar-score').should('not.exist');
		cy.get('.gd-bar-compact').should('contain.text', 'ATL').and('contain.text', 'PHI');
		cy.get('.gd-bar-logo').should('have.length', 2);
		cy.get('.gd-bar-sep').should('have.length', 1);
	});

	it('counts down to the start in the slot the status text would hold', () => {
		mountScrolled(makeScheduledSlate(5 * hourMs + 13 * minuteMs + 42_000));
		cy.get('.gd-bar-status').should('have.text', '5h 13m').and('have.css', 'opacity', '1');
	});

	it('shows days and hours further out, and pairs minutes with seconds close in', () => {
		mountScrolled(makeScheduledSlate(2 * dayMs + 5 * hourMs + 13 * minuteMs));
		cy.get('.gd-bar-status').should('have.text', '2d 05h');
		mountScrolled(makeScheduledSlate(13 * minuteMs + 42_000));
		cy.get('.gd-bar-status').should('have.text', '13m 42s');
	});

	it('ticks once a second', () => {
		mountScrolled(makeScheduledSlate(2 * hourMs + 30_000));
		cy.get('.gd-bar-status').should('have.text', '2h 00m');
		cy.tick(31_000);
		cy.get('.gd-bar-status').should('have.text', '1h 59m');
	});

	it('says "Starts soon" once the clock runs out rather than counting up', () => {
		mountScrolled(makeScheduledSlate(0));
		cy.get('.gd-bar-status').should('have.text', 'Starts soon');
	});

	it('carries nothing at all when no start time is scheduled', () => {
		mountScrolled({ ...makeScheduledSlate(0), startTime: undefined });
		cy.get('.gd-bar-status').should('not.exist');
	});

	it('gives the slot to a delay description instead of the countdown', () => {
		mountScrolled({ ...makeScheduledSlate(5 * hourMs), delayed: true, delayDescription: 'Rain Delay' });
		cy.get('.gd-bar-status').should('have.text', 'Rain Delay');
	});

	it('fits the slot in every locale, in all three shapes the countdown takes', () => {
		const target = now.getTime() + dayMs;
		// The widest value each shape can reach, so a locale that fits these fits everything.
		const shapes = {
			'days and hours': 13 * dayMs + 23 * hourMs,
			'hours and minutes': 23 * hourMs + 59 * minuteMs,
			'minutes and seconds': 59 * minuteMs + 59_000,
		};

		mountScrolled(makeScheduledSlate(dayMs));
		Object.entries(locales).forEach(([name, locale]) => {
			// Substituted rather than mounted per locale, which is sound only because the slot is
			// absolutely positioned at a fixed max-width: its box does not depend on its content or
			// on anything beside it, so a locale that clips here clips exactly the same way mounted.
			// The string itself comes from the real formatter reading the real locale file.
			const t = (key: string) => (locale.detail as Record<string, string>)[key.split('.')[1]];
			Object.entries(shapes).forEach(([shape, offset]) => {
				cy.get('.gd-bar-status').should(([el]: JQuery<HTMLElement>) => {
					el.textContent = formatCompactCountdown(countdownParts(target + offset, target), t);
					expectSingleLine(el, `${shape} in ${name} (${el.textContent})`);
				});
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

// This used to live on the list card, directly above the venue and the networks, where it read as
// one more line of venue chrome. Its home now is a titled section of its own, first in the live
// stack — so the assertions are about the heading and the ordering as much as the text.
describe('gameDetailView latest play', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('gives the play a heading of its own', () => {
		mountDetail(makeLiveGame({ lastPlay: 'J.Tatum makes 26-foot three point jumper' }), { excitementResult: excitement });
		cy.get('.gd-play-heading').should('have.text', 'Latest play');
		cy.get('.gd-play-text').should('have.text', 'J.Tatum makes 26-foot three point jumper');
	});

	it('sits above the PowerScore breakdown, not beside the venue', () => {
		mountDetail(makeLiveGame({ lastPlay: 'J.Tatum makes 26-foot three point jumper' }), { excitementResult: excitement });
		cy.get('.gd-play-panel').then(([play]: JQuery<HTMLElement>) => {
			cy.get('.powerscore-breakdown').then(([breakdown]: JQuery<HTMLElement>) => {
				expect(play.compareDocumentPosition(breakdown) & Node.DOCUMENT_POSITION_FOLLOWING, 'breakdown follows the play').to.be.greaterThan(0);
			});
			cy.get('.game-info-panel').then(([info]: JQuery<HTMLElement>) => {
				expect(play.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING, 'the venue panel is further down still').to.be.greaterThan(0);
			});
		});
	});

	// ESPN joins a penalty's two sentences with a newline. Collapsing it produces one run-on
	// sentence that reads as a single play.
	it('keeps a two-sentence penalty on two lines', () => {
		const penalty = 'A.Jeanty up the middle to LAC 49 for 1 yard (D.Phillips).\nPENALTY on LV-S.Burford, Offensive Holding, 10 yards, enforced at 50 - No Play.';
		mountDetail(makeLiveGame({ sportType: 'football', league: 'nfl', lastPlay: penalty }), { excitementResult: excitement });
		cy.get('.gd-play-text').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).whiteSpace).to.equal('pre-line');
			// A block element reports one client rect however many lines it draws, so the count has
			// to come off a Range over the text itself.
			const range = el.ownerDocument.createRange();
			range.selectNodeContents(el);
			const lineTops = new Set([...range.getClientRects()].map(rect => Math.round(rect.top)));
			expect(lineTops.size, 'the penalty draws on its own line').to.be.greaterThan(1);
		});
	});

	it('carries the drive summary under the play where football sends one', () => {
		mountDetail(
			makeLiveGame({ sportType: 'football', league: 'nfl', lastPlay: 'Timeout #1 by GB at 01:11.', lastPlayDrive: '1 play, 0 yards, 0:04' }),
			{ excitementResult: excitement },
		);
		cy.get('.gd-play-drive').should('have.text', '1 play, 0 yards, 0:04');
	});

	it('is absent entirely when ESPN sends no play', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.gd-play-panel').should('not.exist');
	});

	it('keeps the heading on one line in every locale', () => {
		mountDetail(makeLiveGame({ lastPlay: 'J.Tatum makes 26-foot three point jumper' }), { excitementResult: excitement });
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.gd-play-heading').should(([el]: JQuery<HTMLElement>) => {
				el.textContent = locale.detail.latestPlayHeading;
				expect(el.scrollWidth, `no overflow in ${name}`).to.be.at.most(el.clientWidth);
			});
		});
	});
});

describe('gameDetailView at-bat panel', () => {
	const atBat = {
		pitcher: { name: 'Will Dion', jersey: '76', position: 'RP', summary: '1.1 IP, 0 ER, H, BB' },
		batter: { name: 'Nathan Church', jersey: '27', position: 'CF', summary: '0-2, K' },
	};

	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('names both players and carries ESPN\'s line for each', () => {
		mountDetail(makeInningGame(), { excitementResult: excitement });
		cy.get('.gd-atbat-panel').should('not.exist');

		// The fixture is the bottom of the 7th, so the visitors are pitching and their man stands
		// on the left, under his own club.
		mountDetail({ ...makeInningGame(), atBat }, { excitementResult: excitement });
		cy.get('.gd-atbat-name').first().should('have.text', 'Will Dion');
		cy.get('.gd-atbat-name').last().should('have.text', 'Nathan Church');
		cy.get('.gd-atbat-line').first().should('have.text', '1.1 IP, 0 ER, H, BB');
		cy.get('.gd-atbat-line').last().should('have.text', '0-2, K');
		cy.get('.gd-atbat-role').first().should('have.text', 'Pitching');
		cy.get('.gd-atbat-role').last().should('have.text', 'At bat');
	});

	// The hero puts the away team on the left, and the halves of an inning decide who bats. A
	// fixed pitcher-left panel would stand a man under the other team's crest for half the game.
	it('swaps the two ends at the half-inning so each player stands under his own club', () => {
		mountDetail({ ...makeInningGame(), topOfInning: true, atBat }, { excitementResult: excitement });
		cy.get('.gd-atbat-side').first().should('have.class', 'gd-atbat-away');
		cy.get('.gd-atbat-role').first().should('have.text', 'At bat');
		cy.get('.gd-atbat-name').first().should('have.text', 'Nathan Church');
		cy.get('.gd-atbat-role').last().should('have.text', 'Pitching');
		cy.get('.gd-atbat-name').last().should('have.text', 'Will Dion');

		mountDetail({ ...makeInningGame(), topOfInning: false, atBat }, { excitementResult: excitement });
		cy.get('.gd-atbat-role').first().should('have.text', 'Pitching');
		cy.get('.gd-atbat-name').first().should('have.text', 'Will Dion');
	});

	// Whichever role occupies it, the right-hand half mirrors so the two portraits bracket the
	// panel — the mirroring is keyed on the side, not on the role, so it must not swap too.
	it('keeps the mirrored half on the home side through the swap', () => {
		mountDetail({ ...makeInningGame(), topOfInning: true, atBat }, { excitementResult: excitement });
		cy.get('.gd-atbat-side.gd-atbat-home').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).flexDirection).to.equal('row-reverse');
		});
		cy.get('.gd-atbat-side.gd-atbat-away').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).flexDirection).to.equal('row');
		});
	});

	// ESPN draws no portrait for a good share of players, so the initials are a normal state
	// rather than a failure.
	it('falls back to initials when a player has no headshot', () => {
		mountDetail({ ...makeInningGame(), atBat }, { excitementResult: excitement });
		cy.get('.gd-atbat-face-crest').should('have.length', 2);
		cy.get('.gd-atbat-face-crest').first().should('have.text', 'WD');
		cy.get('.gd-atbat-face-crest').last().should('have.text', 'NC');
	});

	// Its whole point is telling one figure from another at a glance, which a proportional face
	// does as well here as a monospaced one — and Lekton is reserved for columns that line up.
	it('sets the line in the body face rather than in Lekton', () => {
		mountDetail({ ...makeInningGame(), atBat }, { excitementResult: excitement });
		cy.get('.gd-atbat-line').first().should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).fontFamily).to.not.match(/Lekton/i);
		});
	});

	it('keeps both role labels on one line in every locale', () => {
		mountDetail({ ...makeInningGame(), atBat }, { excitementResult: excitement });
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.gd-atbat-role').should(($roles: JQuery<HTMLElement>) => {
				const labels = [locale.detail.pitchingLabel, locale.detail.atBatLabel];
				$roles.each((index, el) => {
					el.textContent = labels[index] ?? '';
					expect(el.scrollWidth, `no overflow in ${name}`).to.be.at.most(el.parentElement!.clientWidth);
				});
			});
		});
	});
});

// The same 3px rule the game list's section titles carry, in the colour of whoever made the play.
describe('gameDetailView latest play accent', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	const coloured = makeLiveGame({
		lastPlay: 'J.Tatum makes 26-foot three point jumper',
		homeTeam: { id: '1', name: 'Boston Celtics', abbreviation: 'BOS', score: 108, color: '#007A33' },
		awayTeam: { id: '3', name: 'Oklahoma City Thunder', abbreviation: 'OKC', score: 112, color: '#007AC1' },
	});

	it('takes the colour of the side that made the play', () => {
		mountDetail({ ...coloured, lastPlayTeamId: '1' }, { excitementResult: excitement });
		cy.get('.gd-play-body').should('have.class', 'has-accent').then(([home]: JQuery<HTMLElement>) => {
			const homeInk = getComputedStyle(home).borderLeftColor;

			mountDetail({ ...coloured, lastPlayTeamId: '3' }, { excitementResult: excitement });
			cy.get('.gd-play-body').should(([away]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(away).borderLeftColor, 'the two sides are not drawn alike').to.not.equal(homeInk);
			});
		});
	});

	it('keeps the indent but drops the rule when ESPN names nobody', () => {
		mountDetail(coloured, { excitementResult: excitement });
		cy.get('.gd-play-body').should('not.have.class', 'has-accent').should(([el]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(el);
			expect(style.borderLeftColor, 'no team, no colour').to.equal('rgba(0, 0, 0, 0)');
			// The indent survives so the block does not jump sideways between plays.
			expect(parseFloat(style.paddingLeft), 'the indent survives').to.be.greaterThan(0);
		});
	});

	it('marks the play rather than the heading, which reads the same whoever did it', () => {
		mountDetail({ ...coloured, lastPlayTeamId: '1' }, { excitementResult: excitement });
		cy.get('.gd-play-heading').should(([el]: JQuery<HTMLElement>) => {
			expect(parseFloat(getComputedStyle(el).borderLeftWidth)).to.equal(0);
		});
	});
});

describe('gameDetailView hero timeouts', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	const gridiron = makeLiveGame({
		league: 'nfl',
		sportType: 'football',
		period: 4,
		homeTeam: { id: '1', name: 'Boston Celtics', abbreviation: 'BOS', score: 17, timeouts: 1 },
		awayTeam: { id: '3', name: 'Oklahoma City Thunder', abbreviation: 'OKC', score: 17, timeouts: 3 },
	});

	it('draws each side its own row under the record', () => {
		mountDetail(gridiron, { excitementResult: excitement });
		cy.get('.gd-hero-live .timeout-dots').should('have.length', 2);
		cy.get('.gd-area-away-timeouts .timeout-dot').not('.is-empty').should('have.length', 3);
		cy.get('.gd-area-home-timeouts .timeout-dot').not('.is-empty').should('have.length', 1);
	});

	// The card's rule for these is a light-surface grey, and it has to lose to the hero's — the
	// same trap the balls/strikes/outs count fell into.
	it('re-tones both halves of the row for the scrim', () => {
		mountDetail(gridiron, { excitementResult: excitement });
		cy.get('.gd-hero-live .timeout-dot.is-empty').first().should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).color, 'not the light-card grey').to.not.equal('rgb(156, 163, 175)');
		});
		cy.get('.gd-hero-live .timeout-dot').not('.is-empty').first().should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).color, 'not the light-card ink').to.not.equal('rgb(55, 65, 81)');
		});
	});

	it('leaves the hero untouched for a sport with no timeouts', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.gd-hero-live .timeout-dots').should('not.exist');
	});
});

import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import { formatStartClock } from '../../entrypoints/popup/components/detailHero';
import type { Browser } from 'wxt/browser';
import type { Game, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot, TabRegistration } from '@arenaswap/core/types';
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

// What a real scheduled game carries — both probable pitchers, three team leaders a side, a venue,
// a broadcast, the weather and a line — which runs long enough to put the stage out of view.
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
	openTabs?: Browser.tabs.Tab[];
	registry?: TabRegistration[];
	favoriteTeamIds?: Set<string>;
	onToggleFavoriteTeam?: (leagueId: string, teamId: string) => void;
	tabAssignEnabled?: boolean;
	dismiss?: 'back' | 'close';
	onBack?: () => void;
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
			openTabs={overrides.openTabs}
			registry={overrides.registry}
			favoriteTeamIds={overrides.favoriteTeamIds}
			onToggleFavoriteTeam={overrides.onToggleFavoriteTeam}
			tabAssignEnabled={overrides.tabAssignEnabled}
			dismiss={overrides.dismiss}
			onSetGameBoost={() => {}}
			onBack={overrides.onBack ?? (() => {})}
		/>,
	);
};

// `mock-` ids short-circuit useSummaryData to a deterministic LCG, so nothing hits the network.
// Only mock-4/14/16 also carry a canned playoff series.
const liveGameId = 'mock-7';
const seriesGameId = 'mock-14';
// mock-2 carries canned records and no playoff series.
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

const within = (inner: DOMRect, outer: DOMRect, label: string) => {
	expect(inner.left, `${label}: left edge`).to.be.at.least(outer.left - 0.5);
	expect(inner.right, `${label}: right edge`).to.be.at.most(outer.right + 0.5);
};

// Everything drawn on the stage stays inside it. The colour field is inset past the edges on
// purpose and clipped, so it is the one thing left out.
const expectInsideStage = (hero: HTMLElement) => {
	const stage = hero.getBoundingClientRect();
	hero.querySelectorAll<HTMLElement>('.dt-head, .as-stage-meta, .as-stage-match, .as-stage-team > *, .as-stage-score, .dt-situation, .dt-situation > *, .as-stage-foot').forEach(el => {
		within(el.getBoundingClientRect(), stage, el.className || el.tagName);
	});
};

const tab = (id: number, index: number, active = false) => ({ id, index, active, title: `Tab ${id}` }) as Browser.tabs.Tab;

// The stage is a field of the two teams' colours, and which colour a team is shown in is the
// resolver's answer rather than its published primary — two near-identical purples send one side to
// its alternate. Everything drawn on the stage has to be measured against the colour actually
// painted, so the resolved pair is what reaches it.
describe('the stage is painted in the colours the resolver chose', () => {
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
		cy.get('.dt-hero').should(([hero]: JQuery<HTMLElement>) => {
			const away = hero.style.getPropertyValue('--stage-away').toLowerCase();
			const home = hero.style.getPropertyValue('--stage-home').toLowerCase();
			// The away side gave up its purple for its gold; the home side kept its own purple.
			expect(away, 'the away alternate').to.equal('#fdb927');
			expect(home, 'the home primary').to.equal('#5a2d81');
		});
	});
});

describe('gameDetailView countdown', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
		cy.clock(now.getTime(), ['Date', 'setTimeout', 'clearTimeout']);
	});

	// Nothing else on the screen says which day it is, so a start that isn't today carries its date.
	it('leads with the scheduled date and time', () => {
		const game = makePreGame(2 * dayMs + 5 * hourMs);
		mountDetail(game);
		cy.get('.dt-hero .as-clock').should('have.text', formatStartClock(game.startTime, now));
		cy.get('.dt-hero .as-clock').invoke('text').should('match', /\d/).and('have.length.greaterThan', 8);
	});

	it('gives a start later today its time alone', () => {
		const game = makePreGame(3 * hourMs);
		mountDetail(game);
		cy.get('.dt-hero .as-clock').should('have.text', new Date(game.startTime!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
	});

	it('counts down in days, hours and minutes when more than a day out', () => {
		mountDetail(makePreGame(2 * dayMs + 5 * hourMs + 13 * minuteMs));
		cy.get('.dt-countdown-seg').should('have.length', 3);
		cy.get('.dt-countdown-clock').should('contain.text', 'd');
		cy.get('.dt-countdown-clock').should('not.contain.text', 's');
	});

	it('switches to hours, minutes and seconds inside the final day', () => {
		mountDetail(makePreGame(5 * hourMs + 13 * minuteMs + 42_000));
		cy.get('.dt-countdown-seg').should('have.length', 3);
		cy.get('.dt-countdown-clock').should('contain.text', 's');
		cy.get('.dt-countdown-clock').should('not.contain.text', 'd');
	});

	it('rolls the seconds digit once a second', () => {
		mountDetail(makePreGame(2 * hourMs + 30_000));
		cy.get('.dt-countdown-clock').should('contain.text', '30');
		cy.tick(1000);
		cy.get('.dt-countdown-clock').should('contain.text', '29');
	});

	it('pads minutes and seconds to two digits so the row never reflows', () => {
		mountDetail(makePreGame(3 * hourMs + 5 * minuteMs + 7_000));
		cy.get('.dt-countdown-zero').should('have.length', 2);
	});

	// "Starts in 5h 13m 42s on NBC": one sentence, translated whole, with the live clock inside it.
	it('says where to watch in the same sentence', () => {
		mountDetail({ ...makePreGame(5 * hourMs + 13 * minuteMs + 42_000), broadcasts: ['NBC', 'Peacock', 'Telemundo'] });
		cy.get('.dt-hero .as-stage-note .dt-countdown').invoke('text')
			.should('match', /^Starts in 5h 13m 42s on NBC and Peacock$/);
	});

	it('falls back to "Starts soon" once the clock runs out', () => {
		mountDetail(makePreGame(0));
		cy.get('.dt-countdown-soon').should('have.text', 'Starts soon');
	});

	it('sets the sentence in the product face with tabular figures', () => {
		mountDetail(makePreGame(2 * hourMs));
		cy.get('.dt-countdown-clock').should($el => {
			expect(face($el), 'countdown face').to.equal('Inter');
			expect($el[0]!.classList.contains('num'), 'tabular figures').to.equal(true);
		});
		mountDetail(makePreGame(0));
		cy.get('.dt-countdown-soon').should($el => expect(face($el), 'fallback face').to.equal('Inter'));
	});

	it('falls back to "Starts soon" when no start time is scheduled', () => {
		mountDetail({ ...makePreGame(0), startTime: undefined });
		cy.get('.dt-countdown-soon').should('have.text', 'Starts soon');
	});

	it('keeps the countdown on one line in every locale', () => {
		mountDetail(makePreGame(13 * dayMs + 23 * hourMs + 59 * minuteMs));
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.dt-countdown-clock').should(([el]: JQuery<HTMLElement>) => {
				el.querySelectorAll('.dt-countdown-unit').forEach((unit, index) => {
					unit.textContent = [locale.detail.unitDays, locale.detail.unitHours, locale.detail.unitMinutes][index] ?? '';
				});
				const note = el.closest('.as-stage-note')!.getBoundingClientRect();
				const tops = new Set([...el.getClientRects()].map(rect => Math.round(rect.top)));
				expect(tops.size, `one line in ${name}`).to.equal(1);
				expect(el.getBoundingClientRect().width, `no overflow in ${name}`).to.be.at.most(note.width);
			});
		});
	});
});

describe('gameDetailView stage', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('names each team by its nickname, falling back to the full name', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-team b').should('have.length', 2);
		cy.get('.dt-hero .as-stage-team b').first().should('have.text', 'Oklahoma City Thunder');
		cy.get('.dt-hero .as-stage-team b').last().should('have.text', 'Boston Celtics');

		const game = makeLiveGame();
		mountDetail({ ...game, awayTeam: { ...game.awayTeam, nickname: 'Thunder' }, homeTeam: { ...game.homeTeam, nickname: 'Celtics' } }, { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-team b').first().should('have.text', 'Thunder');
		cy.get('.dt-hero .as-stage-team b').last().should('have.text', 'Celtics');
	});

	// Letters rather than a blank, since the crest is missing — but inside the same 48px box, so the
	// columns do not move when a logo arrives.
	it('holds a 48px crest box above each team name', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-team .as-crest-box').should('have.length', 2).each(($box: JQuery<HTMLElement>) => {
			expect($box[0]!.getBoundingClientRect()).to.deep.include({ width: 48, height: 48 });
			expect($box.find('.crest').attr('data-crest-state')).to.equal('missing');
		});
		cy.get('.dt-hero .as-stage-team .as-crest-box').first().should('contain.text', 'OKC');
	});

	it('falls back to the abbreviation for a team with no name at all', () => {
		const game = makeLiveGame();
		mountDetail({ ...game, awayTeam: { ...game.awayTeam, name: '' } }, { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-team b').first().should('have.text', 'OKC');
	});

	it('puts each team\'s record directly under its name', () => {
		mountDetail(makeLiveGame({ id: recordsGameId }), { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-team small').should('have.length', 2);
		cy.get('.dt-hero .as-stage-team small').first().should('have.text', '33-38');
		cy.get('.dt-hero .as-stage-team small').last().should('have.text', '41-30');
		cy.get('.dt-hero .as-stage-team').first().should(([team]: JQuery<HTMLElement>) => {
			const name = team.querySelector('b')!.getBoundingClientRect();
			const record = team.querySelector('small')!.getBoundingClientRect();
			expect(record.top, 'record sits below its name').to.be.at.least(name.bottom - 1);
			expect(record.top - name.bottom, 'record hugs the name').to.be.at.most(4);
		});
	});

	// The two sides share their rows, so one name wrapping cannot knock the records out of level.
	it('keeps both records level when only one team name wraps', () => {
		const game = makeLiveGame({ id: recordsGameId });
		mountDetail({ ...game, awayTeam: { ...game.awayTeam, nickname: 'Fighting Illini Rams' }, homeTeam: { ...game.homeTeam, nickname: 'Heat' } }, { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-team b').first().should(([away]: JQuery<HTMLElement>) => {
			expect(away.getBoundingClientRect().height, 'away name wraps').to.be.greaterThan(20);
		});
		cy.get('.dt-hero .as-stage-team small').should(([away, home]: JQuery<HTMLElement>) => {
			expect(away!.getBoundingClientRect().top, 'records share a row')
				.to.be.closeTo(home!.getBoundingClientRect().top, 1);
		});
	});

	it('omits the record row when the summary has no record for the game', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-team small').should('not.exist');
	});

	// mock-3 carries an eight-character NHL record, the widest any league produces.
	it('fits the widest record a league produces inside its team column', () => {
		mountDetail(makeLiveGame({ id: 'mock-3' }), { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-team small').first().should('have.text', '30-28-9');
		cy.get('.dt-hero .as-stage-team small').last().should('have.text', '28-28-10');
		cy.get('.dt-hero .as-stage-team small').each(($el: JQuery<HTMLElement>) => {
			const el = $el[0]!;
			expectSingleLine(el, 'widest record');
			within(el.getBoundingClientRect(), el.parentElement!.getBoundingClientRect(), 'record in its column');
		});
		cy.get('.dt-hero').should(([hero]: JQuery<HTMLElement>) => expectInsideStage(hero));
	});

	// A three-digit score takes the list's own 64px split, and the names still stay inside the stage.
	it('keeps a three-digit scoreline and long names inside the stage', () => {
		const game = makeLiveGame({ id: recordsGameId });
		mountDetail({
			...game,
			awayTeam: { ...game.awayTeam, nickname: 'Timberwolves', score: 118 },
			homeTeam: { ...game.homeTeam, nickname: 'Trail Blazers', score: 121 },
		}, { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-score').should('have.class', 'is-wide');
		cy.get('.dt-hero').then(([hero]: JQuery<HTMLElement>) => {
			const stage = hero.getBoundingClientRect();
			hero.querySelectorAll<HTMLElement>('.as-stage-team b, .as-stage-score').forEach(el => {
				within(el.getBoundingClientRect(), stage, el.textContent ?? '');
			});
			const [away, home] = [...hero.querySelectorAll<HTMLElement>('.as-stage-team b')];
			const score = hero.querySelector('.as-stage-score')!.getBoundingClientRect();
			expect(away!.getBoundingClientRect().right, 'away name clears the score').to.be.at.most(score.left + 1);
			expect(home!.getBoundingClientRect().left, 'home name clears the score').to.be.at.least(score.right - 1);
		});
	});

	/* The stage now carries the PowerScore, the situation and the note, so the budgets are the stage's
	   own: the whole of it fits the first screen, and the breakdown still starts on it. */
	it('keeps the stage inside its pixel budget with records shown', () => {
		mountDetail(makeLiveGame({ id: recordsGameId }), { excitementResult: excitement });
		cy.get('.dt-hero').should(([hero]: JQuery<HTMLElement>) => {
			expect(hero.getBoundingClientRect().top, 'the stage runs to the top edge').to.equal(0);
			expect(hero.getBoundingClientRect().height, 'stage height').to.be.at.most(280);
		});
		cy.get('.powerscore-breakdown').then(([el]: JQuery<HTMLElement>) => {
			expect(el.getBoundingClientRect().top, 'breakdown starts on the first screen').to.be.at.most(520);
		});
	});

	it('keeps the gridiron stage inside its budget once timeouts are on it', () => {
		mountDetail(makeLiveGame({
			id: recordsGameId,
			league: 'nfl',
			sportType: 'football',
			period: 4,
			homeTeam: { id: '1', name: 'Boston Celtics', abbreviation: 'BOS', score: 17, timeouts: 1 },
			awayTeam: { id: '3', name: 'Oklahoma City Thunder', abbreviation: 'OKC', score: 17, timeouts: 3 },
		}), { excitementResult: excitement });
		cy.get('.dt-hero .timeout-dots').should('have.length', 2);
		cy.get('.dt-hero').should(([hero]: JQuery<HTMLElement>) => {
			expect(hero.getBoundingClientRect().height, 'stage height').to.be.at.most(310);
		});
	});

	// The at-bat pair is two 32px portraits under the count, and it is pinned here so it cannot grow
	// quietly.
	it('holds the at-bat stage to its own, larger budget', () => {
		mountDetail({
			...makeInningGame(),
			id: recordsGameId,
			atBat: {
				pitcher: { name: 'Will Dion', jersey: '76', position: 'RP', summary: '1.1 IP, 0 ER, H, BB' },
				batter: { name: 'Nathan Church', jersey: '27', position: 'CF', summary: '0-2, K' },
			},
		}, { excitementResult: excitement });
		cy.get('.dt-atbat').should('exist');
		cy.get('.dt-hero').should(([hero]: JQuery<HTMLElement>) => {
			expect(hero.getBoundingClientRect().height, 'stage height with the at-bat pair').to.be.at.most(385);
		});
		cy.get('.dt-hero .as-stage-power').should(([power]: JQuery<HTMLElement>) => {
			expect(power.getBoundingClientRect().bottom, 'the PowerScore is still on the first screen').to.be.at.most(560);
		});
	});

	it('keeps the count and the bases inside the stage', () => {
		mountDetail(makeInningGame(), { excitementResult: excitement });
		cy.get('.dt-hero .base-diamond').should('exist');
		cy.get('.dt-hero .as-stage-situation').should(([row]: JQuery<HTMLElement>) => {
			expect(row.scrollWidth, 'the situation row does not overflow').to.be.at.most(row.clientWidth);
		});
		cy.get('.dt-hero').should(([hero]: JQuery<HTMLElement>) => expectInsideStage(hero));
	});

	it('centres the balls/strikes/outs count and the bases under the matchup', () => {
		mountDetail(makeInningGame(), { excitementResult: excitement });
		cy.get('.dt-hero').then(([hero]: JQuery<HTMLElement>) => {
			const stage = hero.getBoundingClientRect();
			const row = hero.querySelector('.as-stage-situation')!;
			const first = row.firstElementChild!.getBoundingClientRect();
			const last = row.lastElementChild!.getBoundingClientRect();
			expect(first.left - stage.left, 'the pair is centred on the stage').to.be.closeTo(stage.right - last.right, 2);
		});
	});

	it('shows the PowerScore on the stage and the same number in the breakdown', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-power strong').should('have.text', '72');
		cy.get('.dt-hero .as-stage-power small').should('have.text', 'PowerScore');
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '72 / 100');
	});

	it('drops the win probability row, leaving it to the chart below', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.dt-hero').should('not.contain.text', '%');
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
		cy.get('.dt-hero .as-clock').should('have.text', 'Halftime');
	});

	// A clock and an inning line up as figures; a word replacing them has nothing to line up.
	it('sets a running clock in tabular figures and the word statuses as words', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.dt-hero .as-clock').should('have.class', 'num').and('have.text', 'Q3 6:42')
			.and($el => expect(face($el)).to.equal('Inter'));

		mountDetail(makeLiveGame({ intermission: true, period: 2 }), { excitementResult: excitement });
		cy.get('.dt-hero .as-clock').should('not.have.class', 'num');

		mountDetail(makeLiveGame({ status: 'post' }), { excitementResult: excitement });
		cy.get('.dt-hero .as-clock').should('not.have.class', 'num').and('have.text', 'Final');
	});

	it('shows a series once, as a line of the note', () => {
		mountDetail(makeLiveGame({ id: seriesGameId }), { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-note .dt-series-summary').should('have.length', 1).and('contain.text', 'series');
		cy.get('.dt-series-summary').should($el => expect(face($el)).to.equal('Inter'));
		cy.get('.dt-series-dot').should('have.length.greaterThan', 1);
		cy.get('.dt-series-dots').should('have.attr', 'aria-hidden', 'true');
	});

	it('names the round in the note', () => {
		mountDetail(makeLiveGame({ postseasonLabel: 'East Semifinals, Game 5' }), { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-note').should('contain.text', 'East Semifinals, Game 5');
	});

	it('writes the down and distance in the note under the field', () => {
		mountDetail(makeLiveGame({ league: 'nfl', sportType: 'football', downDistance: '3rd & 7', down: 3, distance: 7, fieldPosition: 'BOS 34', yardLine: 34, possessionTeamId: '3' }), { excitementResult: excitement });
		cy.get('.dt-hero .as-stage-note .dt-note-lead').should('have.text', '3rd & 7 at BOS 34');
		cy.get('.dt-hero .dt-situation .ff-strip').should('exist');
	});

	it('warms the veil and writes the delay in the clock slot', () => {
		mountDetail(makeLiveGame({ delayed: true, delayDescription: 'Rain Delay' }), { excitementResult: excitement });
		cy.get('.dt-hero .as-clock').should('have.class', 'is-delayed').and('have.text', 'Rain Delay');
		cy.get('.dt-hero').should(([hero]: JQuery<HTMLElement>) => {
			expect(hero.style.getPropertyValue('--stage-veil-rgb')).to.equal('28, 22, 3');
		});
		cy.get('.dt-hero .as-stage-score .as-score').first().should('have.css', 'opacity', '1');
	});
});

describe('gameDetailView head bar', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('goes back with a labelled control, not a bare chevron', () => {
		const onBack = cy.spy().as('back');
		mountDetail(makeLiveGame(), { excitementResult: excitement, onBack });
		cy.get('.dt-head .dt-back').should('have.text', 'Back').find('.bi-arrow-left').should('exist');
		cy.get('.dt-head .dt-back').click();
		cy.get('@back').should('have.been.calledOnce');
	});

	it('closes instead, where the screen is a drawer beside a page', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, dismiss: 'close' });
		cy.get('.dt-head .dt-back').should('have.text', 'Close').find('.bi-x-lg').should('exist');
	});

	it('names the league by its short name on a white disc', () => {
		mountDetail(makeLiveGame({ league: 'ncaab', sportType: 'basketball' }), { excitementResult: excitement });
		cy.get('.dt-league').should('have.text', 'NCAAB');
		cy.get('.dt-league-disc').should('have.css', 'background-color', 'rgb(255, 255, 255)');
		mountDetail(makeLiveGame({ league: 'bundesliga', sportType: 'soccer' }), { excitementResult: excitement });
		cy.get('.dt-league').should('have.text', 'Bundesliga');
	});

	it('keeps the back control and the league inside the head in every locale', () => {
		mountDetail(makeLiveGame({ league: 'olywih', sportType: 'hockey' }), { excitementResult: excitement });
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.dt-head').should(([head]: JQuery<HTMLElement>) => {
				head.querySelector('.dt-back span')!.textContent = locale.detail.back;
				const back = head.querySelector('.dt-back')!.getBoundingClientRect();
				const league = head.querySelector('.dt-league')!.getBoundingClientRect();
				expect(back.right, `back clears the league in ${name}`).to.be.at.most(league.left);
				within(league, head.getBoundingClientRect(), `league in ${name}`);
			});
		});
	});
});

describe('gameDetailView tab status', () => {
	const openTabs = [tab(11, 0), tab(12, 1, true), tab(13, 2)];

	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('says the game is being watched when its tab is the one in front', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, openTabs, registry: [{ tabId: 12, gameId: liveGameId }] });
		cy.get('.dt-hero .as-stage-label').should('have.text', 'Watching, Tab 2');
		// There is nothing to pick for a game already on screen.
		cy.get('.dt-assign').should('not.exist');
	});

	it('names the tab of a game that has one, and offers to move it', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, openTabs, registry: [{ tabId: 13, gameId: liveGameId }] });
		cy.get('.dt-hero .as-stage-label').should('have.text', 'Tab 3');
		cy.get('.dt-assign .game-card-tab-assign .form-select').should('contain.text', 'Tab 13');
		cy.get('.dt-assign .dt-row-help').should('not.exist');
	});

	it('offers a tab to a live game with none, and says why it matters', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, openTabs, registry: [] });
		cy.get('.dt-hero .as-stage-label').should('be.empty');
		cy.get('.dt-assign .dt-card-title').should('have.text', 'Assign a tab');
		cy.get('.dt-assign .dt-row-help').should('have.text', en.detail.liveTabExplainer);
	});

	// No switching from a drawer beside the Guide, and no tab to give a game that is over.
	it('offers no picker where there is no registry, and none on a final', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, openTabs, registry: [], tabAssignEnabled: false });
		cy.get('.dt-assign').should('not.exist');
		mountDetail(makeLiveGame({ status: 'post' }), { excitementResult: excitement, openTabs, registry: [{ tabId: 13, gameId: liveGameId }] });
		cy.get('.dt-assign').should('not.exist');
		cy.get('.dt-hero .as-stage-label').should('be.empty');
	});

	it('puts the picker straight under the stage, above the tabs', () => {
		mountDetail(makeLiveGame({ id: recordsGameId }), { excitementResult: excitement, openTabs, registry: [] });
		cy.get('.dt-body > :first-child').should('have.class', 'dt-assign');
		cy.get('.dt-assign').then(([card]: JQuery<HTMLElement>) => {
			cy.get('.dt-tabs').should(([tabs]: JQuery<HTMLElement>) => {
				expect(card.getBoundingClientRect().bottom).to.be.lessThan(tabs.getBoundingClientRect().top);
			});
		});
	});
});

// The list shows favourites as marks, so the stage is where a team is followed from.
describe('gameDetailView favourites', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('carries a star per team, reflecting current state', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, favoriteTeamIds: new Set(['nba:1']), onToggleFavoriteTeam: () => {} });
		cy.get('.dt-hero .as-star').should('have.length', 2);
		cy.get('.dt-hero .as-star').eq(0).should('have.attr', 'aria-pressed', 'false')
			.and('have.attr', 'aria-label', 'Add OKC to favorites');
		cy.get('.dt-hero .as-star').eq(1).should('have.attr', 'aria-pressed', 'true')
			.and('have.attr', 'aria-label', 'Remove BOS from favorites');
	});

	it('toggles the team the star belongs to', () => {
		const toggled: string[] = [];
		mountDetail(makeLiveGame(), { excitementResult: excitement, onToggleFavoriteTeam: (_league, teamId) => toggled.push(teamId) });
		// Without scrolling first, which would slide the stage under the compact bar.
		cy.get('.dt-hero .as-star').eq(0).click({ scrollBehavior: false });
		cy.get('.dt-hero .as-star').eq(1).click({ scrollBehavior: false });
		cy.wrap(toggled).should('deep.equal', ['3', '1']);
	});

	// Native buttons in the tab order, so Enter and Space work without any handler of ours.
	it('can be reached and focused from the keyboard', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, onToggleFavoriteTeam: () => {} });
		cy.get('.dt-hero .as-star').each($star => {
			expect($star[0]!.tagName).to.equal('BUTTON');
			expect($star[0]!.tabIndex, 'in the tab order').to.equal(0);
			expect($star.attr('type')).to.equal('button');
		});
		cy.get('.dt-hero .as-star').eq(1).focus().should('have.focus').and('have.css', 'outline-style', 'solid');
	});

	it('works on a scheduled game and a final alike', () => {
		const toggled: string[] = [];
		mountDetail(makePreGame(3 * hourMs), { onToggleFavoriteTeam: (_league, teamId) => toggled.push(teamId) });
		cy.get('.dt-hero .as-star').eq(1).click({ scrollBehavior: false });
		mountDetail(makeLiveGame({ status: 'post' }), { excitementResult: excitement, onToggleFavoriteTeam: (_league, teamId) => toggled.push(teamId) });
		cy.get('.dt-hero .as-star').eq(0).click({ scrollBehavior: false });
		cy.wrap(toggled).should('deep.equal', ['h', '3']);
	});

	it('draws marks rather than buttons where favourites can\'t be changed', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, favoriteTeamIds: new Set(['nba:1']) });
		cy.get('.dt-hero .as-star').should('not.exist');
		cy.get('.dt-hero .as-star-mark').should('have.length', 1).and('have.attr', 'aria-label', 'Favorited');
	});
});

describe('gameDetailView compact bar', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('takes no room and stays out of reach at rest', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		cy.get('.dt-bar').should('not.have.class', 'is-visible').and('have.css', 'visibility', 'hidden')
			.and('have.attr', 'aria-hidden', 'true');
		cy.get('.dt-bar-dock').should('have.css', 'height', '0px');
		cy.get('.dt-hero').should(([hero]: JQuery<HTMLElement>) => expect(hero.getBoundingClientRect().top).to.equal(0));
		cy.get('.dt-head .dt-back').should('have.text', 'Back');
	});

	it('fades the compact matchup in once the stage\'s score slides under it', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo(0, 120);
		cy.get('.dt-bar').should('have.class', 'is-visible').and('have.css', 'opacity', '1')
			.and('not.have.attr', 'aria-hidden', 'true');
		cy.get('.dt-bar').should('contain.text', '108').and('contain.text', '112');
		cy.get('.dt-bar-back').should('have.text', 'Back');
	});

	// The stage's own back control has gone by the time the matchup starts to go, so the handover
	// leaves no stretch of scroll with no way back.
	it('never leaves the screen without a back control', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		for (const offset of [0, 20, 40, 60, 80, 120, 200, 400]) {
			cy.get('.popup-container').scrollTo(0, offset);
			cy.get('.popup-container').should(([container]: JQuery<HTMLElement>) => {
				const top = container.getBoundingClientRect().top;
				const stageBack = container.querySelector('.dt-head .dt-back')!.getBoundingClientRect();
				const barVisible = container.querySelector('.dt-bar')!.classList.contains('is-visible');
				// Half of a 32px control is still a target.
				expect(barVisible || stageBack.bottom - top >= 16, `a way back at ${offset}px`).to.equal(true);
			});
		}
	});

	it('centres the compact matchup on the bar axis', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo('bottom');
		cy.get('.dt-bar').then(([bar]: JQuery<HTMLElement>) => {
			cy.get('.dt-bar-match').should(([match]: JQuery<HTMLElement>) => {
				const barBox = bar.getBoundingClientRect();
				const matchBox = match.getBoundingClientRect();
				expect(matchBox.left + matchBox.width / 2, 'compact matchup is centred')
					.to.be.closeTo(barBox.left + barBox.width / 2, 1);
			});
		});
	});

	it('pins to the top of the scroll container', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo(0, 300);
		cy.get('.popup-container').then(([container]: JQuery<HTMLElement>) => {
			cy.get('.dt-bar').should(([bar]: JQuery<HTMLElement>) => {
				const drift = bar.getBoundingClientRect().top - container.getBoundingClientRect().top;
				expect(drift, 'bar stays pinned').to.be.closeTo(0, 1);
				expect(bar.getBoundingClientRect().height, 'bar height').to.equal(48);
			});
		});
	});

	it('keeps its scores while a game is under way', () => {
		mountDetail(makeLiveGame({ startTime: new Date(now.getTime() - hourMs).toISOString() }), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo('bottom');
		cy.get('.dt-bar-score').should('have.length', 2);
		// startTime is populated for every status, so only the pre-game gate keeps the countdown off.
		cy.get('.dt-bar-status').should('have.text', 'Q3 6:42');
	});

	it('writes overtime the way the stage does', () => {
		mountDetail(makeLiveGame({ period: 5 }), { excitementResult: excitement, powerScoreHistory });
		cy.get('.dt-hero .as-clock').invoke('text').then(text => {
			cy.get('.dt-bar-status').should('have.text', text);
		});
	});

	const expectClear = (bar: HTMLElement, label: string) => {
		const status = bar.querySelector<HTMLElement>('.dt-bar-status')!;
		expectSingleLine(status, `status ${label}`);
		const back = bar.querySelector('.dt-bar-back')!.getBoundingClientRect();
		const match = bar.querySelector('.dt-bar-match')!.getBoundingClientRect();
		expect(back.right, `back clears the matchup ${label}`).to.be.at.most(match.left);
		expect(status.getBoundingClientRect().left, `status clears the matchup ${label}`).to.be.at.least(match.right);
		within(status.getBoundingClientRect(), bar.getBoundingClientRect(), `status inside the bar ${label}`);
	};

	// A break comes with two-digit scores; three digits come late, with a running clock.
	it('keeps the compact matchup clear of the back control and the status in every locale', () => {
		mountDetail(makeLiveGame({ intermission: true, period: 2, awayTeam: { id: '3', name: 'Oklahoma City Thunder', abbreviation: 'OKC', score: 58 }, homeTeam: { id: '1', name: 'Boston Celtics', abbreviation: 'BOS', score: 61 } }), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo('bottom');
		Object.entries(locales).forEach(([name, locale]) => {
			for (const word of [locale.detail.intermission, locale.detail.halftime]) {
				cy.get('.dt-bar').should(([bar]: JQuery<HTMLElement>) => {
					bar.querySelector('.dt-bar-status')!.textContent = word;
					bar.querySelector('.dt-bar-back span')!.textContent = locale.detail.back;
					expectClear(bar, `in ${name} (${word})`);
				});
			}
		});

		mountDetail(makeLiveGame({ period: 5, clockSeconds: 299 }), { excitementResult: excitement, powerScoreHistory });
		cy.get('.popup-container').scrollTo('bottom');
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.dt-bar').should(([bar]: JQuery<HTMLElement>) => {
				bar.querySelector('.dt-bar-back span')!.textContent = locale.detail.close;
				expectClear(bar, `with three-digit scores in ${name}`);
			});
		});
	});
});

// Before a start both scores are 0 and stay 0, so the bar hands its whole job to the abbreviations
// and the countdown takes the status slot.
describe('gameDetailView compact bar before a start', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
		cy.clock(now.getTime(), ['Date', 'setTimeout', 'clearTimeout']);
	});

	const mountScrolled = (game: Game) => {
		mountDetail(game, { proTipsEnabled: true, bettingEnabled: true });
		cy.get('.popup-container').scrollTo('bottom');
		cy.get('.dt-bar').should('have.class', 'is-visible');
	};

	it('drops both scores and keeps the matchup', () => {
		mountScrolled(makeScheduledSlate(5 * hourMs + 13 * minuteMs + 42_000));
		cy.get('.dt-bar-score').should('not.exist');
		cy.get('.dt-bar-match').should('contain.text', 'ATL').and('contain.text', 'PHI');
		cy.get('.dt-bar-crest').should('have.length', 2);
		cy.get('.dt-bar-sep').should('have.length', 1);
	});

	it('counts down to the start in the slot the status text would hold', () => {
		mountScrolled(makeScheduledSlate(5 * hourMs + 13 * minuteMs + 42_000));
		cy.get('.dt-bar-status').should('have.text', '5h 13m');
	});

	it('shows days and hours further out, and pairs minutes with seconds close in', () => {
		mountScrolled(makeScheduledSlate(2 * dayMs + 5 * hourMs + 13 * minuteMs));
		cy.get('.dt-bar-status').should('have.text', '2d 05h');
		mountScrolled(makeScheduledSlate(13 * minuteMs + 42_000));
		cy.get('.dt-bar-status').should('have.text', '13m 42s');
	});

	it('ticks once a second', () => {
		mountScrolled(makeScheduledSlate(2 * hourMs + 30_000));
		cy.get('.dt-bar-status').should('have.text', '2h 00m');
		cy.tick(31_000);
		cy.get('.dt-bar-status').should('have.text', '1h 59m');
	});

	it('says "Starts soon" once the clock runs out rather than counting up', () => {
		mountScrolled(makeScheduledSlate(0));
		cy.get('.dt-bar-status').should('have.text', 'Starts soon');
	});

	it('carries nothing at all when no start time is scheduled', () => {
		mountScrolled({ ...makeScheduledSlate(0), startTime: undefined });
		cy.get('.dt-bar-status').should('not.exist');
	});

	it('gives the slot to a delay description instead of the countdown', () => {
		mountScrolled({ ...makeScheduledSlate(5 * hourMs), delayed: true, delayDescription: 'Rain Delay' });
		cy.get('.dt-bar-status').should('have.text', 'Rain Delay').and('have.class', 'is-delayed');
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
			const t = (key: string) => (locale.detail as Record<string, string>)[key.split('.')[1]!]!;
			Object.entries(shapes).forEach(([shape, offset]) => {
				cy.get('.dt-bar').should(([bar]: JQuery<HTMLElement>) => {
					const status = bar.querySelector<HTMLElement>('.dt-bar-status')!;
					status.textContent = formatCompactCountdown(countdownParts(target + offset, target), t);
					expectSingleLine(status, `${shape} in ${name} (${status.textContent})`);
					expect(status.getBoundingClientRect().left, `${shape} in ${name} clears the matchup`)
						.to.be.at.least(bar.querySelector('.dt-bar-match')!.getBoundingClientRect().right);
				});
			});
		});
	});
});

// The detail screen renders the scorer's number verbatim: the game you tapped, this screen and the
// score the auto-switcher acted on must never disagree.
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
		cy.contains('.powerscore-breakdown-row', /Volatility/).find('.num').should('have.text', '+5');
		// 77, not 77 + 5 — the variance is already inside the engine total.
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '77 / 100');
		cy.get('.dt-hero .as-stage-power strong').should('have.text', '77');
	});

	// No line means no measurement, so no row — not a fabricated zero.
	it('omits the row entirely when the engine had no win probability to measure', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.contains('.powerscore-breakdown-row', /Volatility/).should('not.exist');
		cy.get('.powerscore-breakdown-row-total').should('contain.text', '72 / 100');
		cy.get('.dt-hero .as-stage-power strong').should('have.text', '72');
	});
});

// First in the live stack: what just happened is the most time-sensitive thing on the screen.
describe('gameDetailView latest play', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	it('gives the play a heading of its own', () => {
		mountDetail(makeLiveGame({ lastPlay: 'J.Tatum makes 26-foot three point jumper' }), { excitementResult: excitement });
		cy.get('.dt-play-heading').should('have.text', 'Latest play');
		cy.get('.dt-play-text').should('have.text', 'J.Tatum makes 26-foot three point jumper');
	});

	it('sits above the PowerScore breakdown, not beside the venue', () => {
		mountDetail(makeLiveGame({ lastPlay: 'J.Tatum makes 26-foot three point jumper' }), { excitementResult: excitement });
		cy.get('.dt-play').then(([play]: JQuery<HTMLElement>) => {
			cy.get('.powerscore-breakdown').then(([breakdown]: JQuery<HTMLElement>) => {
				expect(play.compareDocumentPosition(breakdown) & Node.DOCUMENT_POSITION_FOLLOWING, 'breakdown follows the play').to.be.greaterThan(0);
			});
			cy.get('.game-info-panel').then(([info]: JQuery<HTMLElement>) => {
				expect(play.compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING, 'the venue panel is further down still').to.be.greaterThan(0);
			});
		});
		cy.get('.game-info-panel').should('not.contain.text', 'J.Tatum');
	});

	// Our sources join a penalty's two sentences with a newline; collapsing it reads as one play.
	it('keeps a two-sentence penalty on two lines', () => {
		const penalty = 'A.Jeanty up the middle to LAC 49 for 1 yard (D.Phillips).\nPENALTY on LV-S.Burford, Offensive Holding, 10 yards, enforced at 50 - No Play.';
		mountDetail(makeLiveGame({ sportType: 'football', league: 'nfl', lastPlay: penalty }), { excitementResult: excitement });
		cy.get('.dt-play-text').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).whiteSpace).to.equal('pre-line');
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
		cy.get('.dt-play-drive').should('have.text', '1 play, 0 yards, 0:04');
	});

	it('is absent entirely when there is no play', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.dt-play').should('not.exist');
	});

	it('keeps the heading on one line in every locale', () => {
		mountDetail(makeLiveGame({ lastPlay: 'J.Tatum makes 26-foot three point jumper' }), { excitementResult: excitement });
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.dt-play-heading').should(([el]: JQuery<HTMLElement>) => {
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

	it('names both players and carries our sources\' line for each', () => {
		mountDetail(makeInningGame(), { excitementResult: excitement });
		cy.get('.dt-atbat').should('not.exist');

		// The bottom of the 7th, so the visitors are pitching and their man stands on the left.
		mountDetail({ ...makeInningGame(), atBat }, { excitementResult: excitement });
		cy.get('.dt-atbat-name').first().should('have.text', 'Will Dion');
		cy.get('.dt-atbat-name').last().should('have.text', 'Nathan Church');
		cy.get('.dt-atbat-line').first().should('have.text', '1.1 IP, 0 ER, H, BB');
		cy.get('.dt-atbat-line').last().should('have.text', '0-2, K');
		cy.get('.dt-atbat-role').first().should('have.text', 'Pitching');
		cy.get('.dt-atbat-role').last().should('have.text', 'At bat');
	});

	it('sits in the stage, under the count it answers', () => {
		mountDetail({ ...makeInningGame(), atBat }, { excitementResult: excitement });
		cy.get('.dt-hero .dt-situation .dt-atbat').should('exist');
		cy.get('.dt-hero .as-stage-situation').then(([count]: JQuery<HTMLElement>) => {
			cy.get('.dt-atbat').should(([panel]: JQuery<HTMLElement>) => {
				expect(panel.getBoundingClientRect().top).to.be.greaterThan(count.getBoundingClientRect().bottom);
			});
		});
	});

	// A fixed pitcher-left panel would stand a man under the other team's crest for half the game.
	it('swaps the two ends at the half-inning so each player stands under his own club', () => {
		mountDetail({ ...makeInningGame(), topOfInning: true, atBat }, { excitementResult: excitement });
		cy.get('.dt-atbat-side').first().should('have.class', 'dt-atbat-away');
		cy.get('.dt-atbat-role').first().should('have.text', 'At bat');
		cy.get('.dt-atbat-name').first().should('have.text', 'Nathan Church');
		cy.get('.dt-atbat-role').last().should('have.text', 'Pitching');
		cy.get('.dt-atbat-name').last().should('have.text', 'Will Dion');

		mountDetail({ ...makeInningGame(), topOfInning: false, atBat }, { excitementResult: excitement });
		cy.get('.dt-atbat-role').first().should('have.text', 'Pitching');
		cy.get('.dt-atbat-name').first().should('have.text', 'Will Dion');
	});

	it('keeps the mirrored half on the home side through the swap', () => {
		mountDetail({ ...makeInningGame(), topOfInning: true, atBat }, { excitementResult: excitement });
		cy.get('.dt-atbat-side.dt-atbat-home').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).flexDirection).to.equal('row-reverse');
		});
		cy.get('.dt-atbat-side.dt-atbat-away').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).flexDirection).to.equal('row');
		});
	});

	// Our sources draw no portrait for a good share of players, so initials are a normal state.
	it('falls back to initials when a player has no headshot', () => {
		mountDetail({ ...makeInningGame(), atBat }, { excitementResult: excitement });
		cy.get('.dt-atbat-face-crest').should('have.length', 2);
		cy.get('.dt-atbat-face-crest').first().should('have.text', 'WD');
		cy.get('.dt-atbat-face-crest').last().should('have.text', 'NC');
	});

	it('keeps both role labels on one line in every locale', () => {
		mountDetail({ ...makeInningGame(), atBat }, { excitementResult: excitement });
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.dt-atbat-role').should(($roles: JQuery<HTMLElement>) => {
				const labels = [locale.detail.pitchingLabel, locale.detail.atBatLabel];
				$roles.each((index, el) => {
					el.textContent = labels[index] ?? '';
					expect(el.scrollWidth, `no overflow in ${name}`).to.be.at.most(el.parentElement!.clientWidth);
				});
			});
		});
	});
});

// The same 3px rule the rest of the product marks a team with, in the colour of whoever made the play.
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
		cy.get('.dt-play-body').should('have.class', 'has-accent').then(([home]: JQuery<HTMLElement>) => {
			const homeInk = getComputedStyle(home).borderLeftColor;

			mountDetail({ ...coloured, lastPlayTeamId: '3' }, { excitementResult: excitement });
			cy.get('.dt-play-body').should(([away]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(away).borderLeftColor, 'the two sides are not drawn alike').to.not.equal(homeInk);
			});
		});
	});

	it('keeps the indent but drops the rule when nobody is named', () => {
		mountDetail(coloured, { excitementResult: excitement });
		cy.get('.dt-play-body').should('not.have.class', 'has-accent').should(([el]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(el);
			expect(style.borderLeftColor, 'no team, no colour').to.equal('rgba(0, 0, 0, 0)');
			expect(parseFloat(style.paddingLeft), 'the indent survives').to.be.greaterThan(0);
		});
	});

	it('marks the play rather than the heading, which reads the same whoever did it', () => {
		mountDetail({ ...coloured, lastPlayTeamId: '1' }, { excitementResult: excitement });
		cy.get('.dt-play-heading').should(([el]: JQuery<HTMLElement>) => {
			expect(parseFloat(getComputedStyle(el).borderLeftWidth)).to.equal(0);
		});
	});
});

describe('gameDetailView stage timeouts', () => {
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
		cy.get('.dt-hero .timeout-dots').should('have.length', 2);
		cy.get('.dt-hero .as-stage-team').eq(0).find('.timeout-dot').not('.is-empty').should('have.length', 3);
		cy.get('.dt-hero .as-stage-team').eq(1).find('.timeout-dot').not('.is-empty').should('have.length', 1);
	});

	// The old card's rule for these is a light-surface grey, and it has to lose to the stage's.
	it('draws both halves of the row in the stage\'s white ink', () => {
		mountDetail(gridiron, { excitementResult: excitement });
		cy.get('.dt-hero .timeout-dot.is-empty').first().should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).color, 'not the light-card grey').to.not.equal('rgb(156, 163, 175)');
		});
		cy.get('.dt-hero .timeout-dot').not('.is-empty').first().should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).color).to.equal('rgb(255, 255, 255)');
		});
	});

	it('leaves the stage untouched for a sport with no timeouts', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement });
		cy.get('.dt-hero .timeout-dots').should('not.exist');
	});
});

describe('gameDetailView cards', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	// One family: the page surface under a hairline, radius 14, 16px padding, 13px semibold titles.
	it('draws every card below the stage the same way', () => {
		mountDetail(makeLiveGame({ lastPlay: 'J.Tatum makes 26-foot three point jumper' }), { excitementResult: excitement, powerScoreHistory, openTabs: [tab(11, 0)], registry: [] });
		cy.get('.dt-body .dt-card').should('have.length.greaterThan', 5).each(($card: JQuery<HTMLElement>) => {
			const style = getComputedStyle($card[0]!);
			expect(style.borderTopLeftRadius, 'radius').to.equal('14px');
			expect(style.paddingLeft, 'padding').to.equal('16px');
			expect(style.borderTopWidth, 'hairline').to.equal('1px');
			const title = $card[0]!.querySelector<HTMLElement>('.dt-card-title');
			if (title) {
				expect(getComputedStyle(title).fontSize, 'title size').to.equal('13px');
				expect(getComputedStyle(title).fontWeight, 'title weight').to.equal('600');
			}
		});
		cy.get('.dt-body .dt-card').then($cards => {
			const lefts = new Set([...$cards].map(card => Math.round(card.getBoundingClientRect().left)));
			const widths = new Set([...$cards].map(card => Math.round(card.getBoundingClientRect().width)));
			expect(lefts.size, 'one left edge').to.equal(1);
			expect(widths.size, 'one width').to.equal(1);
		});
	});

	it('draws the four charts as cards, with a legend where there are lines to tell apart', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, powerScoreHistory, scoreHistory: [
			{ gameId: liveGameId, timestamp: now.getTime() - minuteMs, awayScore: 110, homeScore: 104 },
			{ gameId: liveGameId, timestamp: now.getTime(), awayScore: 112, homeScore: 108 },
		] });
		cy.get('[data-testid="game-detail-chart"]').should('have.length.at.least', 3);
		cy.get('[data-testid="game-detail-chart"]').each($chart => {
			expect($chart.hasClass('dt-card')).to.equal(true);
			expect($chart.find('.dt-canvas').length).to.equal(1);
		});
	});

	it('places the pro tip among the cards when tips are on', () => {
		mountDetail(makeLiveGame(), { excitementResult: excitement, proTipsEnabled: true });
		cy.get('.dt-pane [data-testid="pro-tip"]').should('exist');
	});
});

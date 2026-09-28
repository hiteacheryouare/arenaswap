import type { BackgroundState, Game, GuideSlate, LeagueId, TabRegistration, UserPreferences } from '@arenaswap/core/types';
import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import App from '../../entrypoints/guide/app';
import { makeGame, makeScore } from '../support/fixtures';
import '../../assets/guide.scss';

// A Sunday afternoon with the early games under way. Fixed rather than relative so the grid, the
// now line and the day pager all describe the same moment on every run.
const now = new Date('2026-09-13T20:00:00Z').getTime();
const tomorrow = new Date('2026-09-14T20:00:00Z').getTime();

const game = (id: string, league: LeagueId, startTime: string, overrides: Partial<Game> = {}): Game => makeGame(id, {
	league,
	sportType: league === 'nfl' ? 'football' : 'basketball',
	status: 'pre',
	startTime,
	homeTeam: { id: `${id}-h`, name: `${id} Home`, abbreviation: 'HOM', score: 0, color: '#002244' },
	awayTeam: { id: `${id}-a`, name: `${id} Away`, abbreviation: 'AWY', score: 0, color: '#0B162A' },
	...overrides,
});

const eagles = game('nfl-eagles', 'nfl', '2026-09-13T17:00:00Z', {
	status: 'in',
	period: 3,
	clockSeconds: 420,
	homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 17, color: '#004C54' },
	awayTeam: { id: '6', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 14, color: '#041E42' },
});
const niners = game('nfl-niners', 'nfl', '2026-09-13T20:25:00Z');
const sixers = game('nba-sixers', 'nba', '2026-09-14T23:00:00Z');

const slateOf = (games: Game[]): GuideSlate => ({ games, leagueLogos: {}, monoLogos: {}, gameBoosts: {}, endTimes: {} });

interface MountOptions {
	/** Held open so the spec can decide when — or whether — the slate ever arrives. */
	deferSlate?: boolean;
	games?: Game[];
	atMs?: number;
	/** What GET_STATE answers with: the popup's own state, scores and history included. */
	state?: Partial<BackgroundState>;
	/** The tab registry in session storage, and the tabs showing in their windows. */
	registry?: TabRegistration[];
	activeTabs?: { id: number; index: number; active: boolean }[];
	prefs?: Partial<UserPreferences>;
}

interface guideHandle {
	/** Resolves the slate request the app made on mount. */
	deliver: (games: Game[]) => void;
	/** Fires the broadcast the background sends after every poll. */
	pushScoresUpdated: () => void;
	sentMessages: { type: string;[key: string]: unknown }[];
	slateRequests: () => number;
}

const mountGuide = ({ deferSlate = false, games = [eagles, niners, sixers], atMs = now, state, registry = [], activeTabs = [], prefs = {} }: MountOptions = {}) => {
	cy.clock(atMs, ['Date', 'setInterval', 'clearInterval']);
	cy.viewport(1280, 800);

	const sentMessages: { type: string;[key: string]: unknown }[] = [];
	const listeners: ((message: unknown) => void)[] = [];
	let releaseSlate: ((slate: GuideSlate) => void) | null = null;
	let slate = slateOf(games);

	const win = window as unknown as Record<string, unknown>;
	win.browser = {
		runtime: {
			sendMessage: (message: { type: string;[key: string]: unknown }) => {
				sentMessages.push(message);
				if (message.type === 'GET_STATE') return Promise.resolve(state);
				if (message.type !== 'GET_GUIDE_SLATE') return Promise.resolve(undefined);
				if (!deferSlate) return Promise.resolve(slate);
				return new Promise<GuideSlate>(resolve => { releaseSlate = resolve; });
			},
			onMessage: {
				addListener: (listener: (message: unknown) => void) => { listeners.push(listener); },
				removeListener: (listener: (message: unknown) => void) => {
					const index = listeners.indexOf(listener);
					if (index >= 0) listeners.splice(index, 1);
				},
			},
		},
		i18n: { getUILanguage: () => 'en-US' },
		storage: {
			sync: { get: () => Promise.resolve({ prefs: { ...createDefaultUserPreferences(), ...prefs }, prefsUpdatedAt: 0 }) },
			local: { get: () => Promise.resolve({ prefs: null, prefsUpdatedAt: 0 }) },
			session: { get: () => Promise.resolve({ tabRegistry: registry }) },
			onChanged: { addListener: () => {}, removeListener: () => {} },
		},
		tabs: {
			query: ({ active }: { active?: boolean }) => Promise.resolve(active ? activeTabs.filter(tab => tab.active) : activeTabs),
			onActivated: { addListener: () => {}, removeListener: () => {} },
		},
	};

	cy.mount(<App />);

	return cy.wrap<guideHandle>({
		deliver: (delivered: Game[]) => {
			slate = slateOf(delivered);
			releaseSlate?.(slate);
			releaseSlate = null;
		},
		pushScoresUpdated: () => { listeners.forEach(listener => listener({ type: 'SCORES_UPDATED' })); },
		sentMessages,
		slateRequests: () => sentMessages.filter(message => message.type === 'GET_GUIDE_SLATE').length,
	}, { log: false }).as('guide');
};

const openFirstGame = () => {
	cy.get('.guide-bar-content').first().click();
	cy.get('.guide-drawer').should('exist');
};

describe('the guide page', () => {
	/* Two states that look the same in a screenshot and mean opposite things. Dressing a slow
	   network up as an answer is how "your Sunday has nothing on it" gets shown to somebody with
	   twelve games about to kick off. */
	it('says it is still loading rather than reporting a quiet day it has not heard about', () => {
		mountGuide({ deferSlate: true });

		cy.get('.popup-loading-spinner').should('be.visible');
		cy.get('.popup-no-games-wrap').should('not.exist');
		cy.get('.guide-bar').should('not.exist');

		cy.get<guideHandle>('@guide').then(guide => guide.deliver([eagles, niners]));

		cy.get('.popup-loading-spinner').should('not.exist');
		cy.get('.guide-bar').should('have.length', 2);
	});

	it('says the day is empty only once the background has answered with nothing', () => {
		mountGuide({ deferSlate: true });
		cy.get('.popup-loading-spinner').should('be.visible');

		cy.get<guideHandle>('@guide').then(guide => guide.deliver([]));

		cy.get('.popup-no-games-wrap').should('be.visible');
		cy.get('.popup-loading-spinner').should('not.exist');
	});

	it('draws only the selected day, not the whole slate', () => {
		mountGuide();
		// Two NFL games today; the NBA game is tomorrow and belongs to the next page.
		cy.get('.guide-bar').should('have.length', 2);
		cy.contains('.guide-league-label', 'NBA').should('not.exist');
	});

	it('pages forward to a day the slate reaches and shows that day instead', () => {
		mountGuide();
		cy.get('.guide-bar').should('have.length', 2);

		cy.get('.guide-day-pager button').last().click();

		cy.get('.guide-bar').should('have.length', 1);
		cy.contains('.guide-league-label', 'NBA').should('exist');
	});

	it('re-asks the background for the slate when a poll lands', () => {
		mountGuide();
		cy.get('.guide-bar').should('have.length', 2);

		cy.get<guideHandle>('@guide').then(guide => {
			const before = guide.slateRequests();
			guide.pushScoresUpdated();
			cy.wrap(null).should(() => {
				expect(guide.slateRequests()).to.be.greaterThan(before);
			});
		});
	});

	it('opens the detail drawer on the game that was clicked', () => {
		mountGuide();
		openFirstGame();
		cy.get('.guide-drawer').contains('Philadelphia Eagles').should('exist');
	});

	// Two beats, and the pair is the point: with motion on the panel has to stay mounted long
	// enough to animate out, so a spec that only waited for it to disappear could not tell the
	// animated path from the reduced-motion one below.
	it('plays the drawer out on Escape rather than snatching it away', () => {
		mountGuide();
		openFirstGame();

		cy.get('body').trigger('keydown', { key: 'Escape' }).then(() => {
			expect(Cypress.$('.guide-drawer[data-closing="true"]')).to.have.length(1);
		});

		cy.get('.guide-drawer').should('not.exist');
	});

	/* The exit is driven by animationend. Under reduced motion the animation is off, so that event
	   never arrives and a drawer that trusted it would sit there forever with no way out. */
	it('closes the drawer immediately under reduced motion, where no animation will ever end', () => {
		cy.wrap(Cypress.automation('remote:debugger:protocol', {
			command: 'Emulation.setEmulatedMedia',
			params: { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
		}));

		mountGuide();
		openFirstGame();

		// Gone in the same tick as the key, with no closing phase to wait on.
		cy.get('body').trigger('keydown', { key: 'Escape' }).then(() => {
			expect(Cypress.$('.guide-drawer')).to.have.length(0);
		});

		cy.then(() => Cypress.automation('remote:debugger:protocol', {
			command: 'Emulation.setEmulatedMedia',
			params: { features: [] },
		}));
	});

	/* Picking a second game while the first is on its way out has to cancel that exit. Letting it
	   finish tears the drawer down and takes the newly picked game with it, so the click reads as
	   having done nothing at all. */
	it('keeps the drawer open when a second game is picked mid-exit', () => {
		mountGuide();
		openFirstGame();
		cy.get('.guide-drawer').contains('Philadelphia Eagles').should('exist');

		// Escape starts the exit, then the second bar is clicked before it completes.
		cy.get('body').trigger('keydown', { key: 'Escape' });
		cy.get('.guide-drawer[data-closing="true"]').should('exist');
		cy.get('.guide-bar-content').eq(1).click();

		cy.get('.guide-drawer').should('exist').and('not.have.attr', 'data-closing');
		cy.get('.guide-drawer').contains('nfl-niners Home').should('exist');
	});

	it('sends a real boost to the background when one is set from the drawer', () => {
		mountGuide();
		openFirstGame();

		cy.get('.guide-drawer input[type="number"]').first().setInputValue(25);

		cy.get<guideHandle>('@guide').should(guide => {
			expect(guide.sentMessages).to.deep.include({ type: 'SET_GAME_BOOST', gameId: 'nfl-eagles', boost: 25 });
		});
	});

	// Set from the translation catalogue rather than written into index.html, so the tab a reader
	// finds this page by is in their language.
	it('names the page in the tab strip in the language the reader is using', () => {
		mountGuide();
		cy.document().its('title').should('equal', 'Guide \u00b7 ArenaSwap');
	});

	it('drops the best-window summary from the header when the band is switched off', () => {
		mountGuide();
		cy.get('.guide-band-summary').should('exist');
		cy.get('#guideBandToggle').should('have.attr', 'role', 'switch');

		cy.get('#guideBandToggle').uncheck({ force: true });

		cy.get('.guide-band-summary').should('not.exist');
		cy.get('.guide-band').should('not.exist');
	});

	// The slate carries the day but no scores. Without the popup's own state beside it, the drawer
	// read 0 / 100 on a live game.
	it('shows the live game its real PowerScore in the drawer', () => {
		mountGuide({ state: { games: [eagles], scores: [makeScore(eagles.id, 71)] } });
		openFirstGame();
		cy.get('.guide-drawer .powerscore-breakdown-row-total').should('contain.text', '71 / 100');
	});

	// The popup's patter while it waits, and no band switch for a grid that is not there yet.
	it('waits with a spinner and a line rather than a control that does nothing', () => {
		mountGuide({ deferSlate: true });
		cy.get('.popup-loading-text').invoke('text').should('not.be.empty');
		cy.get('#guideBandToggle').should('not.exist');
	});

	// The guide has no tab registry to write to, so a picker there would list nothing and save
	// nothing. The panel closes rather than going back, since there is nothing behind it.
	it('offers no tab picker on a scheduled game, and closes rather than going back', () => {
		mountGuide();
		cy.get("[data-game-id='nfl-niners'] .guide-bar-content").click();
		// The setup card is there, so the picker's absence is the prop rather than an empty drawer.
		cy.get('.guide-drawer .dt-setup').should('exist');
		cy.get('.guide-drawer .game-card-tab-assign').should('not.exist');
		cy.get('.guide-drawer .dt-back').should('have.length.at.least', 1).each(($back: JQuery<HTMLElement>) => {
			expect($back.text()).to.contain('Close');
			expect($back.find('.bi-x-lg')).to.have.length(1);
		});
	});

	// Commas, not middle dots, and one sentence with the switch's own label.
	it('finishes the switch label with a plain summary of the window', () => {
		mountGuide();
		cy.get('.guide-band-summary').invoke('text').should('match', /^\d{1,2}:\d{2}.+, \d+ games?$/).and('not.contain', '\u00b7');
	});

	it('names the day in the header, and lights the Today button only on today', () => {
		mountGuide();
		cy.get('.guide-day').should('have.text', new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
		cy.get('.guide-day-today').should('have.class', 'active').and('have.attr', 'aria-current', 'date');

		cy.get('.guide-day-pager button').last().click();

		cy.get('.guide-day').should('have.text', new Date(tomorrow).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
		cy.get('.guide-day-today').should('not.have.class', 'active').and('not.have.attr', 'aria-current');
	});

	it('brings the reader back to today from another day', () => {
		mountGuide();
		cy.get('.guide-day-pager button').last().click();
		cy.get('.guide-bar').should('have.length', 1);

		cy.get('.guide-day-today').click();

		cy.get('.guide-bar').should('have.length', 2);
		cy.get('.guide-day-today').should('have.class', 'active');
		// Back on the present, rather than at the start of the day.
		cy.get('.guide-scroller').invoke('scrollLeft').should('be.greaterThan', 0);
	});

	it('brings the grid back round to now when Today is pressed on today', () => {
		mountGuide();
		cy.get('.guide-scroller').invoke('scrollLeft').should('be.greaterThan', 0).then(opened => {
			cy.get('.guide-scroller').scrollTo(0, 0);
			cy.get('.guide-scroller').invoke('scrollLeft').should('equal', 0);
			cy.get('.guide-day-today').click();
			cy.get('.guide-scroller').invoke('scrollLeft').should('equal', opened);
		});
	});

	it('stops the pager at both ends of the slate', () => {
		mountGuide();
		cy.get('.guide-day-pager button').first().should('be.disabled');
		cy.get('.guide-day-pager button').last().should('not.be.disabled').click();
		cy.get('.guide-day-pager button').last().should('be.disabled');
		cy.get('.guide-day-pager button').first().should('not.be.disabled');
	});

	it('offers no way back to a today that has nothing on it', () => {
		mountGuide({ games: [niners], atMs: tomorrow });
		cy.get('.guide-bar').should('have.length', 1);
		cy.get('.guide-day-today').should('be.disabled');
	});

	// The slate carries no PowerScores; the popup's state does, and the block is sized by it.
	it('puts the live game\'s real PowerScore on its block, and draws the hottest one tall', () => {
		mountGuide({ state: { games: [eagles], scores: [makeScore(eagles.id, 71)] } });
		cy.get("[data-game-id='nfl-eagles'] .guide-bar-value").should('contain.text', '71');
		cy.get("[data-game-id='nfl-eagles']").should('have.attr', 'data-heat', 'hot');
		cy.get("[data-game-id='nfl-niners'] .guide-bar-value").should('not.exist');
	});

	it('draws no PowerScore at all until the popup\'s state has one', () => {
		mountGuide();
		cy.get('.guide-bar').should('have.length', 2);
		cy.get('.guide-bar-value').should('not.exist');
		cy.get("[data-game-id='nfl-eagles']").should('have.attr', 'data-heat', 'cool');
	});

	// Read-only: the Guide shows which tab a game is on, and never assigns one.
	it('marks the game whose tab is showing, by that tab\'s number', () => {
		mountGuide({
			registry: [{ tabId: 7, gameId: 'nfl-eagles' }, { tabId: 8, gameId: 'nfl-niners' }],
			activeTabs: [{ id: 7, index: 2, active: true }, { id: 8, index: 3, active: false }],
		});
		cy.get("[data-game-id='nfl-eagles']").should('have.attr', 'data-watched', 'true');
		cy.get("[data-game-id='nfl-eagles'] .guide-bar-watching").should('have.text', 'Watching, Tab 3');
		cy.get("[data-game-id='nfl-niners']").should('not.have.attr', 'data-watched');
	});

	it('draws the wordmark in ink, following the Theme setting', () => {
		mountGuide({ prefs: { theme: 'light' } });
		cy.document().its('documentElement.dataset.bsTheme').should('equal', 'light');
		cy.get('.guide-wordmark').should('have.attr', 'aria-label', 'ArenaSwap').and(([mark]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(mark!).color).to.equal('rgb(14, 16, 19)');
		});
		cy.get('.guide-page').should('have.css', 'background-color', 'rgb(244, 245, 247)');
		cy.document().then(doc => { delete doc.documentElement.dataset.bsTheme; });
	});

	// A Sunday of fifteen early kickoffs is taller than the tab. The page holds still and the grid
	// scrolls inside it, so the header, the ruler and the league names stay where they are.
	it('holds the header and the ruler still while a long day scrolls under them', () => {
		const sunday = Array.from({ length: 15 }, (_, index) => game(`nfl-${index}`, 'nfl', '2026-09-13T17:00:00Z'));
		mountGuide({ games: sunday });
		cy.get('.guide-bar').should('have.length', 15);
		cy.get('.guide-header').should(([header]: JQuery<HTMLElement>) => {
			expect(header!.getBoundingClientRect().height).to.equal(56);
		});
		cy.get('.guide-page').should(([page]: JQuery<HTMLElement>) => {
			expect(page!.getBoundingClientRect().height).to.equal(800);
		});
		cy.get('.guide-scroller').should(([scroller]: JQuery<HTMLElement>) => {
			expect(scroller!.scrollHeight).to.be.greaterThan(scroller!.clientHeight);
		});
		cy.get('.guide-scroller').scrollTo(0, 300);
		cy.get('.guide-ruler').should(([ruler]: JQuery<HTMLElement>) => {
			expect(ruler!.getBoundingClientRect().top).to.equal(56);
		});
		cy.get('.guide-league-inner').should(([name]: JQuery<HTMLElement>) => {
			expect(name!.getBoundingClientRect().top, 'the league name rides down under the ruler').to.equal(56 + 32);
		});
	});

	it('still draws the grid when the slate comes back with no day it can anchor to now', () => {
		mountGuide({ games: [sixers], atMs: tomorrow });
		cy.get('.guide-bar').should('have.length', 1);
		cy.get('.popup-no-games-wrap').should('not.exist');
	});
});

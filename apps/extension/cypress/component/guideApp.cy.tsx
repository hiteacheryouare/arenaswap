import type { Game, GuideSlate, LeagueId } from '@arenaswap/core/types';
import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import App from '../../entrypoints/guide/app';
import { makeGame } from '../support/fixtures';
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
}

interface guideHandle {
	/** Resolves the slate request the app made on mount. */
	deliver: (games: Game[]) => void;
	/** Fires the broadcast the background sends after every poll. */
	pushScoresUpdated: () => void;
	sentMessages: { type: string;[key: string]: unknown }[];
	slateRequests: () => number;
}

const mountGuide = ({ deferSlate = false, games = [eagles, niners, sixers], atMs = now }: MountOptions = {}) => {
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
		storage: {
			sync: { get: () => Promise.resolve({ prefs: createDefaultUserPreferences(), prefsUpdatedAt: 0 }) },
			local: { get: () => Promise.resolve({ prefs: null, prefsUpdatedAt: 0 }) },
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
	cy.get('.guide-bar').first().click();
	cy.get('.guide-drawer').should('exist');
};

describe('the guide page', () => {
	/* Two states that look the same in a screenshot and mean opposite things. Dressing a slow
	   network up as an answer is how "your Sunday has nothing on it" gets shown to somebody with
	   twelve games about to kick off. */
	it('says it is still loading rather than reporting a quiet day it has not heard about', () => {
		mountGuide({ deferSlate: true });

		cy.get('.guide-loading').should('be.visible');
		cy.get('.guide-empty').should('not.exist');
		cy.get('.guide-bar').should('not.exist');

		cy.get<guideHandle>('@guide').then(guide => guide.deliver([eagles, niners]));

		cy.get('.guide-loading').should('not.exist');
		cy.get('.guide-bar').should('have.length', 2);
	});

	it('says the day is empty only once the background has answered with nothing', () => {
		mountGuide({ deferSlate: true });
		cy.get('.guide-loading').should('be.visible');

		cy.get<guideHandle>('@guide').then(guide => guide.deliver([]));

		cy.get('.guide-empty').should('be.visible');
		cy.get('.guide-loading').should('not.exist');
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
		cy.get('.guide-bar').eq(1).click();

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

		cy.get('#guideBandToggle').uncheck({ force: true });

		cy.get('.guide-band-summary').should('not.exist');
		cy.get('.guide-band').should('not.exist');
	});

	it('still draws the grid when the slate comes back with no day it can anchor to now', () => {
		mountGuide({ games: [sixers], atMs: tomorrow });
		cy.get('.guide-bar').should('have.length', 1);
		cy.get('.guide-empty').should('not.exist');
	});
});

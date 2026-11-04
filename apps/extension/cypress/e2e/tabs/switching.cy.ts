import { broadcastTotal, expectHealthyBackground, openPopup, play, startExtension, world } from '../../support/liveExtension';
import { gameIds, slate, storedPrefs } from '../../support/liveGames';

// The shipped worker deciding where the user should be, off two recorded games: Liberty at Dream
// with 3:53 left and Hurricanes at Flyers tied in the third. Each score change is one the game
// could really have made, played through the scoreboard the worker polls.

const news = 1;
const wnbaTab = 2;
const nhlTab = 3;

const tabs = [
	{ id: news, url: 'https://news.test/', title: 'News' },
	{ id: wnbaTab, url: 'https://stream-one.test/wnba', title: 'Liberty at Dream' },
	{ id: nhlTab, url: 'https://stream-two.test/nhl', title: 'Hurricanes at Flyers' },
];

const registry = [{ tabId: wnbaTab, gameId: gameIds.wnba }, { tabId: nhlTab, gameId: gameIds.nhl }];
const cooldownSeconds = 120;

const boot = (games: Parameters<typeof slate>[0]) => startExtension({
	tabs,
	local: { onboardingCompleted: true },
	sync: storedPrefs({ cooldownSeconds }),
	session: { tabRegistry: registry },
	events: slate(games),
});

const watching = (tabId: number) => world().should(live => expect(live.activeTabId(), 'tab in front').to.equal(tabId));
const muted = (tabId: number, expected: boolean) => world().should(live => expect(live.tab(tabId)?.mutedInfo.muted, `tab ${tabId} muted`).to.equal(expected));
const lastNotification = () => world().then(live => live.notifications.at(-1));

describe('switching to the best game', () => {
	afterEach(expectHealthyBackground);

	it('switches to the registered game that is close, and says why', () => {
		boot({ wnba: { home: 79, away: 50 }, nhl: {} });
		play(30_000);

		watching(nhlTab);
		muted(nhlTab, false);
		muted(wnbaTab, true);
		lastNotification().should('deep.equal', {
			id: 'arenaswap-switch',
			title: 'Switched → CAR 2–2 PHI',
			message: 'Tied with 5:49 left. Off to Xfinity Mobile Arena!',
		});
	});

	it('waits out the switch cooldown before following a game that overtakes', () => {
		boot({ wnba: { home: 79, away: 50 }, nhl: {} });
		play(30_000);
		watching(nhlTab);

		// The Liberty come all the way back and tie it.
		world().then(live => { live.events = slate({ wnba: { home: 79, away: 79 }, nhl: {} }); });
		play(60_000);
		world().should(live => expect(broadcastTotal(live, gameIds.wnba)).to.be.greaterThan(broadcastTotal(live, gameIds.nhl)!));
		watching(nhlTab);

		play(cooldownSeconds * 1000);
		watching(wnbaTab);
		muted(nhlTab, true);
		lastNotification().its('title').should('equal', 'Switched → NY 79–79 ATL');
		lastNotification().its('message').should('equal', 'Liberty came back from 29 down with 3:53 left. Off to State Farm Arena!');
	});

	it('lets a tab picked by hand stand for the cooldown, then takes the user back to the better game', () => {
		boot({ wnba: { home: 79, away: 50 }, nhl: {} });
		play(30_000);
		watching(nhlTab);
		play(cooldownSeconds * 1000);

		world().then(live => live.userActivates(wnbaTab));
		play(60_000);
		watching(wnbaTab);

		// Still tied in Philadelphia, a couple of minutes further on.
		world().then(live => { live.events = slate({ wnba: { home: 79, away: 50 }, nhl: { clock: 210 } }); });
		play(cooldownSeconds * 1000);
		watching(nhlTab);
	});

	it('leaves a user reading something else alone while no registered game is live', () => {
		boot({});
		play(60_000);
		watching(news);
		world().its('notifications').should('deep.equal', []);
	});

	it('lists what the worker scored in the popup, best game first', () => {
		boot({ wnba: { home: 79, away: 50 }, nhl: {} });
		play(30_000);
		watching(nhlTab);

		openPopup();
		cy.contains('.popup-section-title', 'Active Tabs').should('be.visible');
		cy.get('.game-card-ps-score', { timeout: 10_000 }).should('have.length', 2);
		world().then(live => {
			cy.get('.game-card-ps-score').first().should('have.text', `${broadcastTotal(live, gameIds.nhl)} / 100`);
			cy.get('.game-card-ps-score').last().should('have.text', `${broadcastTotal(live, gameIds.wnba)} / 100`);
		});
	});
});

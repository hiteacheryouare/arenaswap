import { expectHealthyBackground, openPopup, play, startExtension, world } from '../../support/liveExtension';
import { gameIds, slate, storedPrefs } from '../../support/liveGames';

// The boss button pressed on the shipped worker while a game is on: what hides, what stays hidden
// while the games carry on, and what comes back when the user turns ArenaSwap on again.

const wnbaTab = 2;
const nhlTab = 3;
const decoyUrl = 'https://docs.test/budget';

const gameTabs = [
	{ id: 1, url: 'https://news.test/', title: 'News' },
	{ id: wnbaTab, url: 'https://stream-one.test/wnba', title: 'Liberty at Dream' },
	{ id: nhlTab, url: 'https://stream-two.test/nhl', title: 'Hurricanes at Flyers' },
];

const boot = (options: { decoy?: string; extraTabs?: typeof gameTabs } = {}) => startExtension({
	tabs: [...gameTabs, ...(options.extraTabs ?? [])],
	local: { onboardingCompleted: true },
	sync: storedPrefs({ bossDecoyUrl: options.decoy ?? decoyUrl, cooldownSeconds: 0 }),
	session: { tabRegistry: [{ tabId: wnbaTab, gameId: gameIds.wnba }, { tabId: nhlTab, gameId: gameIds.nhl }] },
	events: slate({ wnba: { home: 79, away: 50 }, nhl: {} }),
});

const watching = (tabId: number) => world().should(live => expect(live.activeTabId(), 'tab in front').to.equal(tabId));
const gameTabsMuted = (muted: boolean) => world().should(live => {
	expect(live.tab(wnbaTab)?.mutedInfo.muted, 'Liberty at Dream muted').to.equal(true);
	expect(live.tab(nhlTab)?.mutedInfo.muted, 'Hurricanes at Flyers muted').to.equal(muted);
});
const storedEnabled = () => world().its('storage.sync').invoke('get', 'prefs').its('enabled');

describe('the boss button', () => {
	afterEach(expectHealthyBackground);

	it('puts the decoy page in front, silences every game and stops switching', () => {
		boot();
		play(30_000);
		watching(nhlTab);
		gameTabsMuted(false);

		openPopup();
		cy.get('button[aria-label="Boss is coming"]').click();

		world().its('created').should('deep.equal', [{ id: 900, url: decoyUrl }]);
		watching(900);
		gameTabsMuted(true);
		storedEnabled().should('equal', false);

		// The Liberty tie it up while the boss is still standing there. Nothing moves.
		world().then(live => { live.events = slate({ wnba: { home: 79, away: 79 }, nhl: { clock: 210 } }); });
		play(60_000);
		watching(900);
		gameTabsMuted(true);
	});

	it('brings switching and the sound back once ArenaSwap is turned on again', () => {
		boot();
		play(30_000);
		openPopup();
		cy.get('button[aria-label="Boss is coming"]').click();
		watching(900);

		openPopup();
		cy.get('input[aria-label="Enable auto-switching"]').should('not.be.checked').check({ force: true });
		storedEnabled().should('equal', true);

		play(30_000);
		watching(nhlTab);
		gameTabsMuted(false);
	});

	it('answers the keyboard shortcut too, and goes back to a decoy tab that is already open', () => {
		boot({ extraTabs: [{ id: 5, url: `${decoyUrl}#gid=3`, title: 'Budget' }] });
		play(30_000);
		watching(nhlTab);

		world().then(live => live.pressCommand('boss-button'));
		watching(5);
		world().its('created').should('deep.equal', []);
		gameTabsMuted(true);
		storedEnabled().should('equal', false);
	});

	it('opens a blank tab when no decoy page is set', () => {
		boot({ decoy: '' });
		play(30_000);
		world().then(live => live.pressCommand('boss-button'));

		world().its('created').should('deep.equal', [{ id: 900, url: 'chrome://newtab/' }]);
		watching(900);
		gameTabsMuted(true);
	});
});

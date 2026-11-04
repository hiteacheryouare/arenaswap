import { expectHealthyBackground, openPopup, play, startExtension, world } from '../../support/liveExtension';
import { gameIds, slate, storedPrefs } from '../../support/liveGames';

// Standby Stream set up from the popup the way a user does it, then the shipped worker parking on
// it when both recorded games turn into blowouts, and leaving it when one tightens up again.

const wnbaTab = 2;
const nhlTab = 3;
const channelTab = 4;

const tabs = [
	{ id: 1, url: 'https://news.test/', title: 'News' },
	{ id: wnbaTab, url: 'https://stream-one.test/wnba', title: 'Liberty at Dream' },
	{ id: nhlTab, url: 'https://stream-two.test/nhl', title: 'Hurricanes at Flyers' },
	{ id: channelTab, url: 'https://channel.test/live', title: 'Sports Channel' },
];

const blowouts = { wnba: { home: 99, away: 60 }, nhl: { home: 6, away: 1 } };

const watching = (tabId: number) => world().should(live => expect(live.activeTabId(), 'tab in front').to.equal(tabId));
const standbyBanner = () => cy.get('[data-testid="standby-banner"]');

const bootWithStandby = (games: Parameters<typeof slate>[0]) => startExtension({
	tabs,
	local: { onboardingCompleted: true, standbyOnboardingDone: true },
	sync: storedPrefs({ standbyStreamEnabled: true }),
	session: { tabRegistry: [{ tabId: wnbaTab, gameId: gameIds.wnba }, { tabId: nhlTab, gameId: gameIds.nhl }], standbyStreamTabId: channelTab },
	events: slate(games),
});

describe('Standby Stream', () => {
	afterEach(expectHealthyBackground);

	it('is turned on and pointed at a tab from settings, and the worker parks there once every game goes quiet', () => {
		startExtension({
			tabs,
			local: { onboardingCompleted: true, standbyOnboardingDone: true },
			sync: storedPrefs(),
			session: { tabRegistry: [{ tabId: wnbaTab, gameId: gameIds.wnba }, { tabId: nhlTab, gameId: gameIds.nhl }] },
			events: slate(blowouts),
		});
		openPopup();
		cy.get('button.popup-settings-button[aria-label="Settings"]').click();
		cy.get('#settingsGroup-standby').click();
		cy.get('#standbyStreamToggle').check({ force: true });
		cy.get('#standbyTabSelect').choose('Sports Channel');
		world().its('storage.session').invoke('get', 'standbyStreamTabId').should('equal', channelTab);
		world().its('storage.sync').invoke('get', 'prefs').its('standbyStreamEnabled').should('equal', true);

		play(30_000);
		watching(channelTab);
		world().then(live => live.notifications.at(-1)).should('deep.include', { title: 'Parked on Standby Stream', message: 'Every game went quiet.' });
	});

	it('says so in the popup while it is parked', () => {
		bootWithStandby(blowouts);
		play(30_000);
		watching(channelTab);

		openPopup();
		standbyBanner().should('be.visible').and('contain.text', 'On Standby Stream until something heats up');
	});

	it('leaves the standby tab for the game that heats back up, and the banner goes with it', () => {
		bootWithStandby(blowouts);
		play(30_000);
		watching(channelTab);
		openPopup();
		standbyBanner().should('be.visible');

		// Carolina claws back to a tie with three and a half minutes left.
		world().then(live => { live.events = slate({ wnba: blowouts.wnba, nhl: { home: 6, away: 6, clock: 210 } }); });
		play(30_000);
		watching(nhlTab);
		world().then(live => live.notifications.at(-1)).its('title').should('equal', 'Switched → CAR 6–6 PHI');
		standbyBanner().should('not.exist');
	});

	it('stays on a game while any registered game is still above the threshold', () => {
		bootWithStandby({ wnba: blowouts.wnba, nhl: {} });
		play(30_000);
		watching(nhlTab);
		play(60_000);
		watching(nhlTab);
		world().its('notifications').should(notifications => {
			expect(notifications.map(notification => notification.title)).not.to.include('Parked on Standby Stream');
		});
	});
});

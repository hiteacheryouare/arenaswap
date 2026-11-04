import type { DebugState } from '@arenaswap/core/types';
import { expectHealthyBackground, extensionUrl, openPage, openPopup, startExtension, world } from '../../support/liveExtension';
import { slate, storedPrefs } from '../../support/liveGames';

// Profiles and backup files, driven from the popup and the backup tab against the shipped worker,
// so each step is checked where it matters: what the worker is now following.

const tabs = [{ id: 1, url: 'https://news.test/', title: 'News' }];
const mainLeagues = ['wnba', 'nhl'];

const openSettings = () => cy.get('button.popup-settings-button[aria-label="Settings"]').click();
const openGroup = (id: string) => cy.get(`#settingsGroup-${id}`).click();

// What the worker is running on, asked of the worker itself until it answers or two seconds pass.
const workerFollows = (leagues: string[]) => world().then(live => {
	const ask = (attempt: number): void => {
		cy.wrap(live.send({ type: 'GET_DEBUG_STATE' }), { log: false }).then(debug => {
			const followed = (debug as DebugState).enabledLeagues.toSorted();
			if (attempt < 20 && JSON.stringify(followed) !== JSON.stringify(leagues.toSorted())) {
				cy.wait(100, { log: false });
				ask(attempt + 1);
				return;
			}
			expect(followed, 'leagues the worker follows').to.have.members(leagues);
		});
	};
	ask(0);
});

const newFreshProfile = (name: string) => {
	openSettings();
	openGroup('backup');
	cy.get('#profileNew').click();
	cy.get('#profileName').clear().type(name);
	cy.get('#profileFresh').click();
	cy.contains('Step 1 of 2').should('be.visible');
	cy.contains('Which sports do you watch?').should('be.visible');
};

const bootMain = (overrides: Parameters<typeof storedPrefs>[0] = {}, local: Record<string, unknown> = {}) => startExtension({
	tabs,
	local: { onboardingCompleted: true, ...local },
	sync: storedPrefs({ enabledLeagues: mainLeagues as never, ...overrides }),
	events: slate({ wnba: {}, nhl: {} }),
});

describe('profiles', () => {
	afterEach(expectHealthyBackground);

	it('starts a fresh profile at the league picker, and the worker follows its leagues', () => {
		bootMain();
		openPopup();
		newFreshProfile('Weekend');
		cy.contains('button', 'Next').click();
		cy.contains('Step 2 of 2', { timeout: 15_000 }).should('be.visible');
		cy.contains('button', 'Done').click();

		cy.contains('.toast', 'Switched to Weekend.').should('be.visible');
		world().its('storage.sync').invoke('get', 'activeProfile').should('have.property', 'name', 'Weekend');
		world().its('storage.sync').invoke('get', 'prefs').its('enabledLeagues').then(leagues => workerFollows(leagues as string[]));
	});

	it('throws a fresh profile away when the user backs out of its league step, and puts the old setup back', () => {
		bootMain();
		openPopup();
		newFreshProfile('Weekend');
		cy.contains('button', 'Back').click();

		openGroup('backup');
		cy.get('#profileSwitch-main').should('have.attr', 'aria-current', 'true');
		cy.get('[id^="profileSwitch-"]').should('have.length', 1);
		world().its('storage.local').invoke('get', 'profiles').should('deep.equal', [{ id: 'main', name: 'main' }]);
		workerFollows(mainLeagues);
	});

	it('asks before deleting a profile, then drops it and its setup', () => {
		bootMain({}, {
			profiles: [{ id: 'main', name: 'main' }, { id: 'w1', name: 'Weekend' }],
			activeProfileId: 'main',
			profileSetups: { w1: { prefs: storedPrefs({ enabledLeagues: ['nfl'] }).prefs, fantasyRoster: [] } },
		});
		openPopup();
		openSettings();
		openGroup('backup');
		cy.get('#profileMore-w1').click();
		cy.get('#profileMore-w1').parent().find('.menu-item').contains('Delete').click();
		cy.get('#profileDeleteConfirm').click();

		cy.get('#profileSwitch-w1').should('not.exist');
		world().its('storage.local').should(local => {
			expect(local.get('profiles')).to.deep.equal([{ id: 'main', name: 'main' }]);
			expect(local.get('profileSetups')).not.to.have.property('w1');
		});
		workerFollows(mainLeagues);
	});

	it('switches to a stored profile, and the worker switches with it', () => {
		bootMain({}, {
			profiles: [{ id: 'main', name: 'main' }, { id: 'w1', name: 'Weekend' }],
			activeProfileId: 'main',
			profileSetups: { w1: { prefs: storedPrefs({ enabledLeagues: ['nfl'] }).prefs, fantasyRoster: [] } },
		});
		openPopup();
		openSettings();
		openGroup('backup');
		cy.get('#profileSwitch-w1').click();
		cy.contains('.toast', 'Switched to Weekend.').should('be.visible');
		workerFollows(['nfl']);

		cy.get('#profileSwitch-main').click();
		cy.contains('.toast', 'Switched to main.').should('be.visible');
		workerFollows(mainLeagues);
	});
});

// A backup file written by one browser and read by another, each its own extension and storage.
describe('moving a setup with a backup file', () => {
	afterEach(expectHealthyBackground);

	let backupFile = '';

	beforeEach(() => {
		bootMain({ sensitivity: 7 });
		openPopup();
		openSettings();
		openGroup('backup');
		cy.get('#backupOpen').click();
		world().its('created').should('deep.equal', [{ id: 900, url: extensionUrl('/settingsBackup.html') }]);

		openPage('/settingsBackup.html', 900);
		cy.window().then(win => {
			const blobs = new Map<string, Blob>();
			cy.stub(win.URL, 'createObjectURL').callsFake((blob: Blob) => {
				const url = `blob:backup/${blobs.size}`;
				blobs.set(url, blob);
				return url;
			});
			cy.stub(win.HTMLAnchorElement.prototype, 'click').callsFake(function (this: HTMLAnchorElement) {
				void blobs.get(this.href)!.text().then(text => { backupFile = text; });
			});
		});
		cy.get('#backupDownload').click();
		cy.wrap(null).should(() => expect(backupFile, 'downloaded file').to.contain('arenaswap-settings'));
	});

	const pickFile = () => cy.get('#importFile').then($input => {
		cy.wrap($input).selectFile({ contents: Cypress.Buffer.from(backupFile), fileName: 'arenaswap-settings-main.json', mimeType: 'application/json' }, { force: true });
	});

	it('replaces a brand-new browser\'s setup, so it skips onboarding and polls the file\'s leagues', () => {
		startExtension({
			tabs: [{ id: 7, url: extensionUrl('/settingsBackup.html'), title: 'ArenaSwap' }],
			events: slate({ wnba: {}, nhl: {} }),
		});
		openPage('/settingsBackup.html', 7);
		pickFile();
		cy.get('#importReplace').should('have.text', 'Replace main').click();
		cy.contains('h2', 'main is all moved in.').should('exist');

		workerFollows(mainLeagues);
		world().then(live => cy.wrap(live.send({ type: 'GET_DEBUG_STATE' })).its('sensitivity').should('equal', 7));
		openPopup();
		cy.contains('Welcome to ArenaSwap').should('not.exist');
		cy.contains('.game-card', 'ATL', { timeout: 10_000 }).should('exist');
	});

	it('adds the file beside the setup already there, and switching back restores the original', () => {
		startExtension({
			tabs: [{ id: 7, url: extensionUrl('/settingsBackup.html'), title: 'ArenaSwap' }],
			local: { onboardingCompleted: true },
			sync: storedPrefs({ enabledLeagues: ['nfl'] }),
			events: slate({ wnba: {}, nhl: {}, nfl: {} }),
		});
		openPage('/settingsBackup.html', 7);
		pickFile();
		cy.get('#importAdd').click();
		cy.contains('h2', 'main 2 is all moved in.').should('exist');
		workerFollows(mainLeagues);

		openPopup();
		openSettings();
		openGroup('backup');
		cy.get('[id^="profileSwitch-"]').should('have.length', 2);
		cy.get('#profileSwitch-main').click();
		cy.contains('.toast', 'Switched to main.').should('be.visible');
		workerFollows(['nfl']);
	});
});

import { createDefaultUserPreferences, normalizeUserPreferences } from '@arenaswap/core/constants';
import type { UserPreferences } from '@arenaswap/core/types';
import BackupSyncPage from '../../entrypoints/popup/components/backupSyncPage';
import BackupApp from '../../entrypoints/settingsBackup/app';
import en from '../../locales/en.json';

interface fakeExtension {
	areas: Record<'sync' | 'local', Map<string, unknown>>;
	sent: { type: string; [key: string]: unknown }[];
	createdTabs: string[];
	removedTabs: number[];
}

const storageArea = (store: Map<string, unknown>) => ({
	get: (defaults: Record<string, unknown>) => Promise.resolve(Object.fromEntries(
		Object.entries(defaults).map(([key, fallback]) => [key, store.has(key) ? structuredClone(store.get(key)) : fallback]),
	)),
	set: (values: Record<string, unknown>) => {
		Object.entries(values).forEach(([key, value]) => store.set(key, structuredClone(value)));
		return Promise.resolve();
	},
});

const installExtension = (seed: { sync?: Record<string, unknown>; local?: Record<string, unknown> } = {}): fakeExtension => {
	const fake: fakeExtension = {
		areas: { sync: new Map(Object.entries(seed.sync ?? {})), local: new Map(Object.entries(seed.local ?? {})) },
		sent: [],
		createdTabs: [],
		removedTabs: [],
	};
	(window as unknown as Record<string, unknown>).browser = {
		storage: { sync: storageArea(fake.areas.sync), local: storageArea(fake.areas.local) },
		runtime: {
			sendMessage: (message: fakeExtension['sent'][number]) => { fake.sent.push(message); return Promise.resolve(); },
			getURL: (path: string) => `chrome-extension://arenaswap${path}`,
			getManifest: () => ({ version: '3.0.0' }),
		},
		tabs: {
			create: ({ url }: { url: string }) => { fake.createdTabs.push(url); return Promise.resolve({}); },
			getCurrent: () => Promise.resolve({ id: 77 }),
			remove: (id: number) => { fake.removedTabs.push(id); return Promise.resolve(); },
		},
		i18n: { getUILanguage: () => 'en-US' },
	};
	return fake;
};

const laptopPrefs: UserPreferences = normalizeUserPreferences({
	...createDefaultUserPreferences(),
	enabledLeagues: ['nba', 'nfl', 'mlb'],
	favoriteTeamIds: ['nba:20'],
	scoringMode: 'blowouts',
	theme: 'light',
});

const roster = [{ league: 'nfl', athleteId: '3139477', name: 'Patrick Mahomes', teamId: '12', position: 'QB' }];

const exportedFile = (overrides: Record<string, unknown> = {}) => JSON.stringify({
	format: 'arenaswap-settings',
	version: 1,
	exportedAt: '2026-10-21T19:04:00.000Z',
	extensionVersion: '3.0.0',
	profile: {
		name: 'main',
		prefs: laptopPrefs,
		fantasyRoster: roster,
		device: { onboardingCompleted: true, standbyOnboardingDone: true, demoMode: false, demoSeason: 'real', breakdownCollapsed: ['sport'] },
	},
	...overrides,
});

const pickFile = (contents: string, action: 'select' | 'drag-drop' = 'select') => {
	const target = action === 'select' ? '#importFile' : '.backup-page';
	cy.get(target).selectFile({ contents: Cypress.Buffer.from(contents), fileName: 'arenaswap-settings-main-2026-10-21.json', mimeType: 'application/json' }, { action, force: true });
};

// The team list behind the favorites' crests. Answered here so a spec never reaches our sources.
const stubTeams = () => cy.intercept('GET', '**/teams?limit=1000', {
	sports: [{ leagues: [{ teams: [{ team: { id: '20', displayName: 'Philadelphia 76ers', abbreviation: 'PHI', logos: [] } }] }] }],
}).as('teams');

const twoProfiles = { profiles: [{ id: 'main', name: 'main' }, { id: 'w1', name: 'Weekend' }], activeId: 'main' };

const mountPage = (fantasyRoster: unknown[] = []) => {
	const actions = { onSwitch: cy.spy().as('switch'), onCreate: cy.spy().as('create'), onRename: cy.spy().as('rename'), onDelete: cy.spy().as('delete') };
	cy.mount(
		<div className='popup-root'>
			<div className='popup-container'>
				<BackupSyncPage prefs={laptopPrefs} fantasyRoster={fantasyRoster as never} profiles={twoProfiles} profilesBusy={false} profileActions={actions} />
			</div>
		</div>,
	);
};

const openRowMenu = (id: string, item: string) => {
	cy.get(`#profileMore-${id}`).click();
	cy.get(`#profileMore-${id}`).parent().find('.menu-item').contains(item).click();
};

describe('profiles & backup page', () => {
	it('reads back what syncs with the browser, from the live settings', () => {
		installExtension();
		mountPage(roster);

		cy.get('#backupSummary-leagues').should('have.text', '3');
		cy.get('#backupSummary-favorites').should('have.text', '1');
		cy.get('#backupSummary-scoring').should('have.text', 'Blowouts');
		cy.get('#backupSummary-theme').should('have.text', en.setup.themeLight);
		cy.get('#backupSummary-roster').should('have.text', '1');
	});

	it('opens the backup tab from its one button', () => {
		const fake = installExtension();
		mountPage();
		cy.get('#backupOpen').should('have.text', en.backup.open).click();
		cy.wrap(fake.createdTabs).should('deep.equal', ['chrome-extension://arenaswap/settingsBackup.html']);
	});

	it('switches profiles from the list, and the one in use stays put', () => {
		installExtension();
		mountPage();
		cy.get('#profileSwitch-main').should('have.attr', 'aria-current', 'true');
		cy.get('#profileSwitch-main').click();
		cy.get('@switch').should('not.have.been.called');
		cy.get('#profileSwitch-w1').should('not.have.attr', 'aria-current');
		cy.get('#profileSwitch-w1').click();
		cy.get('@switch').should('have.been.calledOnceWith', 'w1');
	});

	it('names a new profile, refusing one already taken, then starts it fresh or as a copy', () => {
		installExtension();
		mountPage();
		cy.get('#profileNew').click();
		cy.get('#profileDialog').should('be.visible');
		cy.get('#profileName').should('have.value', 'Profile 3');
		cy.get('#profileCopy').should('have.text', 'Copy main');

		cy.get('#profileName').clear().type('WEEKEND');
		cy.get('#profileNameTaken').should('have.text', 'You already have a profile called WEEKEND.');
		cy.get('#profileCopy').should('be.disabled');
		cy.get('#profileFresh').should('be.disabled');

		cy.get('#profileName').clear().type('Game Night');
		cy.get('#profileFresh').click();
		cy.get('@create').should('have.been.calledOnceWith', 'Game Night', true);
		cy.get('#profileDialog').should('not.be.visible');

		cy.get('#profileNew').click();
		cy.get('#profileName').clear().type('Copied{enter}');
		cy.get('@create').should('have.been.calledWith', 'Copied', false);
	});

	it('renames from the row menu', () => {
		installExtension();
		mountPage();
		openRowMenu('w1', en.profiles.rename);
		cy.get('#profileDialog .dialog-title').should('have.text', en.profiles.renameTitle);
		cy.get('#profileName').should('have.value', 'Weekend').clear().type('Sundays');
		cy.get('#profileRenameSave').click();
		cy.get('@rename').should('have.been.calledOnceWith', 'w1', 'Sundays');
	});

	it('asks before deleting, and never offers to delete the profile in use', () => {
		installExtension();
		mountPage();
		cy.get('#profileMore-main').click();
		cy.get('#profileMore-main').parent().find('.menu-item').should('have.length', 2).and('not.contain.text', en.profiles.delete);
		cy.get('body').type('{esc}');

		openRowMenu('w1', en.profiles.delete);
		cy.get('#profileDialog .dialog-title').should('have.text', 'Delete Weekend?');
		cy.get('#profileDialogCancel').click();
		cy.get('#profileDialog').should('not.be.visible');
		cy.get('@delete').should('not.have.been.called');

		openRowMenu('w1', en.profiles.delete);
		cy.get('#profileDeleteConfirm').click();
		cy.get('@delete').should('have.been.calledOnceWith', 'w1');
	});

	it('exports any profile from its row', () => {
		const fake = installExtension();
		mountPage();
		openRowMenu('w1', en.profiles.export);
		cy.wrap(fake.createdTabs).should('deep.equal', ['chrome-extension://arenaswap/settingsBackup.html#export=w1']);
	});
});

describe('backup tab', () => {
	beforeEach(() => window.localStorage.clear());

	it('downloads the whole setup as a dated file named after the profile', () => {
		stubTeams();
		installExtension({ sync: { prefs: laptopPrefs, fantasyRoster: roster }, local: { onboardingCompleted: true } });
		const downloads: { name: string; blob: Blob }[] = [];
		cy.window().then(win => {
			const blobs = new Map<string, Blob>();
			cy.stub(win.URL, 'createObjectURL').callsFake((blob: Blob) => {
				const url = `blob:test/${blobs.size}`;
				blobs.set(url, blob);
				return url;
			});
			cy.stub(win.HTMLAnchorElement.prototype, 'click').callsFake(function (this: HTMLAnchorElement) {
				downloads.push({ name: this.download, blob: blobs.get(this.href) as Blob });
			});
		});
		cy.mount(<BackupApp />);

		cy.contains(/Saves as arenaswap-settings-main-\d{4}-\d{2}-\d{2}\.json\./).should('exist');
		cy.get('#backupDownload').click();
		cy.wrap(downloads).should('have.length', 1).then(() => downloads[0].blob.text()).then(text => {
			expect(downloads[0].name).to.match(/^arenaswap-settings-main-\d{4}-\d{2}-\d{2}\.json$/);
			const file = JSON.parse(text);
			expect(file.format).to.equal('arenaswap-settings');
			expect(file.extensionVersion).to.equal('3.0.0');
			expect(file.profile.name).to.equal('main');
			expect(file.profile.prefs).to.deep.equal(laptopPrefs);
			expect(file.profile.fantasyRoster).to.deep.equal(roster);
			expect(file.profile.device.onboardingCompleted).to.equal(true);
		});
	});

	it('shows this browser\'s setup until a file arrives', () => {
		installExtension({ sync: { prefs: laptopPrefs, fantasyRoster: roster } });
		stubTeams();
		cy.mount(<BackupApp />);
		cy.get('#setupCardHeading').should('have.text', en.backup.yourSetup);
		cy.get('#setupRow-leagues .backup-setup-item').should('have.length', 3);
		cy.get('#setupRow-leagues .backup-setup-change').should('have.text', '3');
		cy.get('#setupRow-favorites .backup-setup-item').should('have.attr', 'title', 'Philadelphia 76ers');
		cy.get('#setupRow-roster .backup-setup-item').should('have.attr', 'title', 'Patrick Mahomes');
		cy.get('[data-removed="true"]').should('not.exist');
	});

	it('previews the file against this browser, then moves it in on Replace', () => {
		const fake = installExtension({ local: { onboardingCompleted: false } });
		stubTeams();
		cy.mount(<BackupApp />);

		pickFile(exportedFile());
		cy.get('#setupCardHeading').should('have.text', en.backupImport.fromFile);
		cy.get('#setupCardMeta').should('contain.text', 'Profile "main", exported Oct 21, 2026');
		// A fresh browser has no leagues on yet, so every league in the file is new.
		cy.get('#setupRow-leagues .backup-setup-item').should('have.length', 3);
		cy.get('#setupRow-leagues .backup-setup-change').should('have.text', '+3');
		cy.get('#setupRow-favorites .backup-setup-change').should('have.text', '+1');
		cy.get('#setupRow-scoring').should('contain.text', 'Classic').and('contain.text', 'Blowouts').find('.bi-arrow-right').should('exist');
		cy.wrap(fake.areas.sync).invoke('has', 'prefs').should('equal', false);

		cy.get('#importReplace').should('have.text', 'Replace main').click();
		cy.contains('h2', 'main is all moved in.').should('exist');
		cy.get('#setupCardHeading').should('have.text', en.backup.yourSetup);
		cy.get('[data-removed="true"]').should('not.exist');
		cy.wrap(fake.areas.sync).invoke('get', 'prefs').should('deep.equal', laptopPrefs);
		cy.wrap(fake.areas.local).invoke('get', 'fantasyRoster').should('deep.equal', roster);
		cy.wrap(fake.areas.local).invoke('get', 'onboardingCompleted').should('equal', true);
		cy.wrap(fake.sent).should('deep.equal', [{ type: 'UPDATE_PREFS', prefs: laptopPrefs }]);
		cy.get('html').should('have.attr', 'data-bs-theme', 'light');

		cy.get('#importCloseTab').click();
		cy.wrap(fake.removedTabs).should('deep.equal', [77]);
	});

	it('adds a file as a new profile beside this one and switches to it', () => {
		const homePrefs = { ...laptopPrefs, enabledLeagues: ['nhl'] };
		const fake = installExtension({ sync: { prefs: homePrefs }, local: { prefs: homePrefs } });
		stubTeams();
		cy.mount(<BackupApp />);
		pickFile(exportedFile());
		cy.get('#importAdd').should('have.text', en.backupImport.addAsNew).click();
		cy.contains('h2', 'main 2 is all moved in.').should('exist');
		cy.wrap(fake.areas.local).invoke('get', 'profiles').should('have.length', 2).its(1).should('have.property', 'name', 'main 2');
		cy.wrap(fake.areas.local).invoke('get', 'profileSetups').its('main.prefs.enabledLeagues').should('deep.equal', ['nhl']);
		cy.wrap(fake.areas.sync).invoke('get', 'prefs').should('deep.equal', laptopPrefs);
		cy.wrap(fake.areas.sync).invoke('get', 'activeProfile').should('have.property', 'name', 'main 2');
	});

	it('exports whichever profile is picked, starting from the one a row asked for', () => {
		const weekendPrefs = normalizeUserPreferences({ ...createDefaultUserPreferences(), enabledLeagues: ['nfl'] });
		installExtension({
			sync: { prefs: laptopPrefs },
			local: {
				profiles: [{ id: 'main', name: 'main' }, { id: 'w1', name: 'Weekend' }],
				activeProfileId: 'main',
				profileSetups: { w1: { prefs: weekendPrefs, fantasyRoster: [] } },
			},
		});
		stubTeams();
		cy.window().then(win => { win.location.hash = 'export=w1'; });
		cy.mount(<BackupApp />);
		cy.focused().should('have.id', 'backupDownload');
		cy.get('#exportProfile').should('contain.text', 'Weekend');
		cy.contains(/Saves as arenaswap-settings-weekend-\d{4}-\d{2}-\d{2}\.json\./).should('exist');
		cy.get('#setupCardMeta').should('have.text', 'Profile "Weekend".');
		cy.get('#setupRow-leagues .backup-setup-item').should('have.length', 1);

		cy.get('#exportProfile').click();
		cy.get('.select-dropdown-menu .menu-item').contains('main').click();
		cy.contains(/Saves as arenaswap-settings-main-/).should('exist');
		cy.get('#setupRow-leagues .backup-setup-item').should('have.length', 3);
		cy.window().then(win => { win.history.replaceState(null, '', win.location.pathname + win.location.search); });
	});

	it('counts a swapped league both ways even when the total stays the same', () => {
		installExtension({ sync: { prefs: { ...laptopPrefs, enabledLeagues: ['nba', 'nfl', 'nhl'] } } });
		stubTeams();
		cy.mount(<BackupApp />);
		pickFile(exportedFile());
		cy.get('#setupRow-leagues .backup-setup-change').should('have.text', '+1 −1');
		cy.get('#setupRow-leagues .backup-setup-item[data-removed="true"]').should('have.length', 1).and('have.attr', 'title', 'NHL');
		cy.get('#setupRow-favorites .backup-setup-change').should('have.text', en.backup.noChange);
		cy.get('#setupRow-scoring .bi-arrow-right').should('not.exist');
	});

	it('lands on the drop zone when onboarding sends someone to import', () => {
		installExtension();
		cy.window().then(win => { win.location.hash = 'import'; });
		cy.mount(<BackupApp />);
		cy.focused().should('have.id', 'importFile');
		cy.window().then(win => { win.history.replaceState(null, '', win.location.pathname + win.location.search); });
	});

	it('takes a file dropped anywhere on the page', () => {
		installExtension();
		cy.mount(<BackupApp />);
		pickFile(exportedFile(), 'drag-drop');
		cy.get('#importReplace').should('be.visible');
	});

	it('turns away files that are not ours, and lets the next pick start clean', () => {
		const fake = installExtension();
		cy.mount(<BackupApp />);

		pickFile('{"format": "arena');
		cy.get('#importProblem').should('have.text', en.backupImport.problemUnreadable);
		pickFile(JSON.stringify({ bookmarks: [] }));
		cy.get('#importProblem').should('have.text', en.backupImport.problemNotOurs);
		pickFile(exportedFile({ version: 2 }));
		cy.get('#importProblem').should('have.text', en.backupImport.problemTooNew);
		cy.get('#importReplace').should('not.exist');

		pickFile(exportedFile());
		cy.get('#importProblem').should('not.exist');
		cy.get('#importStartOver').click();
		cy.get('#importFile').should('have.value', '');
		cy.wrap(fake.sent).should('be.empty');
	});
});

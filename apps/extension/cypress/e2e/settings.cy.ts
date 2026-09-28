import { liveState, onboardedPrefs } from '../support/fixtures';

const onboarded = { local: { onboardingCompleted: true }, sync: { prefs: onboardedPrefs() } };
const openSettings = () => cy.get('button.popup-settings-button[aria-label="Settings"]').click();
const openGroup = (id: string) => cy.get(`#settingsGroup-${id}`).click();

describe('settings round-trip', () => {
	beforeEach(() => cy.openPopup({ ...onboarded, state: liveState() }));

	it('reaches the settings index from the games list and back again', () => {
		openSettings();
		cy.get('.settings-index-row').should('have.length', 7);

		cy.get('button.setup-header').click();
		cy.contains('.popup-section-title', 'Live Games').should('be.visible');
	});

	it('drills into a group and returns to the index', () => {
		openSettings();
		openGroup('switching');
		cy.get('#sensitivity-range').should('exist');

		cy.get('button.setup-header').click();
		cy.get('.settings-index-row').should('have.length', 7);
	});

	it('persists a sensitivity change to storage and the background', () => {
		openSettings();
		openGroup('switching');
		cy.get('#sensitivity-range').setInputValue(7);

		cy.contains('.setting-value-label', 'Ludicrous Speed').should('be.visible');
		cy.background().should(background => {
			expect(background.prefs?.sensitivity).to.equal(7);
			// Prefs are mirrored to both areas: sync for portability, local as the offline fallback.
			expect(background.storage.sync.has('prefs')).to.equal(true);
			expect(background.storage.local.has('prefs')).to.equal(true);
		});
	});

	it('survives a close and reopen with the stored prefs', () => {
		openSettings();
		openGroup('display');
		cy.get('#upcomingToggle').should('be.checked').uncheck({ force: true });

		cy.background().its('prefs').then(prefs => {
			// Reopening the popup is a fresh page load reading whatever storage kept.
			cy.openPopup({ ...onboarded, state: liveState(), sync: { prefs } });
			openSettings();
			openGroup('display');
			cy.get('#upcomingToggle').should('not.be.checked');
		});
	});

	// The one setting that cannot be read at the moment it is needed: the animation picks its mode
	// inside a `useState` initialiser, long before storage answers, so what it reads is a copy the
	// previous open left in localStorage. Which makes the second open the only one that can prove it.
	it('stops the opening animation from the next open onwards', () => {
		cy.get('.game-card-reveal-stage').should('exist');

		openSettings();
		openGroup('display');
		cy.get('#openRevealToggle').should('be.checked').uncheck({ force: true });

		cy.background().its('prefs').then(prefs => {
			cy.openPopup({ ...onboarded, state: liveState(), sync: { prefs } });
			cy.contains('.popup-section-title', 'Live Games').should('be.visible');
			cy.get('.game-card-reveal-stage').should('not.exist');
		});
	});

	it('reorders leagues and reports the new order', () => {
		openSettings();
		openGroup('leagues');
		cy.get('.league-order-row').first().find('.league-order-label').should('have.text', 'NBA');

		cy.get('#league-order-down-nba').click();

		cy.get('.league-order-row').first().find('.league-order-label').should('have.text', 'NFL');
		cy.background().its('prefs.enabledLeagues').should('deep.equal', ['nfl', 'nba']);
	});

	it('warns when every league is switched off', () => {
		openSettings();
		openGroup('leagues');
		cy.get('#league-nba').uncheck({ force: true });
		cy.get('#league-nfl').uncheck({ force: true });

		cy.contains('.setup-no-leagues-warn', /No leagues selected/).scrollIntoView().should('be.visible');
		cy.get('button.setup-header').click();
		cy.get('#settingsGroup-leagues').find('.settings-index-warn').should('exist');
	});

	it('keeps the last PowerScore signal from being switched off', () => {
		openSettings();
		openGroup('scoring');
		for (const signal of ['closeness', 'lateGame', 'momentum', 'leadChanges']) {
			cy.get(`#signal-${signal}`).uncheck({ force: true });
		}

		cy.get('#signal-comeback').should('be.disabled');
		cy.background().its('prefs.disabledSignals').should('have.length', 4);
	});

	it('finds a control through the settings search', () => {
		openSettings();
		cy.get('#settingsSearch').type('cooldown');

		cy.get('.settings-index-row').should('have.length', 1);
		cy.contains('.settings-index-row', 'Switching').click();
		cy.get('#cooldown-range').should('exist');
	});
});

const html = () => cy.document().its('documentElement');
const themeLabels: Record<string, string> = { dark: 'Dark', light: 'Light', system: 'Match my system' };
const chooseTheme = (value: string) => {
	cy.get('#themeSelect').click();
	cy.contains('.dropdown-menu.show .dropdown-item', themeLabels[value]!).click();
};
const pickTheme = (value: string) => {
	openSettings();
	openGroup('display');
	chooseTheme(value);
};

// The popup's CSS carries a light palette only under [data-bs-theme=light] on <html>, so the attribute
// is the whole switch. The copy in localStorage is what the next open's boot script reads.
describe('the theme setting', () => {
	// A matchMedia whose answer the test can change, so System can be watched following the OS.
	const lightScheme = { matches: false, listeners: new Set<() => void>() };
	const flipScheme = (prefersLight: boolean) => {
		lightScheme.matches = prefersLight;
		lightScheme.listeners.forEach(listener => listener());
	};

	beforeEach(() => {
		lightScheme.matches = false;
		lightScheme.listeners.clear();
		cy.on('window:before:load', win => {
			const real = win.matchMedia.bind(win);
			cy.stub(win, 'matchMedia').callsFake((query: string) => (query === '(prefers-color-scheme: light)'
				? {
					get matches() { return lightScheme.matches; },
					addEventListener: (_type: string, listener: () => void) => lightScheme.listeners.add(listener),
					removeEventListener: (_type: string, listener: () => void) => lightScheme.listeners.delete(listener),
				}
				: real(query)));
		});
	});

	it('opens dark for somebody who has never touched it', () => {
		cy.openPopup({ ...onboarded, state: liveState() });
		html().should('have.attr', 'data-bs-theme', 'dark');
	});

	it('switches to light, saves it, and leaves a copy for the next open', () => {
		cy.openPopup({ ...onboarded, state: liveState() });
		pickTheme('light');

		html().should('have.attr', 'data-bs-theme', 'light');
		cy.background().should(background => expect(background.prefs?.theme).to.equal('light'));
		cy.window().then(win => expect(win.localStorage.getItem('arenaswap.theme')).to.equal('light'));
		cy.get('body').should('have.css', 'background-color', 'rgb(255, 255, 255)');
	});

	it('follows the system, including when it changes while the popup is open', () => {
		cy.openPopup({ ...onboarded, state: liveState() });
		pickTheme('system');
		html().should('have.attr', 'data-bs-theme', 'dark');

		cy.then(() => flipScheme(true));
		html().should('have.attr', 'data-bs-theme', 'light');

		cy.then(() => flipScheme(false));
		html().should('have.attr', 'data-bs-theme', 'dark');
	});

	// Recorded from before the boot script runs, so a single dark frame on the way to light shows up.
	it('opens a stored light theme without ever passing through dark', () => {
		const seen: (string | undefined)[] = [];
		cy.on('window:before:load', win => {
			win.localStorage.setItem('arenaswap.theme', 'light');
			new win.MutationObserver(() => seen.push(win.document.documentElement.dataset.bsTheme))
				.observe(win.document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
		});
		cy.openPopup({ ...onboarded, sync: { prefs: onboardedPrefs({ theme: 'light' }) }, state: liveState() });

		cy.get('.game-card').should('have.length.greaterThan', 0);
		cy.then(() => expect(seen).to.not.be.empty.and.not.include('dark'));
	});

	it('keeps first-run dark even when a light copy is stored', () => {
		cy.on('window:before:load', win => win.localStorage.setItem('arenaswap.theme', 'light'));
		cy.openPopup({ state: liveState() });

		cy.get('.onb-logo-wrap').should('exist');
		html().should('have.attr', 'data-bs-theme', 'dark');
	});

	it('stops listening to the system once a fixed theme is picked', () => {
		cy.openPopup({ ...onboarded, state: liveState() });
		pickTheme('system');
		chooseTheme('dark');

		cy.then(() => flipScheme(true));
		html().should('have.attr', 'data-bs-theme', 'dark');
	});
});

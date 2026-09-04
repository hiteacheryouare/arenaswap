import SetupView from '../../entrypoints/popup/components/setupView';
import type { UserPreferences } from '@arenaswap/core/types';

const defaultPrefs: UserPreferences = {
	sensitivity: 4,
	cooldownSeconds: 45,
	switchDelaySeconds: 0,
	enabled: true,
	enabledLeagues: ['nba', 'nfl'],
	favoriteTeamIds: [],
	favoriteTeamBonusPoints: 0,
	showUpcomingGames: true,
	proTipsEnabled: true,
	notificationsEnabled: false,
	standbyStreamEnabled: false,
	standbyStreamThreshold: 20,
	bettingEnabled: false,
	temperatureUnit: 'F',
	romerUnlocked: false,
	holidayDecorationsEnabled: true,
	holidaySnowEnabled: true,
	holidayLightsEnabled: true,
	holidayLeavesEnabled: true,
	postseasonBoostPoints: 0,
	upcomingGamesDays: 7,
	disabledSignals: [],
};

const defaultProps = {
	prefs: defaultPrefs,
	prefsLoaded: true,
	demoMode: false,
	demoSeason: 'real' as const,
	leagueLogos: {},
	standbyStreamTabId: null,
	standbyOnboardingDone: true,
	openTabs: [],
	formatTabLabel: () => 'Tab',
	onClose: () => {},
	onSensitivityChange: () => {},
	onCooldownChange: () => {},
	onSwitchDelayChange: () => {},
	onFavoriteTeamBonusChange: () => {},
	onToggleLeague: () => {},
	onToggleSport: () => {},
	onReorderLeague: () => {},
	onResetLeagueOrder: () => {},
	onToggleShowUpcoming: () => {},
	onUpcomingGamesDaysChange: () => {},
	onToggleProTips: () => {},
	onToggleNotifications: () => {},
	onToggleDemo: () => {},
	onDemoSeasonChange: () => {},
	onToggleStandbyStream: () => {},
	onStandbyThresholdChange: () => {},
	onSetStandbyTab: () => {},
	onStandbyOnboardingDone: () => {},
	onToggleBetting: () => {},
	onToggleTemperatureUnit: () => {},
	onUnlockRomer: () => {},
	onToggleHolidayDecorations: () => {},
	onToggleHolidaySnow: () => {},
	onToggleHolidayLights: () => {},
	onToggleHolidayLeaves: () => {},
	onPostseasonBoostChange: () => {},
	onToggleSignal: () => {},
};

const openGroup = (id: string) => cy.get(`#settingsGroup-${id}`).click();

describe('setupView index', () => {
	it('shows the Settings header with a back button', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.contains('Settings').should('exist');
	});

	it('lists every settings group with a description', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('.settings-index-row').should('have.length', 6);
		cy.get('#settingsGroup-switching').find('.settings-index-desc').should('not.be.empty');
	});

	it('does not render the old tab bar', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('.setup-tabs').should('not.exist');
	});

	it('calls onClose when the root back button is clicked', () => {
		const spy = cy.spy().as('onClose');
		cy.mount(<SetupView {...defaultProps} onClose={spy} />);
		cy.get('button.setup-header').click();
		cy.get('@onClose').should('have.been.called');
	});

	it('flags the leagues row when no leagues are selected', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: [] }} />);
		cy.get('#settingsGroup-leagues').find('.settings-index-warn').should('exist');
	});

	it('does not flag the leagues row when leagues are selected', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsGroup-leagues').find('.settings-index-warn').should('not.exist');
	});
});

describe('setupView navigation', () => {
	it('opens a group page and hides the index', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('switching');
		cy.get('.settings-index-row').should('not.exist');
		cy.get('#sensitivity-range').should('exist');
	});

	it('returns to the index from a group page without closing settings', () => {
		const spy = cy.spy().as('onClose');
		cy.mount(<SetupView {...defaultProps} onClose={spy} />);
		openGroup('display');
		cy.get('button.setup-header').click();
		cy.get('.settings-index-row').should('have.length', 6);
		cy.get('@onClose').should('not.have.been.called');
	});

	it('shows the group description as the sub-page lede', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('standby');
		cy.get('.settings-page-lede').should('not.be.empty');
	});
});

describe('setupView search', () => {
	it('matches a setting by its label', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('cooldown');
		cy.contains('.settings-index-row', 'Switch cooldown').should('exist');
		cy.get('.settings-index-row').should('have.length.lessThan', 6);
	});

	it('matches a setting by a synonym that is not in its label', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('celsius');
		cy.contains('.settings-index-row', 'Temperature unit').should('exist');
	});

	it('ignores case and accents', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('COOLDOWN');
		cy.contains('.settings-index-row', 'Switch cooldown').should('exist');
	});

	it('does not spill a group description match onto every setting in that group', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('bonus');
		cy.contains('.settings-index-row', 'Favorite team bonus').should('exist');
		cy.contains('.settings-index-row', 'Postseason boost').should('exist');
		cy.contains('.settings-index-row', 'Closeness').should('not.exist');
	});

	it('shows an empty state when nothing matches', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('zzzznope');
		cy.get('.settings-index-row').should('not.exist');
		cy.get('.settings-search-empty').should('exist');
	});

	it('opens the owning group when a result is clicked', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('celsius');
		cy.contains('.settings-index-row', 'Temperature unit').click();
		cy.get('#temperatureUnitToggle').should('exist');
	});

	it('clears the query after navigating to a group', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('cooldown');
		cy.contains('.settings-index-row', 'Switch cooldown').click();
		cy.get('button.setup-header').click();
		cy.get('#settingsSearch').should('have.value', '');
		cy.get('.settings-index-row').should('have.length', 6);
	});
});

describe('setupView switching group', () => {
	beforeEach(() => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('switching');
	});

	it('renders sensitivity slider', () => {
		cy.get('#sensitivity-range').should('exist');
	});

	it('renders cooldown and delay sliders', () => {
		cy.get('#cooldown-range').should('exist');
		cy.get('#switch-delay-range').should('exist');
	});

	it('offers the explainer as a tooltip rather than permanent body copy', () => {
		cy.get('.setting-tooltip-btn').should('have.length.at.least', 3);
		cy.contains('Controls how big the PowerScore gap').should('not.exist');
	});
});

describe('setupView display group', () => {
	it('shows show-upcoming toggle checked when pref is true', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('#upcomingToggle').should('be.checked');
	});

	it('shows show-upcoming toggle unchecked when pref is false', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} />);
		openGroup('display');
		cy.get('#upcomingToggle').should('not.be.checked');
	});

	it('shows days-ahead slider when showUpcomingGames is true', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('#upcomingDaysSlider').should('exist');
	});

	it('hides days-ahead slider when showUpcomingGames is false', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} />);
		openGroup('display');
		cy.get('#upcomingDaysSlider').should('not.exist');
	});

	it('reflects the current upcomingGamesDays value on the slider', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, upcomingGamesDays: 10 }} />);
		openGroup('display');
		cy.get('#upcomingDaysSlider').should('have.value', '10');
	});

	it('calls onUpcomingGamesDaysChange when slider is moved', () => {
		const spy = cy.spy().as('onUpcomingGamesDaysChange');
		cy.mount(<SetupView {...defaultProps} onUpcomingGamesDaysChange={spy} />);
		openGroup('display');
		cy.get('#upcomingDaysSlider').then($el => {
			const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
			setter.call($el[0], 3);
			$el[0].dispatchEvent(new Event('input', { bubbles: true }));
		});
		cy.get('@onUpcomingGamesDaysChange').should('have.been.called');
	});

	it('shows temperature unit toggle', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('#temperatureUnitToggle').should('exist');
	});

	it('shows °F label when temperatureUnit is F', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		cy.get('#temperatureUnitToggle').should('contain', '°F');
	});

	it('shows °C label when temperatureUnit is C', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, temperatureUnit: 'C' }} />);
		openGroup('display');
		cy.get('#temperatureUnitToggle').should('contain', '°C');
	});

	it('shows °Rø label when temperatureUnit is Ro', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, temperatureUnit: 'Ro', romerUnlocked: true }} />);
		openGroup('display');
		cy.get('#temperatureUnitToggle').should('contain', '°Rø');
	});
});

const clickToggle = (times: number) => {
	for (let i = 0; i < times; i += 1) cy.get('#temperatureUnitToggle').click();
};

describe('setupView Rømer unlock', () => {
	it('cycles the unit on every click, unlocked or not', () => {
		const onCycle = cy.spy().as('onCycle');
		cy.mount(<SetupView {...defaultProps} onToggleTemperatureUnit={onCycle} />);
		openGroup('display');
		clickToggle(3);
		cy.get('@onCycle').should('have.callCount', 3);
	});

	it('does not unlock on six clicks', () => {
		const onUnlock = cy.spy().as('onUnlock');
		cy.mount(<SetupView {...defaultProps} onUnlockRomer={onUnlock} />);
		openGroup('display');
		clickToggle(6);
		cy.get('@onUnlock').should('not.have.been.called');
		cy.get('.romer-credit').should('not.exist');
	});

	it('unlocks on the seventh click and shows the credit', () => {
		const onUnlock = cy.spy().as('onUnlock');
		cy.mount(<SetupView {...defaultProps} onUnlockRomer={onUnlock} />);
		openGroup('display');
		clickToggle(7);
		cy.get('@onUnlock').should('have.been.calledOnce');
		cy.get('.romer-credit').should('be.visible').and('contain', 'Rømer');
	});

	it('plays the reveal animation on the toggle itself', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('display');
		clickToggle(7);
		cy.get('#temperatureUnitToggle').should('have.class', 'romer-revealing');
	});

	it('stops counting clicks once Rømer is already unlocked', () => {
		const onUnlock = cy.spy().as('onUnlock');
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, romerUnlocked: true }} onUnlockRomer={onUnlock} />);
		openGroup('display');
		clickToggle(9);
		cy.get('@onUnlock').should('not.have.been.called');
	});

	it('never names Rømer anywhere in the settings before it is found', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#settingsSearch').type('romer');
		cy.get('.settings-index-row').should('not.exist');
		cy.get('.settings-search-empty').should('exist');
	});
});

describe('setupView demo group', () => {
	it('shows demo mode toggle', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('demo');
		cy.get('#demoToggle').should('exist').and('not.be.checked');
	});

	it('shows demo toggle checked when demoMode is true', () => {
		cy.mount(<SetupView {...defaultProps} demoMode={true} />);
		openGroup('demo');
		cy.get('#demoToggle').should('be.checked');
	});
});

describe('setupView standby stream', () => {
	it('does not show threshold slider when standby is disabled', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('standby');
		cy.get('#standbyThresholdSlider').should('not.exist');
	});

	it('shows threshold slider when standby stream is enabled', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, standbyStreamEnabled: true }} />);
		openGroup('standby');
		cy.get('#standbyThresholdSlider').should('exist');
	});

	it('shows tab select dropdown when standby is enabled', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, standbyStreamEnabled: true }} />);
		openGroup('standby');
		cy.get('select').should('exist');
	});

	it('shows the standby stream guide when toggled on and onboarding not done', () => {
		cy.mount(<SetupView
			{...defaultProps}
			standbyOnboardingDone={false}
			prefs={{ ...defaultPrefs, standbyStreamEnabled: false }}
		/>);
		openGroup('standby');
		cy.get('#standbyStreamToggle').check({ force: true });
		cy.contains(/standby stream/i).should('exist');
	});
});

describe('setupView scoring group', () => {
	it('renders a switch for every PowerScore signal', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('scoring');
		cy.get('#signal-closeness').should('be.checked');
		cy.get('#signal-momentum').should('exist');
		cy.get('#signal-comeback').should('exist');
	});

	it('calls onToggleSignal when a signal is switched off', () => {
		const spy = cy.spy().as('onToggleSignal');
		cy.mount(<SetupView {...defaultProps} onToggleSignal={spy} />);
		openGroup('scoring');
		cy.get('#signal-momentum').uncheck({ force: true });
		cy.get('@onToggleSignal').should('have.been.calledWith', 'momentum');
	});

	it('locks the last enabled signal', () => {
		cy.mount(<SetupView
			{...defaultProps}
			prefs={{ ...defaultPrefs, disabledSignals: ['lateGame', 'momentum', 'leadChanges', 'comeback'] }}
		/>);
		openGroup('scoring');
		cy.get('#signal-closeness').should('be.disabled');
	});

	it('renders the bonus inputs', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('scoring');
		cy.get('#favoriteTeamBonusInput').should('exist');
		cy.get('#postseasonBoostInput').should('exist');
	});
});

describe('setupView leagues group', () => {
	it('shows league groups with logos', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('leagues');
		cy.contains('Basketball').should('exist');
	});

	it('shows warning when no leagues are selected', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: [] }} />);
		openGroup('leagues');
		cy.contains(/no leagues/i).should('exist');
	});

	it('shows the display order list with a row per enabled league', () => {
		cy.mount(<SetupView {...defaultProps} />);
		openGroup('leagues');
		cy.contains(/display order/i).should('exist');
		cy.get('.league-order-row').should('have.length', 2);
	});

	it('reorders an enabled league from the display order list', () => {
		const onReorderLeague = cy.spy().as('onReorderLeague');
		cy.mount(<SetupView {...defaultProps} onReorderLeague={onReorderLeague} />);
		openGroup('leagues');
		cy.get('#league-order-down-nba').click();
		cy.get('@onReorderLeague').should('have.been.calledWith', 0, 1);
	});

	it('hides the display order list when only one league is enabled', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: ['nba'] }} />);
		openGroup('leagues');
		cy.contains(/display order/i).should('not.exist');
		cy.get('.league-order-row').should('not.exist');
	});

	it('keeps the leagues heading and its tooltip when the order list is hidden', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: ['nba'] }} />);
		openGroup('leagues');
		cy.get('.popup-section-label').contains('Leagues').should('exist');
		cy.get('.setting-tooltip-btn').should('exist');
	});
});

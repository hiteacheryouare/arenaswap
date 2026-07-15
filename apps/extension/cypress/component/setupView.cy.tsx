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
	postseasonBoostPoints: 0,
	upcomingGamesDays: 7,
};

const defaultProps = {
	prefs: defaultPrefs,
	prefsLoaded: true,
	demoMode: false,
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
	onToggleShowUpcoming: () => {},
	onUpcomingGamesDaysChange: () => {},
	onToggleProTips: () => {},
	onToggleNotifications: () => {},
	onToggleDemo: () => {},
	onToggleStandbyStream: () => {},
	onStandbyThresholdChange: () => {},
	onSetStandbyTab: () => {},
	onStandbyOnboardingDone: () => {},
	onToggleBetting: () => {},
	onToggleTemperatureUnit: () => {},
	onPostseasonBoostChange: () => {},
};

describe('setupView tabs', () => {
	it('shows the Settings header with a back button', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.contains('Settings').should('exist');
	});

	it('renders Switching tab active by default', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.contains('button', 'Switching').should('have.class', 'active');
	});

	it('switches to Leagues tab when clicked', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.contains('button', 'Leagues').click();
		cy.contains('button', 'Leagues').should('have.class', 'active');
		cy.contains('button', 'Switching').should('not.have.class', 'active');
	});

	it('calls onClose when the header back button is clicked', () => {
		const spy = cy.spy().as('onClose');
		cy.mount(<SetupView {...defaultProps} onClose={spy} />);
		cy.get('button.setup-header').click();
		cy.get('@onClose').should('have.been.called');
	});
});

describe('setupView switching tab', () => {
	it('renders sensitivity slider', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#sensitivity-range').should('exist');
	});

	it('shows Options section header', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.contains('Options').should('exist');
	});

	it('shows show-upcoming toggle checked when pref is true', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#upcomingToggle').should('be.checked');
	});

	it('shows show-upcoming toggle unchecked when pref is false', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} />);
		cy.get('#upcomingToggle').should('not.be.checked');
	});

	it('shows days-ahead slider when showUpcomingGames is true', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#upcomingDaysSlider').should('exist');
	});

	it('hides days-ahead slider when showUpcomingGames is false', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} />);
		cy.get('#upcomingDaysSlider').should('not.exist');
	});

	it('reflects the current upcomingGamesDays value on the slider', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, upcomingGamesDays: 10 }} />);
		cy.get('#upcomingDaysSlider').should('have.value', '10');
	});

	it('calls onUpcomingGamesDaysChange when slider is moved', () => {
		const spy = cy.spy().as('onUpcomingGamesDaysChange');
		cy.mount(<SetupView {...defaultProps} onUpcomingGamesDaysChange={spy} />);
		cy.get('#upcomingDaysSlider').invoke('val', 3).trigger('change');
		cy.get('@onUpcomingGamesDaysChange').should('have.been.called');
	});

	it('shows demo mode toggle', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#demoToggle').should('exist').and('not.be.checked');
	});

	it('shows demo toggle checked when demoMode is true', () => {
		cy.mount(<SetupView {...defaultProps} demoMode={true} />);
		cy.get('#demoToggle').should('be.checked');
	});

	it('shows temperature unit toggle', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#temperatureUnitToggle').should('exist');
	});

	it('shows °F label when temperatureUnit is F', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#temperatureUnitToggle').should('contain', '°F');
	});

	it('shows °C label when temperatureUnit is C', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, temperatureUnit: 'C' }} />);
		cy.get('#temperatureUnitToggle').should('contain', '°C');
	});
});

describe('setupView standby stream', () => {
	it('does not show threshold slider when standby is disabled', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.get('#standbyThresholdSlider').should('not.exist');
	});

	it('shows threshold slider when standby stream is enabled', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, standbyStreamEnabled: true }} />);
		cy.get('#standbyThresholdSlider').should('exist');
	});

	it('shows tab select dropdown when standby is enabled', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, standbyStreamEnabled: true }} />);
		cy.get('select').should('exist');
	});

	it('shows the standby stream guide when toggled on and onboarding not done', () => {
		cy.mount(<SetupView
			{...defaultProps}
			standbyOnboardingDone={false}
			prefs={{ ...defaultPrefs, standbyStreamEnabled: false }}
		/>);
		cy.get('#standbyStreamToggle').check({ force: true });
		cy.contains(/standby stream/i).should('exist');
	});
});

describe('setupView leagues tab', () => {
	it('shows league groups with logos in Leagues tab', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.contains('button', 'Leagues').click();
		cy.contains('Basketball').should('exist');
	});

	it('shows warning when no leagues are selected', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: [] }} />);
		cy.contains('button', 'Leagues').click();
		cy.contains(/no leagues/i).should('exist');
	});

	it('shows warning badge on Leagues tab when no leagues selected', () => {
		cy.mount(<SetupView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: [] }} />);
		cy.contains('button', 'Leagues').find('.bi-exclamation-circle').should('exist');
	});

	it('does not show warning badge on Leagues tab when leagues are selected', () => {
		cy.mount(<SetupView {...defaultProps} />);
		cy.contains('button', 'Leagues').find('.bi-exclamation-circle').should('not.exist');
	});
});

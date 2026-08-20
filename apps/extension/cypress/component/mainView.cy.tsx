import MainView from '../../entrypoints/popup/components/mainView';
import type { UserPreferences } from '@arenaswap/core/types';

const defaultPrefs: UserPreferences = {
	enabled: true,
	enabledLeagues: ['nba'],
	sensitivity: 4,
	cooldownSeconds: 45,
	switchDelaySeconds: 0,
	showUpcomingGames: true,
	proTipsEnabled: true,
	notificationsEnabled: false,
	favoriteTeamBonusPoints: 0,
	favoriteTeamIds: [],
	standbyStreamEnabled: false,
	standbyStreamThreshold: 20,
	bettingEnabled: false,
	temperatureUnit: 'F',
	postseasonBoostPoints: 0,
	upcomingGamesDays: 14,
	disabledSignals: [],
};

const makeGame = (
	id: string,
	status: 'in' | 'pre' | 'post' = 'in',
	overrides: Partial<{ league: 'nba' | 'wnba'; startTime: string }> = {},
) => ({
	id,
	status,
	league: overrides.league ?? ('nba' as const),
	sportType: 'basketball' as const,
	startTime: overrides.startTime,
	period: 2,
	clockSeconds: 300,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
});

const defaultProps = {
	prefs: defaultPrefs,
	prefsLoaded: true,
	isLoading: false,
	hasError: false,
	games: [] as ReturnType<typeof makeGame>[],
	scores: [],
	leagueLogos: {},
	registry: [],
	favoriteTeamIds: new Set<string>(),
	gameBoosts: {},
	openTabs: [],
	onStandbyStream: false,
	onOpenGameDetail: () => {},
	onOpenSetup: () => {},
	onRefresh: () => {},
	showReviewPrompt: false,
	onToggleEnabled: () => {},
	onDismissReviewPrompt: () => {},
	onLeaveReview: () => {},
	onToggleFavoriteTeam: () => {},
	onRegistryChange: () => {},
	onStartWalkthrough: () => {},
	formatTabLabel: () => 'Tab',
};

describe('mainView review prompt', () => {
	it('shows review banner when review prompt is enabled', () => {
		cy.mount(<MainView {...defaultProps} showReviewPrompt={true} />);
		cy.get('[data-testid="review-prompt"]').should('exist');
	});
});

describe('mainView pro tips', () => {
	it('shows pro tips when enabled', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} />);
		cy.get('[data-testid="pro-tip"]').should('exist');
	});

	it('hides pro tips when disabled', () => {
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, proTipsEnabled: false }} games={[makeGame('g1')]} />);
		cy.get('[data-testid="pro-tip"]').should('not.exist');
	});
});

describe('mainView loading and error states', () => {
	it('shows loading spinner when isLoading is true', () => {
		cy.mount(<MainView {...defaultProps} isLoading={true} />);
		cy.get('[role="status"]').should('exist');
	});

	it('shows error banner when hasError is true', () => {
		cy.mount(<MainView {...defaultProps} hasError={true} />);
		cy.get('[role="alert"]').should('exist');
		cy.contains(/failed to load/i).should('exist');
	});

	it('does not show loading or error when both are false', () => {
		cy.mount(<MainView {...defaultProps} />);
		cy.get('[role="status"]').should('not.exist');
		cy.get('[role="alert"]').should('not.exist');
	});
});

describe('mainView empty states', () => {
	it('shows no-leagues CTA when no leagues are selected', () => {
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: [] }} />);
		cy.contains(/choose leagues to get started/i).should('exist');
	});

	it('shows no-games message when leagues are selected but no live games exist', () => {
		cy.mount(<MainView {...defaultProps} />);
		cy.contains(/no games right now/i).should('exist');
	});
});

describe('mainView game sections', () => {
	it('renders assigned live games when registry has matching games', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} registry={[{ gameId: 'g1', tabId: 1 }]} />);
		cy.get('[data-testid="game-card-g1"]').should('exist');
	});

	it('renders unassigned live games in a separate section', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g2')]} />);
		cy.get('[data-testid="game-card-g2"]').should('exist');
	});

	it('does not render upcoming games section when showUpcomingGames is false', () => {
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} games={[makeGame('upcoming-1', 'pre')]} />);
		cy.get('[data-testid="game-card-upcoming-1"]').should('not.exist');
	});

	it('sorts upcoming games by day before league priority', () => {
		const todayGame = makeGame('today-wnba', 'pre', { league: 'wnba', startTime: '2026-05-27T23:00:00.000Z' });
		const tomorrowGame = makeGame('tomorrow-nba', 'pre', { league: 'nba', startTime: '2026-05-28T20:30:00.000Z' });
		cy.mount(<MainView {...defaultProps} games={[tomorrowGame, todayGame]} />);
		cy.get('[data-testid^="game-card-"]').then($cards => {
			expect($cards[0]).to.have.attr('data-testid', 'game-card-today-wnba');
			expect($cards[1]).to.have.attr('data-testid', 'game-card-tomorrow-nba');
		});
	});

	it('orders live league sections by the default league order', () => {
		const nba = makeGame('live-nba');
		const wnba = makeGame('live-wnba', 'in', { league: 'wnba' });
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: ['nba', 'wnba'] }} games={[wnba, nba]} />);
		cy.get('[data-testid^="game-card-"]').then($cards => {
			expect($cards[0]).to.have.attr('data-testid', 'game-card-live-nba');
			expect($cards[1]).to.have.attr('data-testid', 'game-card-live-wnba');
		});
	});

	it('orders live league sections by the user custom league order', () => {
		const nba = makeGame('live-nba');
		const wnba = makeGame('live-wnba', 'in', { league: 'wnba' });
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: ['wnba', 'nba'] }} games={[nba, wnba]} />);
		cy.get('[data-testid^="game-card-"]').then($cards => {
			expect($cards[0]).to.have.attr('data-testid', 'game-card-live-wnba');
			expect($cards[1]).to.have.attr('data-testid', 'game-card-live-nba');
		});
	});
});

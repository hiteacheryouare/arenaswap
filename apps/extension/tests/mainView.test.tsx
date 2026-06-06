import { render, screen } from '@testing-library/react';
import MainView from '../entrypoints/popup/components/mainView';
import type { UserPreferences } from '@arenaswap/core/types';

jest.mock('../entrypoints/popup/components/gameCard', () => ({
	__esModule: true,
	default: ({ game }: { game: { id: string } }) => <div data-testid={`game-card-${game.id}`} />,
}));
jest.mock('../entrypoints/popup/components/popupFooter', () => ({
	__esModule: true,
	default: () => <div data-testid='popup-footer' />,
}));
jest.mock('../entrypoints/popup/components/proTip', () => ({
	__esModule: true,
	default: () => <div data-testid='pro-tip' />,
}));
jest.mock('../entrypoints/popup/popupHelpers', () => ({
	...jest.requireActual('../entrypoints/popup/popupHelpers'),
	getRandomNoGamesMessage: () => ({ title: 'No games right now', sub: 'Check back later.' }),
}));
jest.mock('../entrypoints/popup/components/reviewPromptBanner', () => ({
	__esModule: true,
	default: ({ onDismiss, onLeaveReview }: { onDismiss: () => void; onLeaveReview: () => void }) => (
		<div data-testid='review-prompt'>
			<button type='button' onClick={onLeaveReview}>Leave review</button>
			<button type='button' onClick={onDismiss}>Dismiss</button>
		</div>
	),
}));

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
	games: [],
	scores: [],
	leagueLogos: {},
	registry: [],
	favoriteTeamIds: new Set<string>(),
	gameBoosts: {},
	openTabs: [],
	onStandbyStream: false,
	onOpenGameDetail: jest.fn(),
	onOpenSetup: jest.fn(),
	onRefresh: jest.fn(),
	showReviewPrompt: false,
	onToggleEnabled: jest.fn(),
	onDismissReviewPrompt: jest.fn(),
	onLeaveReview: jest.fn(),
	onToggleFavoriteTeam: jest.fn(),
	onRegistryChange: jest.fn(),
	formatTabLabel: () => 'Tab',
};

describe('mainView review prompt', () => {
	test('shows review banner when review prompt is enabled', () => {
		render(<MainView {...defaultProps} showReviewPrompt={true} />);
		expect(screen.getByTestId('review-prompt')).toBeInTheDocument();
	});
});

describe('mainView pro tips', () => {
	test('shows pro tips when enabled', () => {
		render(<MainView {...defaultProps} games={[makeGame('g1')]} />);
		expect(screen.getByTestId('pro-tip')).toBeInTheDocument();
	});

	test('hides pro tips when disabled', () => {
		const prefs = { ...defaultPrefs, proTipsEnabled: false };
		render(<MainView {...defaultProps} prefs={prefs} games={[makeGame('g1')]} />);
		expect(screen.queryByTestId('pro-tip')).not.toBeInTheDocument();
	});
});

describe('mainView loading and error states', () => {
	test('shows loading spinner when isLoading is true', () => {
		render(<MainView {...defaultProps} isLoading={true} />);
		expect(screen.getByRole('status')).toBeInTheDocument();
	});

	test('shows error banner when hasError is true', () => {
		render(<MainView {...defaultProps} hasError={true} />);
		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
	});

	test('does not show loading or error when both are false', () => {
		render(<MainView {...defaultProps} />);
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});

describe('mainView empty states', () => {
	test('shows no-leagues CTA when no leagues are selected', () => {
		const prefs = { ...defaultPrefs, enabledLeagues: [] };
		render(<MainView {...defaultProps} prefs={prefs} />);
		expect(screen.getByText(/choose leagues to get started/i)).toBeInTheDocument();
	});

	test('shows no-games message when leagues are selected but no live games exist', () => {
		render(<MainView {...defaultProps} />);
		expect(screen.getByText(/no games right now/i)).toBeInTheDocument();
	});
});

describe('mainView game sections', () => {
	test('renders assigned live games when registry has matching games', () => {
		const game = makeGame('g1');
		const registry = [{ gameId: 'g1', tabId: 1 }];
		render(<MainView {...defaultProps} games={[game]} registry={registry} />);
		expect(screen.getByTestId('game-card-g1')).toBeInTheDocument();
	});

	test('renders unassigned live games in a separate section', () => {
		const game = makeGame('g2');
		render(<MainView {...defaultProps} games={[game]} />);
		expect(screen.getByTestId('game-card-g2')).toBeInTheDocument();
	});

	test('does not render upcoming games section when showUpcomingGames is false', () => {
		const prefs = { ...defaultPrefs, showUpcomingGames: false };
		const upcomingGame = makeGame('upcoming-1', 'pre');
		render(<MainView {...defaultProps} prefs={prefs} games={[upcomingGame]} />);
		expect(screen.queryByTestId('game-card-upcoming-1')).not.toBeInTheDocument();
	});

	test('sorts upcoming games by day before league priority', () => {
		const todayGame = makeGame('today-wnba', 'pre', { league: 'wnba', startTime: '2026-05-27T23:00:00.000Z' });
		const tomorrowGame = makeGame('tomorrow-nba', 'pre', { league: 'nba', startTime: '2026-05-28T20:30:00.000Z' });
		render(<MainView {...defaultProps} games={[tomorrowGame, todayGame]} />);
		const cards = screen.getAllByTestId(/game-card-/);
		expect(cards[0]).toHaveAttribute('data-testid', 'game-card-today-wnba');
		expect(cards[1]).toHaveAttribute('data-testid', 'game-card-tomorrow-nba');
	});
});

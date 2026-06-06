import { render, screen } from '@testing-library/react';
import LiveGameCard from '../entrypoints/popup/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

jest.mock('../entrypoints/popup/components/flipScore', () => ({
	__esModule: true,
	default: ({ value }: { value: number }) => <span>{value}</span>,
}));
jest.mock('../entrypoints/popup/components/baseDiamond', () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock('../entrypoints/popup/components/tabAssignSelect', () => ({
	__esModule: true,
	default: () => null,
}));

const baseGame: Game = {
	id: 'g1',
	status: 'in',
	league: 'nba',
	sportType: 'basketball',
	period: 2,
	clockSeconds: 300,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
};

const baseResult: PowerScoreResult = {
	gameId: 'g1',
	total: 42,
	closeness: 10,
	lateGame: 8,
	momentum: 6,
	leadChanges: 4,
	comeback: 0,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'Close game',
};

const defaultProps = {
	game: baseGame,
	excitementResult: baseResult,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: jest.fn(),
	gameBoosts: {},
	openTabs: [],
	registry: [],
	onRegistryChange: jest.fn(),
	formatTabLabel: () => 'Tab',
	onOpenGameDetail: jest.fn(),
};

describe('liveGameCard PowerScore bar', () => {
	test('renders PowerScore progress bar when excitementResult is provided', () => {
		render(<LiveGameCard {...defaultProps} />);
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
		expect(screen.getByText(/PowerScore/i)).toBeInTheDocument();
	});

	test('does not render PowerScore bar when excitementResult is undefined', () => {
		render(<LiveGameCard {...defaultProps} excitementResult={undefined} />);
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
	});

	test('progress bar has correct aria value', () => {
		render(<LiveGameCard {...defaultProps} />);
		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
	});

	test('displays total and max score', () => {
		render(<LiveGameCard {...defaultProps} />);
		expect(screen.getByText('42 / 100')).toBeInTheDocument();
	});
});

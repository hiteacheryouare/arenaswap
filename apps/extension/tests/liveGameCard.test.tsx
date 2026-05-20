import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('liveGameCard PowerScore breakdown', () => {
	test('renders PowerScore button when excitementResult is provided', () => {
		render(<LiveGameCard {...defaultProps} />);
		expect(screen.getByRole('button', { name: /toggle powerscore/i })).toBeInTheDocument();
	});

	test('breakdown panel is hidden by default', () => {
		render(<LiveGameCard {...defaultProps} />);
		expect(screen.queryByText(/score breakdown/i)).not.toBeInTheDocument();
	});

	test('clicking PowerScore button shows breakdown panel', async () => {
		render(<LiveGameCard {...defaultProps} />);
		await userEvent.click(screen.getByRole('button', { name: /toggle powerscore/i }));
		expect(screen.getByText(/score breakdown/i)).toBeInTheDocument();
	});

	test('clicking PowerScore button again hides breakdown panel', async () => {
		render(<LiveGameCard {...defaultProps} />);
		const btn = screen.getByRole('button', { name: /toggle powerscore/i });
		await userEvent.click(btn);
		await userEvent.click(btn);
		expect(screen.queryByText(/score breakdown/i)).not.toBeInTheDocument();
	});

	test('does not render PowerScore button when excitementResult is undefined', () => {
		render(<LiveGameCard {...defaultProps} excitementResult={undefined} />);
		expect(screen.queryByRole('button', { name: /toggle powerscore/i })).not.toBeInTheDocument();
	});
});

describe('liveGameCard stall penalty', () => {
	test('shows stall penalty note when stalled is true', async () => {
		const stalledResult: PowerScoreResult = { ...baseResult, stalled: true, total: 29, baseTotal: 42 };
		render(<LiveGameCard {...defaultProps} excitementResult={stalledResult} />);
		await userEvent.click(screen.getByRole('button', { name: /toggle powerscore/i }));
		expect(screen.getByText(/clock stall penalty/i)).toBeInTheDocument();
	});

	test('does not show stall note when not stalled', async () => {
		render(<LiveGameCard {...defaultProps} />);
		await userEvent.click(screen.getByRole('button', { name: /toggle powerscore/i }));
		expect(screen.queryByText(/% applied/i)).not.toBeInTheDocument();
	});
});

describe('liveGameCard boost indicator', () => {
	test('shows non-zero boost in breakdown when game has a boost', async () => {
		render(<LiveGameCard {...defaultProps} gameBoosts={{ g1: 15 }} />);
		await userEvent.click(screen.getByRole('button', { name: /toggle powerscore/i }));
		expect(screen.getByText('+15')).toBeInTheDocument();
	});
});

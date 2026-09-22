import { buildPowerScoreOption, buildTeamScoreOption, buildWinProbabilityOption } from '../entrypoints/popup/components/gameDetailChartOptions';
import type { Game, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';

const makeGame = (homeAbbr = 'HOM', awayAbbr = 'AWY', homeColor = '#FF0000', awayColor = '#0000FF'): Game => ({
	id: 'test-game',
	league: 'nba',
	sportType: 'basketball',
	homeTeam: { id: 'h', name: 'Home', abbreviation: homeAbbr, score: 50, color: homeColor },
	awayTeam: { id: 'a', name: 'Away', abbreviation: awayAbbr, score: 45, color: awayColor },
	period: 3,
	clockSeconds: 300,
	status: 'in',
});

describe('buildWinProbabilityOption', () => {
	test('returns an empty object when passed an empty array', () => {
		expect(buildWinProbabilityOption([], makeGame())).toEqual({});
	});

	test('returns exactly two series when given valid input', () => {
		const option = buildWinProbabilityOption([0.6, 0.55, 0.7], makeGame());
		expect(Array.isArray(option.series)).toBe(true);
		expect((option.series as unknown[]).length).toBe(2);
	});

	test('y-axis has min=0 and max=100', () => {
		const option = buildWinProbabilityOption([0.5], makeGame());
		const yAxis = option.yAxis as { min: number; max: number };
		expect(yAxis.min).toBe(0);
		expect(yAxis.max).toBe(100);
	});

	test('home series values equal round(p*100) and away values equal 100 minus home', () => {
		const probs = [0.3, 0.5, 0.7, 0.25, 0.9];
		const option = buildWinProbabilityOption(probs, makeGame());
		const series = option.series as Array<{ data: number[] }>;
		const homeSeries = series[0]!;
		const awaySeries = series[1]!;

		for (let i = 0; i < homeSeries.data.length; i++) {
			const home = homeSeries.data[i]!;
			const away = awaySeries.data[i]!;
			expect(home + away).toBe(100);
		}
	});

	test('home series rounds probabilities to integers', () => {
		const probs = [0.333, 0.667];
		const option = buildWinProbabilityOption(probs, makeGame());
		const homeSeries = (option.series as Array<{ data: number[] }>)[0]!;
		expect(homeSeries.data[0]).toBe(33);
		expect(homeSeries.data[1]).toBe(67);
	});

	test('series are named after the game team abbreviations', () => {
		const option = buildWinProbabilityOption([0.5], makeGame('BOS', 'LAL'));
		const series = option.series as Array<{ name: string }>;
		const names = series.map(s => s.name);
		expect(names).toContain('BOS');
		expect(names).toContain('LAL');
	});

	test('tooltip formatter includes team names and percent signs with colored bullets', () => {
		const option = buildWinProbabilityOption([0.6], makeGame('PHI', 'NYM'));
		const tooltip = option.tooltip as { formatter?: (params: unknown) => string };
		expect(typeof tooltip.formatter).toBe('function');

		const mockParams = [
			{ value: 60, seriesName: 'PHI', color: '#FF0000' },
			{ value: 40, seriesName: 'NYM', color: '#0000FF' },
		];
		const result = tooltip.formatter!(mockParams);
		expect(result).toContain('PHI');
		expect(result).toContain('NYM');
		expect(result).toContain('%');
		expect(result).toContain('●');
	});

	// A 320px chart cannot resolve more than a couple of hundred points, and a five-hour baseball
	// game arrives with thousands. The sampling has to hold the drawn count down however long the
	// game runs, and it has to keep the last value: the end of the line is the number on screen.
	test.each([200, 2_000, 20_000])('draws a readable line from a %i-point win probability history', length => {
		const line = Array.from({ length }, (_, i) => i / length);
		const option = buildWinProbabilityOption(line, makeGame());
		const [home, away] = option.series as Array<{ data: number[] }>;

		expect(home!.data.length).toBeLessThanOrEqual(161);
		expect(home!.data.length).toBeGreaterThanOrEqual(Math.min(80, length));
		expect(away!.data).toHaveLength(home!.data.length);

		// Tip-off and the current moment both survive the thinning.
		expect(home!.data[0]).toBe(0);
		expect(home!.data.at(-1)).toBe(Math.round((length - 1) / length * 100));
	});

	test('single-point input returns a valid two-series option without crashing', () => {
		const option = buildWinProbabilityOption([0.75], makeGame());
		const series = option.series as Array<{ data: number[] }>;
		expect(series).toHaveLength(2);
		expect(series[0]!.data).toHaveLength(1);
		expect(series[1]!.data).toHaveLength(1);
		expect(series[0]!.data[0]! + series[1]!.data[0]!).toBe(100);
	});
});

describe('buildTeamScoreOption', () => {
	const history: ScoreSnapshot[] = [62, 74, 85, 96].map((homeScore, index) => ({
		gameId: 'test-game',
		timestamp: 1_767_225_600_000 + index * 60_000,
		homeScore,
		awayScore: homeScore + 15 - index * 5,
	}));

	test('the y-axis scales to the data rather than anchoring at zero', () => {
		const yAxis = buildTeamScoreOption(history, makeGame()).yAxis as { scale?: boolean };
		expect(yAxis.scale).toBe(true);
	});

	test('the PowerScore axis does not scale, because its series carries an area fill', () => {
		const snapshot = {
			gameId: 'test-game',
			timestamp: 1_767_225_600_000,
			total: 62,
			closeness: 30,
			lateGame: 10,
			momentum: 12,
			leadChanges: 6,
			comeback: 4,
			signalsSubtotal: 62,
			favoriteBonus: 0,
			favoriteTeamCount: 0,
			stalled: false,
		} as PowerScoreSnapshot;
		const yAxis = buildPowerScoreOption([snapshot]).yAxis as { scale?: boolean };
		expect(yAxis.scale).toBeUndefined();
	});
});

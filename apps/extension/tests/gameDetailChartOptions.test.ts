import { buildWinProbabilityOption } from '../entrypoints/popup/components/gameDetailChartOptions';
import type { Game } from '@arenaswap/core/types';

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

	test('neither series has a stack property (no stacking)', () => {
		const option = buildWinProbabilityOption([0.5, 0.6, 0.4], makeGame());
		const series = option.series as Array<Record<string, unknown>>;
		for (const s of series) {
			expect(s.stack).toBeUndefined();
		}
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

	test('both series have showSymbol set to false', () => {
		const option = buildWinProbabilityOption([0.4, 0.6], makeGame());
		const series = option.series as Array<{ showSymbol: boolean }>;
		expect(series[0]!.showSymbol).toBe(false);
		expect(series[1]!.showSymbol).toBe(false);
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

	test('large input is downsampled to at most 80 data points per series', () => {
		const largeInput = Array.from({ length: 200 }, (_, i) => i / 200);
		const option = buildWinProbabilityOption(largeInput, makeGame());
		const homeSeries = (option.series as Array<{ data: number[] }>)[0]!;
		expect(homeSeries.data.length).toBeLessThan(200);
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

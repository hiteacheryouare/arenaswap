import type { EChartsOption } from 'echarts';
import { scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
} from '../src/components/gameDetailChartOptions';

// The four charts on the game detail screen. None of them can fail loudly: a chart handed the wrong
// field, the wrong team's colour or a label list one short of its data still draws, and what it
// draws is a confident picture of something that did not happen.

interface seriesLike {
	type?: string;
	name?: string;
	stack?: string;
	data?: number[];
	showSymbol?: boolean;
	symbolSize?: number;
	lineStyle?: { color?: string; width?: number };
	itemStyle?: { color?: string };
}

const seriesOf = (option: EChartsOption): seriesLike[] => (option.series ?? []) as seriesLike[];
const labelsOf = (option: EChartsOption): string[] => (
	(option.xAxis as { data?: string[] } | undefined)?.data ?? []
);
const yAxisOf = (option: EChartsOption) => option.yAxis as { max?: number; min?: number; scale?: boolean } | undefined;
const byName = (option: EChartsOption, name: string): seriesLike => (
	seriesOf(option).find(entry => entry.name === name)!
);

// Cleveland at home against Boston: two dark primaries the clubs actually publish, which is the
// pair the lightening in `colorUtils` exists for.
const game: Game = {
	id: '401766123',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period: 4,
	clockSeconds: 138,
	homeTeam: { id: '5', name: 'Cleveland Cavaliers', abbreviation: 'CLE', score: 112, color: '#860038', alternateColor: '#FDBB30' },
	awayTeam: { id: '2', name: 'Boston Celtics', abbreviation: 'BOS', score: 110, color: '#007A33', alternateColor: '#BA9653' },
};

const minute = 60_000;
const firstPoll = Date.UTC(2025, 4, 13, 23, 12, 0);

const powerPoint = (index: number, overrides: Partial<PowerScoreSnapshot> = {}): PowerScoreSnapshot => ({
	gameId: game.id,
	timestamp: firstPoll + index * minute,
	total: 60 + index,
	closeness: 20,
	lateGame: 15,
	momentum: 10,
	leadChanges: 8,
	comeback: 5,
	signalsSubtotal: 58,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'close late game',
	...overrides,
});

const scorePoint = (index: number, awayScore: number, homeScore: number): ScoreSnapshot => ({
	gameId: game.id,
	timestamp: firstPoll + index * minute,
	awayScore,
	homeScore,
});

// The chart surface is #0d1117. A line on it is non-text, so WCAG wants 3:1.
const srgbChannel = (value: number): number => {
	const scaled = value / 255;
	return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

const contrastOnChart = (hex: string): number => {
	const [red, green, blue] = [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16));
	const luminance = 0.2126 * srgbChannel(red!) + 0.7152 * srgbChannel(green!) + 0.0722 * srgbChannel(blue!);
	return (luminance + 0.05) / (0.0055 + 0.05);
};

describe('buildPowerScoreOption', () => {
	const history = [0, 1, 2, 3, 4].map(index => powerPoint(index));

	test('plots the running total, one label per reading', () => {
		const option = buildPowerScoreOption(history);
		expect(seriesOf(option)[0]!.data).toEqual([60, 61, 62, 63, 64]);
		expect(labelsOf(option)).toHaveLength(history.length);
	});

	// A single-point line has no segment to stroke, so with symbols off it renders an empty chart —
	// which reads as "we have no data for this game" rather than "this game just started".
	test('marks a lone reading with a symbol, since a one-point line draws nothing', () => {
		const lone = seriesOf(buildPowerScoreOption([powerPoint(0)]))[0]!;
		expect(lone.showSymbol).toBe(true);
		expect(lone.symbolSize).toBeGreaterThanOrEqual(4);
	});

	test('drops the symbols once there is a line to see', () => {
		const line = seriesOf(buildPowerScoreOption(history))[0]!;
		expect(line.showSymbol).toBe(false);
		expect(line.symbolSize).toBe(0);
	});

	// The axis has to leave the ceiling visible, or a game pinned at the top looks like a game that
	// has run out of chart.
	test('keeps headroom above the scoring ceiling', () => {
		expect(yAxisOf(buildPowerScoreOption(history))!.max).toBeGreaterThan(scoreMaxTotal);
	});

	// A manual game boost pushes a total past the ceiling, and a fixed max would clip the line flat.
	test('grows the axis to hold a total boosted past the ceiling', () => {
		const boosted = [...history, powerPoint(5, { total: scoreMaxTotal + 40 })];
		expect(yAxisOf(buildPowerScoreOption(boosted))!.max).toBe(scoreMaxTotal + 40);
	});

	// It carries an area fill, so a floating baseline would fill from mid-air.
	test('keeps its baseline pinned, because the area fill hangs off it', () => {
		expect(yAxisOf(buildPowerScoreOption(history))!.scale).toBeUndefined();
	});

	test('draws an empty chart rather than throwing on a game with no readings yet', () => {
		const option = buildPowerScoreOption([]);
		expect(seriesOf(option)[0]!.data).toEqual([]);
		expect(yAxisOf(option)!.max).toBe(scoreMaxTotal + 15);
	});
});

describe('buildTeamScoreOption', () => {
	const history = [
		scorePoint(0, 98, 96),
		scorePoint(1, 104, 103),
		scorePoint(2, 108, 109),
		scorePoint(3, 110, 112),
	];

	// The one thing this chart exists to say is which team is ahead. A swap between the two series
	// says the opposite, in the right colours, with no error anywhere.
	test('names each line after the team whose score it carries', () => {
		const option = buildTeamScoreOption(history, game);
		expect(byName(option, 'BOS').data).toEqual([98, 104, 108, 110]);
		expect(byName(option, 'CLE').data).toEqual([96, 103, 109, 112]);
	});

	test('labels one point per reading', () => {
		const option = buildTeamScoreOption(history, game);
		expect(labelsOf(option)).toHaveLength(history.length);
		for (const line of seriesOf(option)) expect(line.data).toHaveLength(history.length);
	});

	// A rolling window opens in the sixties, and a zero baseline spends the chart on scores nobody
	// is looking at — which flattens the gap between the two teams into a single thick line.
	test('lets the axis follow the window rather than starting at zero', () => {
		expect(yAxisOf(buildTeamScoreOption(history, game))!.scale).toBe(true);
	});

	test('tells the two teams apart, and reads both against the dark chart', () => {
		const option = buildTeamScoreOption(history, game);
		const away = byName(option, 'BOS').lineStyle!.color!;
		const home = byName(option, 'CLE').lineStyle!.color!;
		expect(away).not.toBe(home);
		expect(contrastOnChart(away)).toBeGreaterThanOrEqual(3);
		expect(contrastOnChart(home)).toBeGreaterThanOrEqual(3);
	});

	// The dot and the line have to be the same colour or a one-point chart draws a mark in the
	// wrong team's colour.
	test('draws each line and its symbols in one colour', () => {
		for (const line of seriesOf(buildTeamScoreOption(history, game))) {
			expect(line.itemStyle!.color).toBe(line.lineStyle!.color);
		}
	});

	test('marks a lone reading on both lines', () => {
		for (const line of seriesOf(buildTeamScoreOption([scorePoint(0, 2, 0)], game))) {
			expect(line.showSymbol).toBe(true);
			expect(line.symbolSize).toBeGreaterThanOrEqual(4);
		}
	});

	// Two clubs who publish the same dark navy. Drawing both lines in it makes the chart useless
	// rather than merely ugly.
	test('separates two teams whose published colours are all but identical', () => {
		const navyDerby: Game = {
			...game,
			awayTeam: { ...game.awayTeam, abbreviation: 'NYY', color: '#0C2340', alternateColor: '#FFFFFF' },
			homeTeam: { ...game.homeTeam, abbreviation: 'DET', color: '#0C2340', alternateColor: '#FA4616' },
		};
		const option = buildTeamScoreOption(history, navyDerby);
		expect(byName(option, 'NYY').lineStyle!.color).not.toBe(byName(option, 'DET').lineStyle!.color);
	});
});

// A home team pulling slowly clear, which is the shape most win-probability lines take.
const drift = (count: number): number[] => (
	Array.from({ length: count }, (_, index) => 0.5 + (index / count) * 0.4)
);

describe('buildWinProbabilityOption', () => {
	test('reads the axis as whole percentage points from 0 to 100', () => {
		const axis = (buildWinProbabilityOption(drift(20), game) as { yAxis?: { min?: number; max?: number } }).yAxis!;
		expect(axis.min).toBe(0);
		expect(axis.max).toBe(100);
	});

	// The chart is two complementary lines. If they ever fail to add up, one of them is lying.
	test('the two lines always add up to a whole game', () => {
		const option = buildWinProbabilityOption(drift(200), game);
		const home = byName(option, 'CLE').data!;
		const away = byName(option, 'BOS').data!;
		expect(home).toHaveLength(away.length);
		for (let index = 0; index < home.length; index++) {
			expect(home[index]! + away[index]!).toBe(100);
		}
	});

	// Thinning is what keeps a four-hour baseball game affordable to draw, and dropping the final
	// reading would show the game still in the balance at the final whistle.
	test('keeps the opening and the final reading when it thins a long game out', () => {
		const long = drift(1_000);
		const home = byName(buildWinProbabilityOption(long, game), 'CLE').data!;
		expect(home[0]).toBe(Math.round(long[0]! * 100));
		expect(home.at(-1)).toBe(Math.round(long.at(-1)! * 100));
	});

	test('thins a long game down to something a popup can draw', () => {
		expect(byName(buildWinProbabilityOption(drift(5_000), game), 'CLE').data!.length).toBeLessThanOrEqual(82);
	});

	test('leaves a short game at full resolution', () => {
		expect(byName(buildWinProbabilityOption(drift(40), game), 'CLE').data).toHaveLength(40);
	});

	test('labels one point per reading', () => {
		const option = buildWinProbabilityOption(drift(300), game);
		expect(labelsOf(option)).toHaveLength(byName(option, 'CLE').data!.length);
	});

	// ESPN publishes no win probability for most leagues, and for none of them before the first
	// snap. An axis of NaN is worse than no chart.
	test('draws nothing at all when there is no probability to draw', () => {
		expect(buildWinProbabilityOption([], game)).toEqual({});
	});

	// Same trap the score and PowerScore charts already dodge: one poll into a game there is a
	// single reading per team, and a lone point with symbols off strokes no segment and draws an
	// empty panel. Both series, because the away line is derived and regressed independently.
	test('marks a lone reading on both lines, since a one-point line draws nothing', () => {
		const option = buildWinProbabilityOption([0.62], game);
		for (const name of ['CLE', 'BOS']) {
			expect(byName(option, name).showSymbol).toBe(true);
			// Not `> 0`: a 1px dot satisfies that and is invisible, which is the failure itself.
			expect(byName(option, name).symbolSize).toBeGreaterThanOrEqual(4);
		}
	});

	test('drops the win-probability symbols once there is a line to see', () => {
		const option = buildWinProbabilityOption([0.62, 0.58], game);
		for (const name of ['CLE', 'BOS']) expect(byName(option, name).showSymbol).toBe(false);
	});

	test('holds a runaway at the rails rather than past them', () => {
		const option = buildWinProbabilityOption([0, 0.5, 1], game);
		expect(byName(option, 'CLE').data).toEqual([0, 50, 100]);
		expect(byName(option, 'BOS').data).toEqual([100, 50, 0]);
	});

	// The axis and the tooltip are the only places the numbers appear as words. An axis of bare
	// integers reads as a score, not a probability.
	test('writes the axis as whole percentages', () => {
		const axis = (buildWinProbabilityOption(drift(20), game) as { yAxis?: { axisLabel?: { formatter?: (v: number) => string } } }).yAxis!;
		expect(axis.axisLabel!.formatter!(0)).toBe('0%');
		expect(axis.axisLabel!.formatter!(75)).toBe('75%');
	});

	test('names both teams in the tooltip, each beside its own line colour', () => {
		const option = buildWinProbabilityOption(drift(20), game);
		const tooltip = (option as { tooltip?: { formatter?: (params: unknown) => string } }).tooltip!;
		const rendered = tooltip.formatter!([
			{ value: 62, seriesName: 'CLE', color: '#ab0047' },
			{ value: 38, seriesName: 'BOS', color: '#00a544' },
		]);
		expect(rendered).toContain('CLE: 62%');
		expect(rendered).toContain('BOS: 38%');
		expect(rendered).toContain('color:#ab0047');
		expect(rendered).toContain('color:#00a544');
	});

	test('tells the two teams apart, and reads both against the dark chart', () => {
		const option = buildWinProbabilityOption(drift(20), game);
		const home = byName(option, 'CLE').lineStyle!.color!;
		const away = byName(option, 'BOS').lineStyle!.color!;
		expect(home).not.toBe(away);
		expect(contrastOnChart(home)).toBeGreaterThanOrEqual(3);
		expect(contrastOnChart(away)).toBeGreaterThanOrEqual(3);
	});

	// Both charts read the same pair off `resolveTeamColorPair`, so a team is the same colour
	// wherever it appears on the detail screen.
	test('gives a team the same colour it has on the score chart', () => {
		const scoreOption = buildTeamScoreOption([scorePoint(0, 1, 2)], game);
		const probOption = buildWinProbabilityOption(drift(20), game);
		expect(byName(probOption, 'CLE').lineStyle!.color).toBe(byName(scoreOption, 'CLE').lineStyle!.color);
		expect(byName(probOption, 'BOS').lineStyle!.color).toBe(byName(scoreOption, 'BOS').lineStyle!.color);
	});
});

describe('buildComponentContributionOption', () => {
	// One distinct value per signal, so a bar reading the wrong field cannot pass.
	const history = [powerPoint(0, {
		closeness: 21,
		lateGame: 17,
		momentum: 13,
		leadChanges: 9,
		comeback: 4,
	})];

	test('puts each signal under its own name, reading its own field', () => {
		const option = buildComponentContributionOption(history);
		expect(byName(option, 'Closeness').data).toEqual([21]);
		expect(byName(option, 'Late-game').data).toEqual([17]);
		expect(byName(option, 'Momentum').data).toEqual([13]);
		expect(byName(option, 'Lead changes').data).toEqual([9]);
		expect(byName(option, 'Comeback').data).toEqual([4]);
	});

	// Five bars sharing one stack is what makes the column height the signals subtotal. Drop one
	// off the stack and it draws as a separate column alongside.
	test('stacks all five into one column', () => {
		const bars = seriesOf(buildComponentContributionOption(history));
		expect(bars).toHaveLength(5);
		expect(new Set(bars.map(bar => bar.stack))).toEqual(new Set(['signals']));
		expect(new Set(bars.map(bar => bar.type))).toEqual(new Set(['bar']));
	});

	test('labels one column per reading', () => {
		const option = buildComponentContributionOption([powerPoint(0), powerPoint(1), powerPoint(2)]);
		expect(labelsOf(option)).toHaveLength(3);
		for (const bar of seriesOf(option)) expect(bar.data).toHaveLength(3);
	});

	test('gives every signal its own colour, so the stack can be read', () => {
		const colors = seriesOf(buildComponentContributionOption(history)).map(bar => bar.itemStyle!.color);
		expect(new Set(colors).size).toBe(colors.length);
	});

	test('draws an empty stack rather than throwing on a game with no readings yet', () => {
		for (const bar of seriesOf(buildComponentContributionOption([]))) expect(bar.data).toEqual([]);
	});
});

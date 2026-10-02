import type { EChartsOption } from 'echarts';
import { scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, PowerScoreSnapshot, ResolvedTheme, ScoreSnapshot } from '@arenaswap/core/types';
import { resolveTeamColorPair } from './colorUtils';
import { chartEasing, motionDuration } from '../motion';

// ECharts draws to a canvas, so these cannot follow the page's CSS variables: whoever builds an
// option passes the palette for the surface the chart will sit on. Dark is the default because the
// website's charts only ever sit on dark.
export interface chartPalette {
	axisLabel: string;
	axisLine: string;
	splitLine: string;
	text: string;
	tooltipBackground: string;
	surface: ResolvedTheme;
}

export const darkChartPalette: chartPalette = {
	axisLabel: '#8b949e',
	axisLine: 'rgba(71, 85, 105, 0.95)',
	splitLine: 'rgba(71, 85, 105, 0.34)',
	text: '#e6edf3',
	tooltipBackground: '#111827',
	surface: 'dark',
};

export const lightChartPalette: chartPalette = {
	axisLabel: '#3d4652',
	axisLine: 'rgba(71, 85, 105, 0.55)',
	splitLine: 'rgba(71, 85, 105, 0.16)',
	text: '#0b1016',
	tooltipBackground: '#ffffff',
	surface: 'light',
};

const formatTimeLabel = (timestamp: number): string => (
	new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
);

const baseOption = (
	labels: string[],
	palette: chartPalette,
	gridTop = 24,
): EChartsOption => ({
	animationDuration: motionDuration.slow,
	animationEasing: chartEasing,
	tooltip: {
		trigger: 'axis',
		backgroundColor: palette.tooltipBackground,
		borderColor: palette.axisLine,
		textStyle: { color: palette.text, fontSize: 11 },
	},
	grid: {
		left: 34,
		right: 12,
		top: gridTop,
		bottom: 26,
		containLabel: true,
	},
	xAxis: {
		type: 'category',
		data: labels,
		axisLabel: { color: palette.axisLabel, fontSize: 10 },
		axisLine: { lineStyle: { color: palette.axisLine } },
	},
	yAxis: {
		type: 'value',
		axisLabel: { color: palette.axisLabel, fontSize: 10 },
		axisLine: { lineStyle: { color: palette.axisLine } },
		splitLine: { lineStyle: { color: palette.splitLine } },
	},
});

export const buildPowerScoreOption = (powerHistory: PowerScoreSnapshot[], palette = darkChartPalette): EChartsOption => {
	const labels = powerHistory.map(point => formatTimeLabel(point.timestamp));
	const totals = powerHistory.map(point => point.total);
	const showSinglePointSymbols = totals.length === 1;
	const option = baseOption(labels, palette);
	return {
		...option,
		yAxis: {
			...(option.yAxis as EChartsOption['yAxis']),
			max: Math.max(scoreMaxTotal + 15, ...totals),
		},
		series: [
			{
				type: 'line',
				smooth: true,
				showSymbol: showSinglePointSymbols,
				symbolSize: showSinglePointSymbols ? 7 : 0,
				lineStyle: { width: 2.5, color: '#f75c03' },
				areaStyle: { color: 'rgba(247, 92, 3, 0.2)' },
				data: totals,
				name: 'PowerScore',
			},
		],
	};
};

// The line colours are a parameter so a caller that already holds them can pass the same pair its
// legend is drawn in, and memoise on them.
const chartTeamColors = (game: Game): [string, string] => (
	resolveTeamColorPair(game.awayTeam, game.homeTeam, '#60a5fa', '#f87171')
);

export const buildTeamScoreOption = (
	scoreHistory: ScoreSnapshot[],
	game: Game,
	palette = darkChartPalette,
	[awayColor, homeColor] = chartTeamColors(game),
): EChartsOption => {
	const labels = scoreHistory.map(point => formatTimeLabel(point.timestamp));
	const awayScores = scoreHistory.map(point => point.awayScore);
	const homeScores = scoreHistory.map(point => point.homeScore);
	const showSinglePointSymbols = scoreHistory.length === 1;
	const option = baseOption(labels, palette, 24);
	return {
		...option,
		// The history is a rolling window, so a basketball chart's first point is already in the
		// sixties and a zero baseline spends most of 176px on scores nobody is looking at — which
		// flattens the gap between the two teams, the one thing the chart exists to show. Safe here
		// and not on the PowerScore chart above, because these lines carry no area fill.
		yAxis: { ...(option.yAxis as EChartsOption['yAxis']), scale: true },
		series: [
			{
				type: 'line',
				name: game.awayTeam.abbreviation,
				data: awayScores,
				showSymbol: showSinglePointSymbols,
				symbolSize: showSinglePointSymbols ? 7 : 0,
				lineStyle: { width: 2.4, color: awayColor },
				itemStyle: { color: awayColor },
			},
			{
				type: 'line',
				name: game.homeTeam.abbreviation,
				data: homeScores,
				showSymbol: showSinglePointSymbols,
				symbolSize: showSinglePointSymbols ? 7 : 0,
				lineStyle: { width: 2.4, color: homeColor },
				itemStyle: { color: homeColor },
			},
		],
	};
};

export const buildWinProbabilityOption = (
	homeWinPcts: number[],
	game: Game,
	palette = darkChartPalette,
	[awayColor, homeColor] = chartTeamColors(game),
): EChartsOption => {
	if (homeWinPcts.length === 0) return {};
	const step = Math.max(1, Math.floor(homeWinPcts.length / 80));
	const sampled = homeWinPcts.filter((_, i) => i % step === 0 || i === homeWinPcts.length - 1);
	const homeVals = sampled.map(p => Math.round(p * 100));
	// A line one poll old is a single point, and a point with no symbol draws nothing at all.
	// The score and PowerScore builders above already make this exception.
	const showSinglePointSymbols = sampled.length === 1;
	const awayVals = sampled.map(p => 100 - Math.round(p * 100));
	const labels = sampled.map(() => '');
	return {
		...baseOption(labels, palette, 24),
		yAxis: {
			type: 'value',
			min: 0,
			max: 100,
			interval: 25,
			axisLabel: { color: palette.axisLabel, fontSize: 10, formatter: (v: number) => `${v}%` },
			axisLine: { lineStyle: { color: palette.axisLine } },
			splitLine: { lineStyle: { color: palette.splitLine } },
		},
		tooltip: {
			trigger: 'axis',
			backgroundColor: palette.tooltipBackground,
			borderColor: palette.axisLine,
			textStyle: { color: palette.text, fontSize: 11 },
			formatter: (params: unknown) => {
				const arr = params as Array<{ value: number; seriesName: string; color: string }>;
				return arr.map(p => `<span style="color:${p.color}">●</span> ${p.seriesName}: ${p.value}%`).join('<br/>');
			},
		},
		series: [
			{
				type: 'line',
				name: game.homeTeam.abbreviation,
				data: homeVals,
				smooth: true,
				showSymbol: showSinglePointSymbols,
				symbolSize: showSinglePointSymbols ? 7 : 0,
				lineStyle: { width: 2, color: homeColor },
				itemStyle: { color: homeColor },
			},
			{
				type: 'line',
				name: game.awayTeam.abbreviation,
				data: awayVals,
				smooth: true,
				showSymbol: showSinglePointSymbols,
				symbolSize: showSinglePointSymbols ? 7 : 0,
				lineStyle: { width: 2, color: awayColor },
				itemStyle: { color: awayColor },
			},
		],
	};
};

export const buildComponentContributionOption = (powerHistory: PowerScoreSnapshot[], palette = darkChartPalette): EChartsOption => {
	const labels = powerHistory.map(point => formatTimeLabel(point.timestamp));
	const closeness = powerHistory.map(point => point.closeness);
	const lateGame = powerHistory.map(point => point.lateGame);
	const momentum = powerHistory.map(point => point.momentum);
	const leadChanges = powerHistory.map(point => point.leadChanges);
	const comeback = powerHistory.map(point => point.comeback);
	return {
		...baseOption(labels, palette, 24),
		series: [
			{ type: 'bar', stack: 'signals', name: 'Closeness', data: closeness, itemStyle: { color: '#22c55e' } },
			{ type: 'bar', stack: 'signals', name: 'Late-game', data: lateGame, itemStyle: { color: '#f75c03' } },
			{ type: 'bar', stack: 'signals', name: 'Momentum', data: momentum, itemStyle: { color: '#2274a5' } },
			{ type: 'bar', stack: 'signals', name: 'Lead changes', data: leadChanges, itemStyle: { color: '#f1c40f' } },
			{ type: 'bar', stack: 'signals', name: 'Comeback', data: comeback, itemStyle: { color: '#d90368' } },
		],
	};
};

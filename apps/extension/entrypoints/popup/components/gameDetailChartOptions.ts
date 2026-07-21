import type { EChartsOption } from 'echarts';
import { scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';

const axisLabelColor = '#8b949e';
const axisLineColor = 'rgba(71, 85, 105, 0.95)';
const splitLineColor = 'rgba(71, 85, 105, 0.34)';
const textColor = '#e6edf3';
const tooltipBackgroundColor = '#111827';

const formatTimeLabel = (timestamp: number): string => (
	new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
);

const baseOption = (
	labels: string[],
	gridTop = 24,
): EChartsOption => ({
	animationDuration: 500,
	tooltip: {
		trigger: 'axis',
		backgroundColor: tooltipBackgroundColor,
		borderColor: axisLineColor,
		textStyle: { color: textColor, fontSize: 11 },
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
		axisLabel: { color: axisLabelColor, fontSize: 10 },
		axisLine: { lineStyle: { color: axisLineColor } },
	},
	yAxis: {
		type: 'value',
		axisLabel: { color: axisLabelColor, fontSize: 10 },
		axisLine: { lineStyle: { color: axisLineColor } },
		splitLine: { lineStyle: { color: splitLineColor } },
	},
});

export const buildPowerScoreOption = (powerHistory: PowerScoreSnapshot[]): EChartsOption => {
	const labels = powerHistory.map(point => formatTimeLabel(point.timestamp));
	const totals = powerHistory.map(point => point.total);
	const showSinglePointSymbols = totals.length === 1;
	const option = baseOption(labels);
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

export const buildTeamScoreOption = (scoreHistory: ScoreSnapshot[], game: Game): EChartsOption => {
	const labels = scoreHistory.map(point => formatTimeLabel(point.timestamp));
	const awayScores = scoreHistory.map(point => point.awayScore);
	const homeScores = scoreHistory.map(point => point.homeScore);
	const showSinglePointSymbols = scoreHistory.length === 1;
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#60a5fa', '#f87171', true);
	return {
		...baseOption(labels, 24),
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

export const buildScoreMarginOption = (scoreHistory: ScoreSnapshot[], game: Game): EChartsOption => {
	const labels = scoreHistory.map(point => formatTimeLabel(point.timestamp));
	const margins = scoreHistory.map(point => point.awayScore - point.homeScore);
	const awayMargins = margins.map(m => Math.max(0, m));
	const homeMargins = margins.map(m => Math.min(0, m));
	const showSinglePointSymbols = scoreHistory.length === 1;
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#60a5fa', '#f87171', true);
	const maxAbsMargin = Math.max(1, ...margins.map(m => Math.abs(m)));
	const option = baseOption(labels, 24);
	return {
		...option,
		yAxis: {
			...(option.yAxis as EChartsOption['yAxis']),
			min: -(maxAbsMargin + 2),
			max: maxAbsMargin + 2,
		},
		tooltip: {
			trigger: 'axis',
			backgroundColor: tooltipBackgroundColor,
			borderColor: axisLineColor,
			textStyle: { color: textColor, fontSize: 11 },
			formatter: (params: unknown) => {
				const arr = params as Array<{ axisValue: string; value: number }>;
				const time = arr[0]?.axisValue ?? '';
				const val = (arr[0]?.value ?? 0) + (arr[1]?.value ?? 0);
				if (val === 0) return `${time}<br/>Tied`;
				const leader = val > 0 ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
				return `${time}<br/>${leader} +${Math.abs(val)}`;
			},
		},
		series: [
			{
				type: 'line',
				name: game.awayTeam.abbreviation,
				data: awayMargins,
				smooth: false,
				showSymbol: showSinglePointSymbols,
				symbolSize: showSinglePointSymbols ? 7 : 0,
				lineStyle: { width: 2.5, color: awayColor },
				areaStyle: { color: awayColor, opacity: 0.2 },
				itemStyle: { color: awayColor },
			},
			{
				type: 'line',
				name: game.homeTeam.abbreviation,
				data: homeMargins,
				smooth: false,
				showSymbol: showSinglePointSymbols,
				symbolSize: showSinglePointSymbols ? 7 : 0,
				lineStyle: { width: 2.5, color: homeColor },
				areaStyle: { color: homeColor, opacity: 0.2 },
				itemStyle: { color: homeColor },
			},
		],
	};
};

export const buildWinProbabilityOption = (homeWinPcts: number[], game: Game): EChartsOption => {
	if (homeWinPcts.length === 0) return {};
	const step = Math.max(1, Math.floor(homeWinPcts.length / 80));
	const sampled = homeWinPcts.filter((_, i) => i % step === 0 || i === homeWinPcts.length - 1);
	const homeVals = sampled.map(p => Math.round(p * 100));
	const awayVals = sampled.map(p => 100 - Math.round(p * 100));
	const labels = sampled.map(() => '');
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#60a5fa', '#f87171', true);
	return {
		...baseOption(labels, 24),
		yAxis: {
			type: 'value',
			min: 0,
			max: 100,
			interval: 25,
			axisLabel: { color: axisLabelColor, fontSize: 10, formatter: (v: number) => `${v}%` },
			axisLine: { lineStyle: { color: axisLineColor } },
			splitLine: { lineStyle: { color: splitLineColor } },
		},
		tooltip: {
			trigger: 'axis',
			backgroundColor: tooltipBackgroundColor,
			borderColor: axisLineColor,
			textStyle: { color: textColor, fontSize: 11 },
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
				showSymbol: false,
				lineStyle: { width: 2, color: homeColor },
				itemStyle: { color: homeColor },
			},
			{
				type: 'line',
				name: game.awayTeam.abbreviation,
				data: awayVals,
				smooth: true,
				showSymbol: false,
				lineStyle: { width: 2, color: awayColor },
				itemStyle: { color: awayColor },
			},
		],
	};
};

export const buildComponentContributionOption = (powerHistory: PowerScoreSnapshot[]): EChartsOption => {
	const labels = powerHistory.map(point => formatTimeLabel(point.timestamp));
	const closeness = powerHistory.map(point => point.closeness);
	const lateGame = powerHistory.map(point => point.lateGame);
	const momentum = powerHistory.map(point => point.momentum);
	const leadChanges = powerHistory.map(point => point.leadChanges);
	const comeback = powerHistory.map(point => point.comeback);
	return {
		...baseOption(labels, 24),
		series: [
			{ type: 'bar', stack: 'signals', name: 'Closeness', data: closeness, itemStyle: { color: '#22c55e' } },
			{ type: 'bar', stack: 'signals', name: 'Late-game', data: lateGame, itemStyle: { color: '#f75c03' } },
			{ type: 'bar', stack: 'signals', name: 'Momentum', data: momentum, itemStyle: { color: '#2274a5' } },
			{ type: 'bar', stack: 'signals', name: 'Lead changes', data: leadChanges, itemStyle: { color: '#f1c40f' } },
			{ type: 'bar', stack: 'signals', name: 'Comeback', data: comeback, itemStyle: { color: '#d90368' } },
		],
	};
};

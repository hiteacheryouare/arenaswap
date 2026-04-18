import type { EChartsOption } from 'echarts';
import { scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';

const axisLabelColor = '#9ca3af';
const axisLineColor = '#374151';
const splitLineColor = 'rgba(148, 163, 184, 0.2)';
const textColor = '#e5e7eb';
const tooltipBackgroundColor = '#0f172a';

const formatTimeLabel = (timestamp: number): string => (
	new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
);

const baseOption = (labels: string[]): EChartsOption => ({
	animationDuration: 220,
	tooltip: {
		trigger: 'axis',
		backgroundColor: tooltipBackgroundColor,
		borderColor: axisLineColor,
		textStyle: { color: textColor, fontSize: 11 },
	},
	grid: { left: 34, right: 12, top: 24, bottom: 24 },
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
	return {
		...baseOption(labels),
		yAxis: {
			...(baseOption(labels).yAxis as EChartsOption['yAxis']),
			max: Math.max(scoreMaxTotal + 15, ...totals),
		},
		series: [
			{
				type: 'line',
				smooth: true,
				showSymbol: false,
				lineStyle: { width: 2.5, color: '#f97316' },
				areaStyle: { color: 'rgba(249, 115, 22, 0.2)' },
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
	return {
		...baseOption(labels),
		legend: {
			top: 0,
			textStyle: { color: textColor, fontSize: 10 },
			itemWidth: 10,
			itemHeight: 10,
		},
		series: [
			{
				type: 'line',
				name: game.awayTeam.abbreviation,
				data: awayScores,
				showSymbol: false,
				lineStyle: { width: 2, color: game.awayTeam.color ?? '#60a5fa' },
			},
			{
				type: 'line',
				name: game.homeTeam.abbreviation,
				data: homeScores,
				showSymbol: false,
				lineStyle: { width: 2, color: game.homeTeam.color ?? '#f87171' },
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
		...baseOption(labels),
		legend: {
			top: 0,
			textStyle: { color: textColor, fontSize: 10 },
			itemWidth: 10,
			itemHeight: 10,
		},
		series: [
			{ type: 'bar', stack: 'signals', name: 'Closeness', data: closeness, itemStyle: { color: '#22c55e' } },
			{ type: 'bar', stack: 'signals', name: 'Late-game', data: lateGame, itemStyle: { color: '#f97316' } },
			{ type: 'bar', stack: 'signals', name: 'Momentum', data: momentum, itemStyle: { color: '#38bdf8' } },
			{ type: 'bar', stack: 'signals', name: 'Lead changes', data: leadChanges, itemStyle: { color: '#facc15' } },
			{ type: 'bar', stack: 'signals', name: 'Comeback', data: comeback, itemStyle: { color: '#a78bfa' } },
		],
	};
};

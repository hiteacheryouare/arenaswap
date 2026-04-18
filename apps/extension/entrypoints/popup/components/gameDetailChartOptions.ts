import type { EChartsOption } from 'echarts';
import { scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';

const axisLabelColor = '#8b949e';
const axisLineColor = 'rgba(71, 85, 105, 0.95)';
const splitLineColor = 'rgba(71, 85, 105, 0.34)';
const textColor = '#e6edf3';
const tooltipBackgroundColor = '#111827';

const formatTimeLabel = (timestamp: number): string => (
	new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
);

const hexToRgb = (value: string): { red: number; green: number; blue: number } | null => {
	const matched = /^#([\da-fA-F]{6})$/.exec(value);
	if (!matched) return null;
	const hex = matched[1];
	return {
		red: Number.parseInt(hex.slice(0, 2), 16),
		green: Number.parseInt(hex.slice(2, 4), 16),
		blue: Number.parseInt(hex.slice(4, 6), 16),
	};
};

const normalizeChannel = (value: number): number => {
	const channel = value / 255;
	return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

const luminance = (value: string): number => {
	const rgb = hexToRgb(value);
	if (!rgb) return 0;
	return (0.2126 * normalizeChannel(rgb.red))
		+ (0.7152 * normalizeChannel(rgb.green))
		+ (0.0722 * normalizeChannel(rgb.blue));
};

const mixTowardWhite = (value: string, amount: number): string => {
	const rgb = hexToRgb(value);
	if (!rgb) return value;
	const red = Math.round(rgb.red + (255 - rgb.red) * amount);
	const green = Math.round(rgb.green + (255 - rgb.green) * amount);
	const blue = Math.round(rgb.blue + (255 - rgb.blue) * amount);
	return `#${[red, green, blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
};

export const resolveReadableSeriesColor = (value: string | undefined, fallback: string): string => {
	if (!value || !hexToRgb(value)) return fallback;
	return luminance(value) < 0.34 ? mixTowardWhite(value, 0.48) : value;
};

const baseOption = (
	labels: string[],
	gridTop = 24,
): EChartsOption => ({
	animationDuration: 220,
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
				showSymbol: false,
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
	const awayColor = resolveReadableSeriesColor(game.awayTeam.color, '#60a5fa');
	const homeColor = resolveReadableSeriesColor(game.homeTeam.color, '#f87171');
	return {
		...baseOption(labels, 24),
		series: [
			{
				type: 'line',
				name: game.awayTeam.abbreviation,
				data: awayScores,
				showSymbol: false,
				lineStyle: { width: 2.4, color: awayColor },
				itemStyle: { color: awayColor },
			},
			{
				type: 'line',
				name: game.homeTeam.abbreviation,
				data: homeScores,
				showSymbol: false,
				lineStyle: { width: 2.4, color: homeColor },
				itemStyle: { color: homeColor },
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

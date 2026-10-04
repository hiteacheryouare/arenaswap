import type { EChartsOption } from 'echarts';
import { scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, PowerScoreSnapshot, ResolvedTheme, ScoreSnapshot, SignalName } from '@arenaswap/core/types';
import { hexToRgb } from './colorMath';
import { resolveChartLineColors } from './colorUtils';
import { defaultTranslate } from './defaultStrings';
import { boostPresentation, isBoostId, isModeSignalId, modeSignalIds, signalColorOf, signalPresentation } from './scoringModeMeta';
import type { BoostId } from './scoringModeMeta';
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

// `locale` is the language the popup's strings are in. Left undefined, it is the browser's own.
const formatTimeLabel = (timestamp: number, locale?: string): string => (
	new Date(timestamp).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
);

// Read when an option is built rather than once at load, so a chart drawn after the setting
// changes follows it. Node has no matchMedia, and the tests there build options with motion on.
const prefersReducedMotion = (): boolean => (
	typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
);

// ECharts animates every later setOption too, at its own 300ms cubicInOut unless told otherwise,
// so each poll's update is put on the same scale as the first draw.
const baseOption = (
	labels: string[],
	palette: chartPalette,
	gridTop = 24,
): EChartsOption => ({
	animation: !prefersReducedMotion(),
	animationDuration: motionDuration.slow,
	animationEasing: chartEasing,
	animationDurationUpdate: motionDuration.base,
	animationEasingUpdate: chartEasing,
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

// The website renders these charts without a translator, so English is the default for every name.
export const englishSignalLabel = (id: string): string => (isModeSignalId(id) ? defaultTranslate(signalPresentation[id].labelKey) : id);
export const englishBoostLabel = (id: string): string => (isBoostId(id) ? defaultTranslate(boostPresentation[id].labelKey) : id);

const tint = (hex: string, alpha: number): string => {
	const rgb = hexToRgb(hex);
	return rgb ? `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})` : hex;
};

// The moment boost paying most at this reading. One per reading, so two at once shade one stretch.
// These last for innings or a whole game. Shading them by size would hide every short live moment
// inside them, so they only shade a stretch where nothing live is happening.
const contextBoostIds: ReadonlySet<string> = new Set(['noHitter', 'upsetWatch', 'stakes']);

const momentOf = (snapshot: PowerScoreSnapshot): BoostId | undefined => {
	let strongest: BoostId | undefined;
	let strongestRank = 0;
	for (const [id, points] of Object.entries(snapshot.boosts ?? {})) {
		if (!isBoostId(id) || !boostPresentation[id].moment || points <= 0) continue;
		const rank = (contextBoostIds.has(id) ? 0 : 1000) + points;
		if (rank <= strongestRank) continue;
		strongest = id;
		strongestRank = rank;
	}
	return strongest;
};

export interface boostMoment {
	id: BoostId;
	// Reading indices. The stretch runs to the first reading the boost had stopped paying at, since
	// it ended somewhere between the two.
	start: number;
	end: number;
}

export const boostMoments = (powerHistory: readonly PowerScoreSnapshot[]): boostMoment[] => {
	const moments: boostMoment[] = [];
	let open: { id: BoostId; start: number } | undefined;
	powerHistory.forEach((snapshot, index) => {
		const id = momentOf(snapshot);
		if (open && open.id !== id) {
			moments.push({ id: open.id, start: open.start, end: index });
			open = undefined;
		}
		if (id && !open) open = { id, start: index };
	});
	if (open) moments.push({ id: open.id, start: open.start, end: powerHistory.length - 1 });
	return moments;
};

interface axisTooltipParam {
	axisValueLabel: string;
	dataIndex: number;
	marker: string;
	seriesName: string;
	value: number;
}

export const buildPowerScoreOption = (
	powerHistory: PowerScoreSnapshot[],
	palette = darkChartPalette,
	locale?: string,
	boostLabel = englishBoostLabel,
): EChartsOption => {
	const labels = powerHistory.map(point => formatTimeLabel(point.timestamp, locale));
	const totals = powerHistory.map(point => point.total);
	const showSinglePointSymbols = totals.length === 1;
	const option = baseOption(labels, palette);
	const moments = boostMoments(powerHistory);
	return {
		...option,
		...(moments.length > 0 ? {
			tooltip: {
				...(option.tooltip as object),
				formatter: (params: unknown) => {
					const [point] = params as axisTooltipParam[];
					if (!point) return '';
					const snapshot = powerHistory[point.dataIndex];
					const moment = snapshot ? momentOf(snapshot) : undefined;
					const line = `${point.axisValueLabel}<br/>${point.marker}${point.seriesName}: ${point.value}`;
					return moment
						? `${line}<br/><span style="color:${boostPresentation[moment].color}">●</span> ${boostLabel(moment)}`
						: line;
				},
			},
		} : {}),
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
				...(moments.length > 0 ? {
					markArea: {
						silent: true,
						data: moments.map(moment => [
							{ name: boostLabel(moment.id), xAxis: moment.start, itemStyle: { color: tint(boostPresentation[moment.id].color, 0.16) } },
							{ xAxis: moment.end },
						]),
					},
				} : {}),
			},
		],
	};
};

// The line colours are a parameter so a caller that already holds them can pass the same pair its
// legend is drawn in, and memoise on them.
const chartTeamColors = (game: Game, palette: chartPalette): [string, string] => (
	resolveChartLineColors(game.awayTeam, game.homeTeam, palette.surface)
);

export const buildTeamScoreOption = (
	scoreHistory: ScoreSnapshot[],
	game: Game,
	palette = darkChartPalette,
	[awayColor, homeColor] = chartTeamColors(game, palette),
	locale?: string,
): EChartsOption => {
	const labels = scoreHistory.map(point => formatTimeLabel(point.timestamp, locale));
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
	[awayColor, homeColor] = chartTeamColors(game, palette),
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
		// Away first, so the tooltip lists the teams in the order the legend and the hero do.
		series: [
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
		],
	};
};

const classicFields = modeSignalIds.classic satisfies readonly SignalName[];

// Every signal any reading carries, in the order they first appear. A reading from before modes has
// only the five flat Classic fields.
export const contributionSignalIds = (powerHistory: readonly PowerScoreSnapshot[]): string[] => {
	const ids = new Set<string>();
	for (const snapshot of powerHistory) {
		for (const id of snapshot.signals ? Object.keys(snapshot.signals) : classicFields) ids.add(id);
	}
	return ids.size > 0 ? [...ids] : [...classicFields];
};

const signalValue = (snapshot: PowerScoreSnapshot, id: string): number => {
	if (snapshot.signals) return snapshot.signals[id] ?? 0;
	return (classicFields as readonly string[]).includes(id) ? snapshot[id as SignalName] : 0;
};

// The tooltip prints the series names, so the popup passes the same translated names its legend uses.
export const buildComponentContributionOption = (
	powerHistory: PowerScoreSnapshot[],
	palette = darkChartPalette,
	signalLabel = englishSignalLabel,
	locale?: string,
): EChartsOption => {
	const labels = powerHistory.map(point => formatTimeLabel(point.timestamp, locale));
	return {
		...baseOption(labels, palette, 24),
		series: contributionSignalIds(powerHistory).map(id => ({
			type: 'bar',
			stack: 'signals',
			name: signalLabel(id),
			data: powerHistory.map(snapshot => signalValue(snapshot, id)),
			itemStyle: { color: signalColorOf(id) },
		})),
	};
};

const englishLeadLabel = (team: string | undefined, margin: number): string => (
	margin === 0 || team === undefined ? defaultTranslate('detail.leadTied') : defaultTranslate('detail.leadBy', { team, margin })
);

// The away team's lead reads above zero and the home team's below, in the order the hero and the
// legend list them.
export const buildLeadTrackerOption = (
	scoreHistory: ScoreSnapshot[],
	game: Game,
	palette = darkChartPalette,
	[awayColor, homeColor] = chartTeamColors(game, palette),
	locale?: string,
	describeLead = englishLeadLabel,
): EChartsOption => {
	const labels = scoreHistory.map(point => formatTimeLabel(point.timestamp, locale));
	const margins = scoreHistory.map(point => point.awayScore - point.homeScore);
	const showSinglePointSymbols = scoreHistory.length === 1;
	const option = baseOption(labels, palette, 24);
	const side = (name: string, color: string, data: number[]) => ({
		type: 'line' as const,
		name,
		data,
		showSymbol: showSinglePointSymbols,
		symbolSize: showSinglePointSymbols ? 7 : 0,
		lineStyle: { width: 2, color },
		itemStyle: { color },
		areaStyle: { color, opacity: 0.3 },
	});
	return {
		...option,
		yAxis: {
			...(option.yAxis as object),
			axisLabel: { color: palette.axisLabel, fontSize: 10, formatter: (value: number) => String(Math.abs(value)) },
		},
		tooltip: {
			...(option.tooltip as object),
			formatter: (params: unknown) => {
				const [point] = params as axisTooltipParam[];
				if (!point) return '';
				const margin = margins[point.dataIndex] ?? 0;
				const leader = margin > 0 ? game.awayTeam.abbreviation : margin < 0 ? game.homeTeam.abbreviation : undefined;
				return `${point.axisValueLabel}<br/>${describeLead(leader, Math.abs(margin))}`;
			},
		},
		series: [
			side(game.awayTeam.abbreviation, awayColor, margins.map(margin => Math.max(0, margin))),
			side(game.homeTeam.abbreviation, homeColor, margins.map(margin => Math.min(0, margin))),
		],
	};
};

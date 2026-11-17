import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { computePowerScore } from 'powerscore';
import type { Game, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
} from '@arenaswap/ui/src/components/gameDetailChartOptions';
import { useT } from '@arenaswap/ui/src/components/i18nContext';
import { TranslationContext, islandTranslator } from '../../i18n/islandStrings';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;
const minute = 60_000;
const start = 1_767_225_600_000;

const game: Game = {
	id: 'chart-nba',
	league: 'nba',
	sportType: 'basketball',
	status: 'in',
	period: 4,
	clockSeconds: 152,
	venueName: 'Madison Square Garden',
	awayTeam: { id: '2', name: 'Boston Celtics', abbreviation: 'BOS', score: 100, logo: espnTeamLogo('nba/500/bos'), color: '#007A33', alternateColor: '#BA9653' },
	homeTeam: { id: '18', name: 'New York Knicks', abbreviation: 'NYK', score: 100, logo: espnTeamLogo('nba/500/nyk'), color: '#006BB6', alternateColor: '#F58426' },
};

const scoreHistory: ScoreSnapshot[] = [
	{ gameId: game.id, timestamp: start, homeScore: 62, awayScore: 77 },
	{ gameId: game.id, timestamp: start + 4 * minute, homeScore: 68, awayScore: 82 },
	{ gameId: game.id, timestamp: start + 8 * minute, homeScore: 73, awayScore: 85 },
	{ gameId: game.id, timestamp: start + 12 * minute, homeScore: 79, awayScore: 88 },
	{ gameId: game.id, timestamp: start + 16 * minute, homeScore: 85, awayScore: 90 },
	{ gameId: game.id, timestamp: start + 20 * minute, homeScore: 90, awayScore: 92 },
	{ gameId: game.id, timestamp: start + 24 * minute, homeScore: 96, awayScore: 95 },
	{ gameId: game.id, timestamp: start + 28 * minute, homeScore: 100, awayScore: 100 },
];

const winProbability = [0.1, 0.07, 0.12, 0.2, 0.33, 0.44, 0.6, 0.5];

const gameClockSecondsPerPoll = 3 * 60;
const quarterSeconds = 12 * 60;
const firstChartedQuarter = 3;
const lastQuarter = 4;

const clockAt = (index: number) => {
	const elapsed = index * gameClockSecondsPerPoll;
	const period = Math.min(lastQuarter, Math.floor(elapsed / quarterSeconds) + firstChartedQuarter);
	return { period, clockSeconds: Math.max(0, quarterSeconds - (elapsed % quarterSeconds)) };
};

const powerHistory: PowerScoreSnapshot[] = scoreHistory.map((point, index) => {
	const { period, clockSeconds } = clockAt(index);
	const at: Game = {
		...game,
		period,
		clockSeconds,
		awayTeam: { ...game.awayTeam, score: point.awayScore },
		homeTeam: { ...game.homeTeam, score: point.homeScore },
	};
	const result = computePowerScore(at, scoreHistory.slice(0, index + 1), winProbability.slice(0, index + 1));
	return {
		gameId: game.id,
		timestamp: point.timestamp,
		total: result.total,
		closeness: result.closeness,
		lateGame: result.lateGame,
		momentum: result.momentum,
		leadChanges: result.leadChanges,
		comeback: result.comeback,
		winProbabilityVariance: result.winProbabilityVariance,
		signalsSubtotal: result.signalsSubtotal ?? result.total,
		favoriteBonus: result.favoriteBonus ?? 0,
		favoriteTeamCount: result.favoriteTeamCount ?? 0,
		reason: result.reason,
	};
});

const options = {
	powerScore: buildPowerScoreOption(powerHistory),
	teamScore: buildTeamScoreOption(scoreHistory, game),
	winProbability: buildWinProbabilityOption(winProbability, game),
	components: buildComponentContributionOption(powerHistory),
};

const Chart = ({ title, option }: { title: string; option: EChartsOption }) => {
	const host = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!host.current) return;
		const chart = echarts.init(host.current, undefined, { renderer: 'canvas' });
		chart.setOption(option);
		const resize = () => chart.resize();
		window.addEventListener('resize', resize);
		return () => {
			window.removeEventListener('resize', resize);
			chart.dispose();
		};
	}, [option]);

	return (
		<div className='chart-tile'>
			<p className='chart-tile-title'>{title}</p>
			<div ref={host} className='game-detail-chart-canvas' role='img' aria-label={title} />
		</div>
	);
};

const ChartGrid = () => {
	const t = useT();
	return (
		<div className='charts-grid' data-bs-theme='dark'>
			<Chart title={t('detail.chartPowerScoreTitle')} option={options.powerScore} />
			<Chart title={t('detail.chartScoreTitle')} option={options.teamScore} />
			<Chart title={t('detail.chartWinProbTitle')} option={options.winProbability} />
			<Chart title={t('detail.chartComponentsTitle')} option={options.components} />
		</div>
	);
};

const DetailCharts = ({ strings }: { strings?: Record<string, string> }) => (
	<TranslationContext.Provider value={islandTranslator(strings)}>
		<ChartGrid />
	</TranslationContext.Provider>
);

export default DetailCharts;

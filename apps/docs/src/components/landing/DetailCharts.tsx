import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { computePowerScore } from 'powerscore';
import type { Game, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
} from '@arenaswap/ui/src/components/gameDetailChartOptions';
import { useT } from '@arenaswap/ui/src/components/i18nContext';

// The four charts from the game detail view, built by the extension's own option builders. Not
// redrawn as SVG: the axes, the grid, the five signal colours and the smoothing all come from
// gameDetailChartOptions.ts, so a change there lands here without anybody remembering to copy it.
//
// The history below is one game's worth of polls. Charts mount only once the section is on
// screen, so ECharts stays off the critical path.

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
	{ gameId: game.id, timestamp: start, homeScore: 74, awayScore: 78 },
	{ gameId: game.id, timestamp: start + 4 * minute, homeScore: 79, awayScore: 83 },
	{ gameId: game.id, timestamp: start + 8 * minute, homeScore: 84, awayScore: 85 },
	{ gameId: game.id, timestamp: start + 12 * minute, homeScore: 87, awayScore: 88 },
	{ gameId: game.id, timestamp: start + 16 * minute, homeScore: 92, awayScore: 90 },
	{ gameId: game.id, timestamp: start + 20 * minute, homeScore: 95, awayScore: 93 },
	{ gameId: game.id, timestamp: start + 24 * minute, homeScore: 98, awayScore: 97 },
	{ gameId: game.id, timestamp: start + 28 * minute, homeScore: 100, awayScore: 100 },
];

const winProbability = scoreHistory.map(point => (
	Math.min(0.94, Math.max(0.06, 0.5 + (point.homeScore - point.awayScore) * 0.045))
));

// Replayed through the scorer rather than written out. Each poll is scored against the history
// up to that point and against the game state at that point, which is what produces a rising
// late-game contribution and a momentum spike on the run in the middle.
const clockAt = (index: number) => {
	const elapsed = index * 4 * 60;
	const period = Math.min(4, Math.floor(elapsed / 720) + 3);
	return { period, clockSeconds: Math.max(0, 720 - (elapsed % 720)) };
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
	const result = computePowerScore(at, scoreHistory.slice(0, index + 1), 0, winProbability.slice(0, index + 1));
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
		baseTotal: result.baseTotal ?? result.total,
		favoriteBonus: result.favoriteBonus ?? 0,
		favoriteTeamCount: result.favoriteTeamCount ?? 0,
		stalled: result.stalled ?? false,
		stallPenalty: result.stallPenalty,
		reason: result.reason,
	};
});

const options = {
	powerScore: buildPowerScoreOption(powerHistory),
	teamScore: buildTeamScoreOption(scoreHistory, game),
	winProbability: buildWinProbabilityOption(winProbability, game),
	components: buildComponentContributionOption(powerHistory),
};

const Chart = ({ title, option }: { title: string; option: echarts.EChartsOption }) => {
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

const DetailCharts = () => {
	const t = useT();
	return (
		<div className='charts-grid'>
			<Chart title={t('detail.chartPowerScoreTitle')} option={options.powerScore} />
			<Chart title={t('detail.chartScoreTitle')} option={options.teamScore} />
			<Chart title={t('detail.chartWinProbTitle')} option={options.winProbability} />
			<Chart title={t('detail.chartComponentsTitle')} option={options.components} />
		</div>
	);
};

export default DetailCharts;

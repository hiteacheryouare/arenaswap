import { useMemo } from 'react';
import { i18n } from '#i18n';
import { leagueConfigMap, scoreMaxTotal } from '@arenaswap/core/constants';
import { computeWinProbVarianceScore } from '@arenaswap/core';
import type { Game, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot, SignalName } from '@arenaswap/core/types';
import BaseDiamond from './baseDiamond';
import BsoIndicator from './bsoIndicator';
import SeriesDots from './seriesDots';
import DetailTeamPill from './detailTeamPill';
import FlipScore from './flipScore';
import GameDetailChart from './gameDetailChart';
import InningHalfIcon from './inningHalfIcon';
import GameBoostInput from './gameBoostInput';
import PowerScoreBreakdown from './powerScoreBreakdown';
import ProTip from './proTip';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
} from './gameDetailChartOptions';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import useSummaryData from './useSummaryData';
import { formatGameClock, formatPeriod, GameMeta, powerScoreColor } from './gameCardShared';
import { conditionIcon, formatTemperature } from './weatherUtils';
import type { BettingDisplayPrefs, WeatherDisplayPrefs } from './gameCardTypes';

interface gameDetailViewProps {
	game: Game;
	excitementResult: PowerScoreResult | undefined;
	scoreHistory: ScoreSnapshot[];
	powerScoreHistory: PowerScoreSnapshot[];
	proTipsEnabled: boolean;
	gameBoosts: Record<string, number>;
	bettingPrefs: BettingDisplayPrefs;
	weatherPrefs: WeatherDisplayPrefs;
	disabledSignals?: readonly SignalName[];
	onSetGameBoost: (gameId: string, boost: number) => void;
	onBack: () => void;
}

const componentLegendItems = [
	{ label: i18n.t('detail.legendCloseness'), color: '#22c55e' },
	{ label: i18n.t('detail.legendLateGame'), color: '#f75c03' },
	{ label: i18n.t('detail.legendMomentum'), color: '#2274a5' },
	{ label: i18n.t('detail.legendLeadChanges'), color: '#f1c40f' },
	{ label: i18n.t('detail.legendComeback'), color: '#d90368' },
];

const withMatchupAlpha = (color: string, fallback: string): string => (
	/^#[\da-fA-F]{6}$/.test(color) ? `${color}28` : fallback
);

const gameDetailView = ({ game, excitementResult, scoreHistory, powerScoreHistory, proTipsEnabled, gameBoosts, bettingPrefs, weatherPrefs, disabledSignals = [], onSetGameBoost, onBack }: gameDetailViewProps) => {
	const orderedScoreHistory = useMemo(
		() => scoreHistory.toSorted((a, b) => a.timestamp - b.timestamp),
		[scoreHistory],
	);
	const orderedPowerScoreHistory = useMemo(
		() => powerScoreHistory.toSorted((a, b) => a.timestamp - b.timestamp),
		[powerScoreHistory],
	);
	const fallbackPowerScore = orderedPowerScoreHistory[orderedPowerScoreHistory.length - 1];
	const activePowerScore = excitementResult ?? fallbackPowerScore;

	const closeness = activePowerScore?.closeness ?? 0;
	const lateGame = activePowerScore?.lateGame ?? 0;
	const momentum = activePowerScore?.momentum ?? 0;
	const leadChanges = activePowerScore?.leadChanges ?? 0;
	const comeback = activePowerScore?.comeback ?? 0;
	const rawSubtotal = closeness + lateGame + momentum + leadChanges + comeback;
	// When stalled, baseTotal is the pre-stall signals sum stored by the scorer (could exceed 100).
	// When not stalled, it equals rawSubtotal.
	const baseTotal = activePowerScore?.baseTotal ?? rawSubtotal;
	const stallPenalty = activePowerScore?.stallPenalty ?? 0;
	const favoriteBonus = activePowerScore?.favoriteBonus ?? 0;
	const favoriteTeamCount = activePowerScore?.favoriteTeamCount ?? 0;
	const currentBoost = gameBoosts[game.id] ?? 0;
	const scoringOpportunityBoost = activePowerScore?.scoringOpportunityBoost ?? 0;
	const postseasonBoost = activePowerScore?.postseasonBoost ?? 0;
	const reason = activePowerScore?.reason ?? 'Best Available';

	const powerScoreOption = useMemo(() => (
		buildPowerScoreOption(orderedPowerScoreHistory)
	), [orderedPowerScoreHistory]);
	const scoreTrendOption = useMemo(() => (
		buildTeamScoreOption(orderedScoreHistory, game)
	), [orderedScoreHistory, game]);
	const componentOption = useMemo(() => (
		buildComponentContributionOption(orderedPowerScoreHistory)
	), [orderedPowerScoreHistory]);
	const { winProbability, seriesInfo } = useSummaryData(game);
	const winProbabilityOption = useMemo(() => (
		buildWinProbabilityOption(winProbability, game)
	), [winProbability, game]);
	// Variance comes exclusively from real ESPN win probability data — if the chart has no data,
	// there is no volatility row and no variance applied to the score.
	const winProbabilityVariance = useMemo(() => computeWinProbVarianceScore(winProbability), [winProbability]);
	const total = Math.max(0, (activePowerScore?.total ?? 0) + (winProbabilityVariance ?? 0));

	const [awayLineColor, homeLineColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#60a5fa', '#f87171', true);
	const teamLegendItems = useMemo(() => ([
		{ label: game.awayTeam.abbreviation, color: awayLineColor },
		{ label: game.homeTeam.abbreviation, color: homeLineColor },
	]), [awayLineColor, game.awayTeam.abbreviation, game.homeTeam.abbreviation, homeLineColor]);

	const isDelayed = game.delayed === true;
	const [awayAccent, homeAccent] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');
	const matchupCardStyle = isDelayed ? {
		borderLeft: '5px solid #F1C40F',
		borderRight: '5px solid #F1C40F',
		background: 'linear-gradient(to right, rgba(241,196,15,0.12), rgba(241,196,15,0.12)), #ffffff',
	} : {
		borderLeft: `5px solid ${awayAccent}`,
		borderRight: `5px solid ${homeAccent}`,
		background: `linear-gradient(to right, ${withMatchupAlpha(awayAccent, '#dee2e628')}, ${withMatchupAlpha(homeAccent, '#dee2e628')}), #ffffff`,
	};
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const statusDetail = game.status === 'in'
		? isInningSport
			? <><InningHalfIcon topOfInning={game.topOfInning} />{formatPeriod(game)}</>
			: `${formatPeriod(game)} • ${formatGameClock(game)}`
		: game.status === 'pre' ? i18n.t('detail.startsSoon') : i18n.t('detail.final');
	const totalLabel = total > scoreMaxTotal
		? i18n.t('detail.totalLabelBaseMax', { total, max: scoreMaxTotal })
		: i18n.t('detail.totalLabel', { total, max: scoreMaxTotal });
	const psBarPercent = Math.min((total / scoreMaxTotal) * 100, 100);
	const psColor = powerScoreColor(total, scoreMaxTotal);

	return (
		<div className='popup-container game-detail-shell'>
			<div className='game-detail-header'>
				<button type='button' className='btn btn-sm game-detail-back-button' onClick={onBack}>
					<i className='bi bi-arrow-left' />
					<span>{i18n.t('detail.back')}</span>
				</button>
				<div className='game-detail-title'>{game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}</div>
			</div>

			<div className={`game-card game-detail-matchup${isDelayed ? ' is-delayed' : ''}`} style={matchupCardStyle}>
				<div className='game-detail-teams-row'>
					<DetailTeamPill team={game.awayTeam} />
					<div className='game-detail-center'>
						{isInningSport && game.baseRunners && <BaseDiamond {...game.baseRunners} />}
						<div className='d-flex align-items-baseline game-detail-score-row'>
							<FlipScore value={game.awayTeam.score} className='fw-bold lh-1 game-detail-score-value' />
							<FlipScore value={game.homeTeam.score} className='fw-bold lh-1 game-detail-score-value' />
						</div>
						<div className='game-detail-period'>{statusDetail}</div>
						{isDelayed && (
							<span className='badge bg-warning text-dark delay-type-badge mt-1'>
								{game.delayDescription ?? i18n.t('gameCard.delayFallback')}
							</span>
						)}
						{isInningSport && game.bso && <BsoIndicator {...game.bso} />}
					</div>
					<DetailTeamPill team={game.homeTeam} />
				</div>
				{seriesInfo && <SeriesDots info={seriesInfo} game={game} />}
				{game.status !== 'pre' && activePowerScore && (
					<div className='game-card-ps-bar-row'>
						<div className='d-flex align-items-center gap-2'>
							<span className='game-card-ps-label'>{i18n.t('detail.powerScoreLabel')}</span>
							<div className='progress flex-grow-1 game-card-ps-progress'>
								<div
									className='progress-bar'
									role='progressbar'
									style={{ width: `${psBarPercent}%`, backgroundColor: psColor }}
									aria-valuenow={total}
									aria-valuemin={0}
									aria-valuemax={scoreMaxTotal}
								/>
							</div>
							<span className='game-card-ps-score' style={{ color: psColor }}>
								{total} / {scoreMaxTotal}
							</span>
						</div>
						{reason && (
							<div className='game-detail-card-reason'>
								{reason.charAt(0).toUpperCase() + reason.slice(1)}
							</div>
						)}
					</div>
				)}
			</div>
			<GameMeta game={game} dark bettingPrefs={bettingPrefs} />
			{game.weather && (
				<div className='d-flex align-items-center justify-content-center gap-1 game-detail-weather'>
					<i className={`bi ${conditionIcon(game.weather.conditionLabel)}`} aria-hidden='true' />
					<span>{game.weather.conditionLabel}</span>
					<span className='game-detail-weather-sep'>·</span>
					<span>{formatTemperature(game.weather.temperatureF, weatherPrefs.temperatureUnit)}</span>
				</div>
			)}

			<PowerScoreBreakdown
				closeness={closeness}
				lateGame={lateGame}
				momentum={momentum}
				leadChanges={leadChanges}
				comeback={comeback}
				winProbabilityVariance={winProbabilityVariance}
				baseTotal={baseTotal}
				stallPenalty={stallPenalty}
				favoriteBonus={favoriteBonus}
				favoriteTeamCount={favoriteTeamCount}
				currentBoost={currentBoost}
				scoringOpportunityBoost={scoringOpportunityBoost}
				postseasonBoost={postseasonBoost}
				total={total}
				totalLabel={totalLabel}
				disabledSignals={disabledSignals}
			/>

			{game.status !== 'pre' && (
				<GameBoostInput gameId={game.id} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />
			)}

			{proTipsEnabled && <ProTip context='detail' />}

			{orderedPowerScoreHistory.length > 0
				? <GameDetailChart title={i18n.t('detail.chartPowerScoreTitle')} option={powerScoreOption} />
				: <div className='game-detail-empty-state'>{i18n.t('detail.chartPowerScoreEmpty')}</div>}

			{orderedScoreHistory.length > 0
				? <GameDetailChart title={i18n.t('detail.chartScoreTitle')} option={scoreTrendOption} legendItems={teamLegendItems} />
				: <div className='game-detail-empty-state'>{i18n.t('detail.chartScoreEmpty')}</div>}

			{winProbability.length > 0
				? <GameDetailChart title={i18n.t('detail.chartWinProbTitle')} option={winProbabilityOption} legendItems={teamLegendItems} />
				: <div className='game-detail-empty-state'>{i18n.t('detail.chartWinProbEmpty')}</div>}

			{orderedPowerScoreHistory.length > 0
				? <GameDetailChart title={i18n.t('detail.chartComponentsTitle')} option={componentOption} legendItems={componentLegendItems} />
				: <div className='game-detail-empty-state'>{i18n.t('detail.chartComponentsEmpty')}</div>}
		</div>
	);
};

export default gameDetailView;

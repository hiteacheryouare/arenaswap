import { useMemo } from 'react';
import { leagueConfigMap, scoreMaxTotal } from '@arenaswap/core/constants';
import type { Game, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';
import BaseDiamond from './baseDiamond';
import BsoIndicator from './bsoIndicator';
import SeriesDots from './seriesDots';
import DetailTeamPill from './detailTeamPill';
import FlipScore from './flipScore';
import GameDetailChart from './gameDetailChart';
import GameBoostInput from './gameBoostInput';
import PowerScoreBreakdown from './powerScoreBreakdown';
import ProTip from './proTip';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	buildWinProbabilityOption,
	resolveReadableSeriesColor,
} from './gameDetailChartOptions';
import useSummaryData from './useSummaryData';
import { formatGameClock, formatPeriod, GameMeta, powerScoreColor } from './gameCardShared';
import type { BettingDisplayPrefs } from './gameCardTypes';

interface gameDetailViewProps {
	game: Game;
	excitementResult: PowerScoreResult | undefined;
	scoreHistory: ScoreSnapshot[];
	powerScoreHistory: PowerScoreSnapshot[];
	proTipsEnabled: boolean;
	gameBoosts: Record<string, number>;
	bettingPrefs: BettingDisplayPrefs;
	onSetGameBoost: (gameId: string, boost: number) => void;
	onBack: () => void;
}

const componentLegendItems = [
	{ label: 'Closeness', color: '#22c55e' },
	{ label: 'Late-game', color: '#f75c03' },
	{ label: 'Momentum', color: '#2274a5' },
	{ label: 'Lead changes', color: '#f1c40f' },
	{ label: 'Comeback', color: '#d90368' },
];

const withMatchupAlpha = (color: string, fallback: string): string => (
	/^#[\da-fA-F]{6}$/.test(color) ? `${color}28` : fallback
);

const gameDetailView = ({ game, excitementResult, scoreHistory, powerScoreHistory, proTipsEnabled, gameBoosts, bettingPrefs, onSetGameBoost, onBack }: gameDetailViewProps) => {
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
	const total = activePowerScore?.total ?? 0;
	const rawSubtotal = closeness + lateGame + momentum + leadChanges + comeback;
	// When stalled, baseTotal is the pre-stall signals sum stored by the scorer (could exceed 100).
	// When not stalled, it equals rawSubtotal.
	const baseTotal = activePowerScore?.baseTotal ?? rawSubtotal;
	const isStalled = activePowerScore?.stalled === true;
	const favoriteBonus = activePowerScore?.favoriteBonus ?? 0;
	const favoriteTeamCount = activePowerScore?.favoriteTeamCount ?? 0;
	const currentBoost = gameBoosts[game.id] ?? 0;
	const scoringOpportunityBoost = activePowerScore?.scoringOpportunityBoost ?? 0;
	const reason = activePowerScore?.reason ?? 'Best Available';
	const totalBeforeBonuses = total - favoriteBonus - currentBoost - scoringOpportunityBoost;

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

	const awayLineColor = resolveReadableSeriesColor(game.awayTeam.color, '#60a5fa');
	const homeLineColor = resolveReadableSeriesColor(game.homeTeam.color, '#f87171');
	const teamLegendItems = useMemo(() => ([
		{ label: game.awayTeam.abbreviation, color: awayLineColor },
		{ label: game.homeTeam.abbreviation, color: homeLineColor },
	]), [awayLineColor, game.awayTeam.abbreviation, game.homeTeam.abbreviation, homeLineColor]);

	const awayAccent = game.awayTeam.color ?? '#2274A5';
	const homeAccent = game.homeTeam.color ?? '#F75C03';
	const matchupCardStyle = {
		borderLeft: `5px solid ${awayAccent}`,
		borderRight: `5px solid ${homeAccent}`,
		background: `linear-gradient(to right, ${withMatchupAlpha(awayAccent, '#dee2e628')}, ${withMatchupAlpha(homeAccent, '#dee2e628')}), #ffffff`,
	};
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';
	const inningHalf = game.topOfInning !== undefined ? (game.topOfInning ? '▲ ' : '▼ ') : '';
	const statusDetail = game.status === 'in'
		? isInningSport
			? `${inningHalf}${formatPeriod(game)}`
			: `${formatPeriod(game)} • ${formatGameClock(game)}`
		: game.status === 'pre' ? 'Starts soon' : 'Final';
	const totalLabel = total > scoreMaxTotal
		? `${total} (base max ${scoreMaxTotal})`
		: `${total} / ${scoreMaxTotal}`;
	const psBarPercent = Math.min((total / scoreMaxTotal) * 100, 100);
	const psColor = powerScoreColor(total, scoreMaxTotal);

	return (
		<div className='popup-container game-detail-shell'>
			<div className='game-detail-header'>
				<button type='button' className='btn btn-sm game-detail-back-button' onClick={onBack}>
					<i className='bi bi-arrow-left' />
					<span>Back</span>
				</button>
				<div className='game-detail-title'>{game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}</div>
			</div>

			<div className='game-card game-detail-matchup' style={matchupCardStyle}>
				<div className='game-detail-teams-row'>
					<DetailTeamPill team={game.awayTeam} />
					<div className='game-detail-center'>
						{isInningSport && game.baseRunners && <BaseDiamond {...game.baseRunners} />}
						<div className='d-flex align-items-baseline game-detail-score-row'>
							<FlipScore value={game.awayTeam.score} className='fw-bold lh-1 game-detail-score-value' />
							<FlipScore value={game.homeTeam.score} className='fw-bold lh-1 game-detail-score-value' />
						</div>
						<div className='game-detail-period'>{statusDetail}</div>
						{isInningSport && game.bso && <BsoIndicator {...game.bso} />}
					</div>
					<DetailTeamPill team={game.homeTeam} />
				</div>
				{seriesInfo && <SeriesDots info={seriesInfo} game={game} />}
				{game.status !== 'pre' && activePowerScore && (
					<div className='game-card-ps-bar-row'>
						<div className='d-flex align-items-center gap-2'>
							<span className='game-card-ps-label'>PowerScore</span>
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

			<PowerScoreBreakdown
				closeness={closeness}
				lateGame={lateGame}
				momentum={momentum}
				leadChanges={leadChanges}
				comeback={comeback}
				baseTotal={baseTotal}
				isStalled={isStalled}
				totalBeforeBonuses={totalBeforeBonuses}
				favoriteBonus={favoriteBonus}
				favoriteTeamCount={favoriteTeamCount}
				currentBoost={currentBoost}
				scoringOpportunityBoost={scoringOpportunityBoost}
				total={total}
				totalLabel={totalLabel}
			/>

			<GameBoostInput gameId={game.id} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />

			{proTipsEnabled && <ProTip context='detail' />}

			{orderedPowerScoreHistory.length > 0
				? <GameDetailChart title='PowerScore over time' option={powerScoreOption} />
				: <div className='game-detail-empty-state'>PowerScore trend appears after a few refreshes.</div>}

			{orderedScoreHistory.length > 0
				? <GameDetailChart title='Game score over time' option={scoreTrendOption} legendItems={teamLegendItems} />
				: <div className='game-detail-empty-state'>Score trend appears after a few refreshes.</div>}

			{winProbability.length > 0
				? <GameDetailChart title='Win probability' option={winProbabilityOption} legendItems={teamLegendItems} />
				: <div className='game-detail-empty-state'>Win probability loads when the game is live.</div>}

			{orderedPowerScoreHistory.length > 0
				? <GameDetailChart title='PowerScore components over time' option={componentOption} legendItems={componentLegendItems} />
				: <div className='game-detail-empty-state'>Component trend appears after a few refreshes.</div>}
		</div>
	);
};

export default gameDetailView;

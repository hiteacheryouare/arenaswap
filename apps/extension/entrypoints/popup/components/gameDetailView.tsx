import { useMemo } from 'react';
import {
	scorerTunables,
	scoreMaxCloseness,
	scoreMaxComeback,
	scoreMaxLateGame,
	scoreMaxLeadChanges,
	scoreMaxMomentum,
	scoreMaxTotal,
	stallPenaltyMultiplier,
	sportTypeConfigMap,
} from '@arenaswap/core/constants';
import type { Game, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot } from '@arenaswap/core/types';
import DetailTeamPill from './detailTeamPill';
import FlipScore from './flipScore';
import GameDetailChart from './gameDetailChart';
import ProTip from './proTip';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
	resolveReadableSeriesColor,
} from './gameDetailChartOptions';
import { formatClock, formatPeriod, gameMeta as GameMeta, powerScoreColor } from './gameCardShared';

interface gameDetailViewProps {
	game: Game;
	excitementResult: PowerScoreResult | undefined;
	scoreHistory: ScoreSnapshot[];
	powerScoreHistory: PowerScoreSnapshot[];
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

const gameDetailView = ({ game, excitementResult, scoreHistory, powerScoreHistory, onBack }: gameDetailViewProps) => {
	const orderedScoreHistory = useMemo(
		() => [...scoreHistory].sort((a, b) => a.timestamp - b.timestamp),
		[scoreHistory],
	);
	const orderedPowerScoreHistory = useMemo(
		() => [...powerScoreHistory].sort((a, b) => a.timestamp - b.timestamp),
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
	const baseTotal = activePowerScore?.baseTotal ?? (activePowerScore?.stalled ? Math.round(rawSubtotal * stallPenaltyMultiplier) : rawSubtotal);
	const favoriteBonus = activePowerScore?.favoriteBonus ?? 0;
	const favoriteTeamCount = activePowerScore?.favoriteTeamCount ?? 0;
	const reason = activePowerScore?.reason ?? 'Best Available';
	const stallPenaltyPoints = activePowerScore?.stalled ? Math.max(0, rawSubtotal - baseTotal) : 0;

	const sportConfig = sportTypeConfigMap[game.sportType];
	const isZeroZeroGame = game.homeTeam.score === 0 && game.awayTeam.score === 0;
	const zeroZeroPenalty = isZeroZeroGame && !sportConfig.zeroZeroAsFullTie
		? scorerTunables.scores.closeness.tied - scorerTunables.scores.closeness.zeroZero
		: 0;

	const powerScoreOption = useMemo(() => (
		buildPowerScoreOption(orderedPowerScoreHistory)
	), [orderedPowerScoreHistory]);
	const scoreTrendOption = useMemo(() => (
		buildTeamScoreOption(orderedScoreHistory, game)
	), [orderedScoreHistory, game]);
	const componentOption = useMemo(() => (
		buildComponentContributionOption(orderedPowerScoreHistory)
	), [orderedPowerScoreHistory]);

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
	const statusDetail = game.status === 'in' ? `${formatPeriod(game)} • ${formatClock(game.clockSeconds)}` : game.status === 'pre' ? 'Starts soon' : 'Final';
	const totalLabel = total > scoreMaxTotal
		? `${total} (base max ${scoreMaxTotal})`
		: `${total} / ${scoreMaxTotal}`;

	return (
		<div className='popup-container game-detail-shell'>
			<div className='game-detail-header'>
				<button type='button' className='btn btn-sm game-detail-back-button' onClick={onBack}>
					<i className='bi bi-arrow-left' />
					<span>Back</span>
				</button>
				<div className='game-detail-title'>Game Detail</div>
			</div>

			<div className='game-card game-detail-matchup' style={matchupCardStyle}>
				<DetailTeamPill team={game.awayTeam} />
				<div className='game-detail-center'>
					<div className='d-flex align-items-baseline game-detail-score-row'>
						<FlipScore value={game.awayTeam.score} className='fw-bold lh-1 game-detail-score-value' />
						<FlipScore value={game.homeTeam.score} className='fw-bold lh-1 game-detail-score-value' />
					</div>
					<div className='game-detail-period'>{statusDetail}</div>
					<div className='powerscore game-detail-powerscore-label' style={{ backgroundColor: powerScoreColor(total, scoreMaxTotal) }}>
						PowerScore: {totalLabel}
					</div>
				</div>
				<DetailTeamPill team={game.homeTeam} />
			</div>
			<GameMeta game={game} />

			<section className='powerscore-breakdown game-detail-formula-card'>
				<div className='powerscore-breakdown-heading'>How PowerScore is calculated</div>
				<div className='powerscore-breakdown-row'><span>Closeness</span><span>{closeness} / {scoreMaxCloseness}</span></div>
				<div className='powerscore-breakdown-row'><span>Late-game pressure</span><span>{lateGame} / {scoreMaxLateGame}</span></div>
				<div className='powerscore-breakdown-row'><span>Momentum</span><span>{momentum} / {scoreMaxMomentum}</span></div>
				<div className='powerscore-breakdown-row'><span>Lead changes</span><span>{leadChanges} / {scoreMaxLeadChanges}</span></div>
				<div className='powerscore-breakdown-row'><span>Comeback</span><span>{comeback} / {scoreMaxComeback}</span></div>
				<div className='powerscore-breakdown-row powerscore-breakdown-row-subtotal'><span>Raw subtotal</span><span>{rawSubtotal} / {scoreMaxTotal}</span></div>
				<div className='powerscore-breakdown-row powerscore-breakdown-row-penalty'><span>0-0 penalty</span><span>{zeroZeroPenalty > 0 ? `-${zeroZeroPenalty}` : '0'}</span></div>
				<div className='powerscore-breakdown-row powerscore-breakdown-row-penalty'><span>Clock stall penalty</span><span>{stallPenaltyPoints > 0 ? `-${stallPenaltyPoints}` : '0'}</span></div>
				<div className='powerscore-breakdown-row'><span>Favorite bonus</span><span>{favoriteBonus > 0 ? `+${favoriteBonus}` : '0'}</span></div>
				{favoriteBonus > 0 && <div className='powerscore-breakdown-note'>{favoriteTeamCount} favorite team{favoriteTeamCount === 1 ? '' : 's'} in matchup</div>}
				<div className='powerscore-breakdown-row powerscore-breakdown-row-total'><span>Final PowerScore</span><span>{totalLabel}</span></div>
				<div className='powerscore-breakdown-reason'>Headline reason: {reason}</div>
			</section>

			<ProTip context='detail' />

			{orderedPowerScoreHistory.length > 0
				? <GameDetailChart title='PowerScore over time' option={powerScoreOption} />
				: <div className='game-detail-empty-state'>PowerScore trend appears after a few refreshes.</div>}

			{orderedScoreHistory.length > 0
				? <GameDetailChart title='Game score over time' option={scoreTrendOption} legendItems={teamLegendItems} />
				: <div className='game-detail-empty-state'>Score trend appears after a few refreshes.</div>}

			{orderedPowerScoreHistory.length > 0
				? <GameDetailChart title='PowerScore components over time' option={componentOption} legendItems={componentLegendItems} />
				: <div className='game-detail-empty-state'>Component trend appears after a few refreshes.</div>}
		</div>
	);
};

export default gameDetailView;

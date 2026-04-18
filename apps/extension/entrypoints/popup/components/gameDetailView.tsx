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
import GameDetailChart from './gameDetailChart';
import {
	buildComponentContributionOption,
	buildPowerScoreOption,
	buildTeamScoreOption,
} from './gameDetailChartOptions';
import { formatClock, formatPeriod, gameMeta as GameMeta } from './gameCardShared';

interface gameDetailViewProps {
	game: Game;
	excitementResult: PowerScoreResult | undefined;
	scoreHistory: ScoreSnapshot[];
	powerScoreHistory: PowerScoreSnapshot[];
	onBack: () => void;
}

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
	const baseTotal = activePowerScore?.baseTotal ?? (activePowerScore?.stalled ? Math.round((closeness + lateGame + momentum + leadChanges + comeback) * stallPenaltyMultiplier) : (closeness + lateGame + momentum + leadChanges + comeback));
	const favoriteBonus = activePowerScore?.favoriteBonus ?? 0;
	const favoriteTeamCount = activePowerScore?.favoriteTeamCount ?? 0;
	const reason = activePowerScore?.reason ?? 'Best Available';
	const rawSubtotal = closeness + lateGame + momentum + leadChanges + comeback;
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

	return (
		<div className='popup-container'>
			<div className='game-detail-header'>
				<button type='button' className='btn btn-sm game-detail-back-button' onClick={onBack}>
					<i className='bi bi-arrow-left' />
					<span>Back</span>
				</button>
				<div className='game-detail-title'>Game Detail</div>
			</div>

			<div className='game-detail-matchup'>
				<div className='game-detail-team-wrap'>
					<div className='game-detail-team-abbrev'>{game.awayTeam.abbreviation}</div>
					<div className='game-detail-team-score'>{game.awayTeam.score}</div>
				</div>
				<div className='game-detail-center'>
					<div className='game-detail-versus'>at</div>
					<div className='game-detail-period'>
						{game.status === 'in' ? `${formatPeriod(game)} • ${formatClock(game.clockSeconds)}` : game.status === 'pre' ? 'Starts soon' : 'Final'}
					</div>
				</div>
				<div className='game-detail-team-wrap'>
					<div className='game-detail-team-abbrev'>{game.homeTeam.abbreviation}</div>
					<div className='game-detail-team-score'>{game.homeTeam.score}</div>
				</div>
			</div>
			<GameMeta game={game} />

			<section className='game-detail-formula-card'>
				<div className='game-detail-formula-title'>How PowerScore is calculated</div>
				<div className='game-detail-formula-text'>closeness + lateGame + momentum + leadChanges + comeback - penalties + favoriteBonus</div>
				<div className='game-detail-formula-row'><span>Closeness</span><span>{closeness} / {scoreMaxCloseness}</span></div>
				<div className='game-detail-formula-row'><span>Late-game pressure</span><span>{lateGame} / {scoreMaxLateGame}</span></div>
				<div className='game-detail-formula-row'><span>Momentum</span><span>{momentum} / {scoreMaxMomentum}</span></div>
				<div className='game-detail-formula-row'><span>Lead changes</span><span>{leadChanges} / {scoreMaxLeadChanges}</span></div>
				<div className='game-detail-formula-row'><span>Comeback</span><span>{comeback} / {scoreMaxComeback}</span></div>
				<div className='game-detail-formula-row game-detail-formula-row-subtotal'><span>Raw subtotal</span><span>{rawSubtotal} / {scoreMaxTotal}</span></div>
				<div className='game-detail-formula-row game-detail-formula-row-penalty'><span>0-0 penalty</span><span>{zeroZeroPenalty > 0 ? `-${zeroZeroPenalty}` : '0'}</span></div>
				<div className='game-detail-formula-row game-detail-formula-row-penalty'><span>Clock stall penalty</span><span>{stallPenaltyPoints > 0 ? `-${stallPenaltyPoints}` : '0'}</span></div>
				<div className='game-detail-formula-row'><span>Favorite bonus</span><span>{favoriteBonus > 0 ? `+${favoriteBonus}` : '0'}</span></div>
				{favoriteBonus > 0 && <div className='game-detail-formula-note'>{favoriteTeamCount} favorite team{favoriteTeamCount === 1 ? '' : 's'} in matchup</div>}
				<div className='game-detail-formula-row game-detail-formula-row-total'><span>Final PowerScore</span><span>{total}</span></div>
				<div className='game-detail-formula-note'>Headline reason: {reason}</div>
			</section>

			{orderedPowerScoreHistory.length > 1
				? <GameDetailChart title='PowerScore over time' option={powerScoreOption} />
				: <div className='game-detail-empty-state'>PowerScore trend appears after a few refreshes.</div>}

			{orderedScoreHistory.length > 1
				? <GameDetailChart title='Game score over time' option={scoreTrendOption} />
				: <div className='game-detail-empty-state'>Score trend appears after a few refreshes.</div>}

			{orderedPowerScoreHistory.length > 1
				? <GameDetailChart title='PowerScore components over time' option={componentOption} />
				: <div className='game-detail-empty-state'>Component trend appears after a few refreshes.</div>}
		</div>
	);
};

export default gameDetailView;

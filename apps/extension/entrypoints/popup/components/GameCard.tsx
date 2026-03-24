import { useState } from 'react';
import type { ExcitementResult, Game, Team } from '@madness/core/types';

interface Props {
	tabId: number;
	game: Game | undefined;
	excitementResult: ExcitementResult | undefined;
}

const LOGO_SIZE = 24;

const TeamLogo = ({ team }: { team: Team }) => {
	const [failed, setFailed] = useState(false);

	if (team.logo && !failed) {
		return (
			<img
				src={team.logo}
				alt={team.abbreviation}
				width={LOGO_SIZE}
				height={LOGO_SIZE}
				onError={() => setFailed(true)}
				style={{ objectFit: 'contain', flexShrink: 0 }}
			/>
		);
	}

	// Fallback: abbreviation initials in a small circle
	return (
		<div
			className='d-flex align-items-center justify-content-center bg-gray-700 rounded-circle text-gray-300'
			style={{ width: LOGO_SIZE, height: LOGO_SIZE, fontSize: '0.5rem', fontWeight: 700, flexShrink: 0 }}
		>
			{team.abbreviation.slice(0, 3)}
		</div>
	);
};

const formatStartTime = (iso: string): string => {
	const d = new Date(iso);
	return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const GameCard = ({ tabId, game, excitementResult }: Props) => {
	const excitement = excitementResult?.total ?? 0;
	const barWidth = Math.min(100, excitement);

	const barColor =
		excitement >= 70 ? 'bg-red-500' :
		excitement >= 40 ? 'bg-yellow-500' :
		'bg-gray-600';

	if (!game) {
		return (
			<div className='card bg-gray-800 border-gray-700 mb-2 p-2'>
				<span className='text-gray-500 small'>Tab #{tabId} — waiting for game data…</span>
			</div>
		);
	}

	// Upcoming game
	if (game.status === 'pre') {
		return (
			<div className='card bg-gray-800 border-gray-700 mb-2 p-2'>
				<div className='d-flex align-items-center gap-2'>
					<TeamLogo team={game.awayTeam} />
					<span className='small text-gray-400'>vs</span>
					<TeamLogo team={game.homeTeam} />
					<span className='small fw-semibold text-gray-100 flex-grow-1'>
						{game.awayTeam.abbreviation} vs {game.homeTeam.abbreviation}
					</span>
					<span className='small text-gray-400'>
						{game.startTime ? formatStartTime(game.startTime) : 'Soon'}
					</span>
				</div>
			</div>
		);
	}

	// Live game
	return (
		<div className='card bg-gray-800 border-gray-700 mb-2 p-2'>
			{/* Teams + score */}
			<div className='d-flex align-items-center gap-2'>
				<TeamLogo team={game.awayTeam} />
				<span className='small fw-semibold text-gray-100 flex-grow-1'>
					{game.awayTeam.abbreviation}
				</span>
				<span className='small text-gray-300 font-monospace'>
					{game.awayTeam.score} – {game.homeTeam.score}
				</span>
				<span className='small fw-semibold text-gray-100 text-end' style={{ minWidth: '2rem' }}>
					{game.homeTeam.abbreviation}
				</span>
				<TeamLogo team={game.homeTeam} />
			</div>

			{/* Clock + period */}
			<div className='text-gray-400 mt-1' style={{ fontSize: '0.7rem' }}>
				{game.period === 1 ? '1H' : game.period === 2 ? '2H' : `OT${game.period - 2}`}
				{' · '}{Math.floor(game.clockSeconds / 60)}:{String(game.clockSeconds % 60).padStart(2, '0')}
			</div>

			{/* Excitement bar */}
			<div className='mt-1 bg-gray-700 rounded' style={{ height: 4 }}>
				<div
					className={`rounded ${barColor} transition-all`}
					style={{ width: `${barWidth}%`, height: '100%' }}
				/>
			</div>

			{/* Reason label */}
			{excitementResult?.reason && (
				<div className='text-gray-400 mt-1' style={{ fontSize: '0.65rem' }}>
					{excitementResult.reason}
				</div>
			)}
		</div>
	);
};

export default GameCard;

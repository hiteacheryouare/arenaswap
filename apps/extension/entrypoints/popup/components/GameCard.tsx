import type { ExcitementResult, Game } from '@madness/core/types';

interface Props {
	tabId: number;
	game: Game | undefined;
	excitementResult: ExcitementResult | undefined;
}

const GameCard = ({ tabId, game, excitementResult }: Props) => {
	const excitement = excitementResult?.total ?? 0;
	const barWidth = Math.min(100, excitement);

	// Color the excitement bar: red for high, yellow for medium, gray for low
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

	return (
		<div className='card bg-gray-800 border-gray-700 mb-2 p-2'>
			{/* Teams + score */}
			<div className='d-flex justify-content-between align-items-center'>
				<span className='small fw-semibold text-gray-100'>
					{game.awayTeam.abbreviation} vs {game.homeTeam.abbreviation}
				</span>
				<span className='small text-gray-300 font-monospace'>
					{game.awayTeam.score} – {game.homeTeam.score}
				</span>
			</div>

			{/* Clock + period */}
			<div className='text-gray-400' style={{ fontSize: '0.7rem' }}>
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

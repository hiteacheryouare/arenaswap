import { scoreMaxTotal } from '@arenaswap/core/constants';
import type { RecapSession } from '@arenaswap/core/types';
import { leagueLabels } from '../popupHelpers';
import { powerScoreColor } from './gameCardShared';

interface recapGameCardsProps {
	session: RecapSession;
}

const formatWatchTime = (ms: number): string => {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) return `${seconds}s`;
	return `${minutes}m ${seconds}s`;
};

const recapGameCards = ({ session }: recapGameCardsProps) => {
	const games = Object.values(session.gameViews).sort((a, b) => b.watchedMs - a.watchedMs);

	if (games.length === 0) return null;

	return (
		<div className='mt-3'>
			<div className='fw-bold text-uppercase popup-section-label mb-1'>Games Watched</div>
			{games.map(record => {
				const psColor = powerScoreColor(record.peakPowerScore, scoreMaxTotal);
				return (
					<div key={record.gameId} className='game-card p-2 mb-2'>
						<div className='d-flex justify-content-between align-items-start'>
							<div>
								<div className='fw-semibold text-body' style={{ fontSize: '0.8rem' }}>
									{record.awayTeamAbbreviation} @ {record.homeTeamAbbreviation}
								</div>
								<div className='text-body-secondary' style={{ fontSize: '0.62rem' }}>
									{leagueLabels[record.league] ?? record.league.toUpperCase()}
								</div>
							</div>
							<div className='text-end'>
								<div className='fw-bold text-body' style={{ fontSize: '0.85rem' }}>
									{record.finalAwayScore} – {record.finalHomeScore}
								</div>
								<span
									className={`badge ${record.scoreFinal ? 'bg-secondary' : 'bg-success'}`}
									style={{ fontSize: '0.55rem' }}
								>
									{record.scoreFinal ? 'Final' : 'Live'}
								</span>
							</div>
						</div>
						<div className='d-flex justify-content-between align-items-center mt-1'>
							<span className='text-body-secondary' style={{ fontSize: '0.62rem' }}>
								<i className='bi bi-clock me-1' />
								{formatWatchTime(record.watchedMs)}
							</span>
							{record.peakPowerScore > 0 && (
								<span style={{ fontSize: '0.62rem', color: psColor, fontWeight: 600 }}>
									⚡ {Math.round(record.peakPowerScore)}
								</span>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default recapGameCards;

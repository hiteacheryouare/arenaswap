import { useState } from 'react';
import type { GameViewRecord, RecapSession } from '@arenaswap/core/types';
import { leagueLabels } from '../popupHelpers';

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

const teamSide = ({ logo, abbreviation, name }: { logo?: string; abbreviation: string; name: string }) => {
	const [logoFailed, setLogoFailed] = useState(false);
	return (
		<div className='d-flex flex-column align-items-center flex-grow-1 gap-1 text-center' style={{ minWidth: 0 }}>
			{logo && !logoFailed
				? (
					<img
						src={logo}
						alt={abbreviation}
						width={28}
						height={28}
						className='object-fit-contain flex-shrink-0'
						onError={() => setLogoFailed(true)}
					/>
				)
				: (
					<div
						className='d-flex align-items-center justify-content-center rounded-circle bg-secondary-subtle fw-bold text-body-secondary flex-shrink-0'
						style={{ width: 28, height: 28, fontSize: '0.5rem' }}
					>
						{abbreviation.slice(0, 3)}
					</div>
				)
			}
			<div className='fw-bold text-truncate w-100' style={{ fontSize: '0.72rem', color: '#212529' }}>{abbreviation}</div>
			<div className='text-truncate w-100' style={{ fontSize: '0.55rem', lineHeight: 1.2, color: '#6c757d' }}>{name}</div>
		</div>
	);
};

const recapGameCard = (record: GameViewRecord) => {
	const awayColor = record.awayTeamColor ?? '#dee2e6';
	const homeColor = record.homeTeamColor ?? '#dee2e6';
	return (
		<div
			key={record.gameId}
			className='game-card p-2 mb-2'
			style={{
				borderLeft: `4px solid ${awayColor}`,
				borderRight: `4px solid ${homeColor}`,
				background: `linear-gradient(to right, ${awayColor}18, ${homeColor}18), #ffffff`,
			}}
		>
			<div className='d-flex align-items-center gap-2'>
				{teamSide({ logo: record.awayTeamLogo, abbreviation: record.awayTeamAbbreviation, name: record.awayTeamName })}
				<div className='text-body-tertiary flex-shrink-0' style={{ fontSize: '0.6rem' }}>vs</div>
				{teamSide({ logo: record.homeTeamLogo, abbreviation: record.homeTeamAbbreviation, name: record.homeTeamName })}
			</div>
			<div className='text-center mt-2' style={{ fontSize: '0.6rem', color: '#6c757d' }}>
				<i className='bi bi-clock me-1' />
				{formatWatchTime(record.watchedMs)}
				<span className='mx-1 opacity-50'>·</span>
				{leagueLabels[record.league] ?? record.league.toUpperCase()}
			</div>
		</div>
	);
};

const recapGameCards = ({ session }: recapGameCardsProps) => {
	const games = Object.values(session.gameViews).sort((a, b) => b.watchedMs - a.watchedMs);
	if (games.length === 0) return null;
	return (
		<div className='mt-3'>
			<div className='fw-bold text-uppercase popup-section-label mb-1'>Games Watched</div>
			{games.map(record => recapGameCard(record))}
		</div>
	);
};

export default recapGameCards;

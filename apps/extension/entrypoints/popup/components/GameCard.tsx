import { useState } from 'react';
import type { ExcitementResult, Game, Team } from '@madness/core/types';

interface Props {
	tabId: number;
	game: Game | undefined;
	excitementResult: ExcitementResult | undefined;
}

const LOGO_SIZE = 22;

const excitementLevel = (score: number): string =>
	score >= 80 ? 'level-peak' :
	score >= 60 ? 'level-high' :
	score >= 30 ? 'level-mid' : 'level-low';

const formatPeriod = (period: number): string => {
	if (period === 1) return '1H';
	if (period === 2) return '2H';
	return `OT${period - 2}`;
};

const formatClock = (seconds: number): string => {
	const m = Math.floor(seconds / 60);
	const s = String(seconds % 60).padStart(2, '0');
	return `${m}:${s}`;
};

const formatStartTime = (iso: string): string => {
	const d = new Date(iso);
	return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

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

	return (
		<div
			style={{
				width: LOGO_SIZE,
				height: LOGO_SIZE,
				fontSize: '0.45rem',
				fontWeight: 700,
				flexShrink: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#30363d',
				borderRadius: '50%',
				color: '#8b949e',
			}}
		>
			{team.abbreviation.slice(0, 3)}
		</div>
	);
};

const GameCard = ({ tabId, game, excitementResult }: Props) => {
	if (!game) {
		return (
			<div className='game-card'>
				<span className='sensitivity-label'>Tab #{tabId} — waiting for game data…</span>
			</div>
		);
	}

	if (game.status === 'pre') {
		return (
			<div className='game-card game-card--pre'>
				<div className='game-card__teams'>
					<TeamLogo team={game.awayTeam} />
					<span className='game-card__team-name'>{game.awayTeam.abbreviation}</span>
					<span className='game-card__score' style={{ fontSize: '0.75rem', color: '#8b949e' }}>vs</span>
					<span className='game-card__team-name'>{game.homeTeam.abbreviation}</span>
					<TeamLogo team={game.homeTeam} />
					{game.startTime && (
						<span className='game-card__start-time ms-auto'>
							{formatStartTime(game.startTime)}
						</span>
					)}
				</div>
			</div>
		);
	}

	const excitement = excitementResult?.total ?? 0;
	const barWidth = Math.min(100, excitement);
	const isOt = game.period >= 3;

	return (
		<div className={`game-card${isOt ? ' is-ot' : ''}`}>
			{/* Header: live badge + clock */}
			<div className='game-card__header'>
				<div className='game-card__live-badge'>
					<span className='live-dot' />
					LIVE
				</div>
				<span className='game-card__clock'>
					{formatPeriod(game.period)} · {formatClock(game.clockSeconds)}
				</span>
			</div>

			{/* Teams + score */}
			<div className='game-card__teams'>
				<TeamLogo team={game.awayTeam} />
				<span className='game-card__team-name'>{game.awayTeam.abbreviation}</span>
				<span className='game-card__score'>
					{game.awayTeam.score} — {game.homeTeam.score}
				</span>
				<span className='game-card__team-name'>{game.homeTeam.abbreviation}</span>
				<TeamLogo team={game.homeTeam} />
			</div>

			{/* Excitement bar */}
			<div className='game-card__excitement'>
				<div className='excitement-track'>
					<div
						className={`excitement-fill ${excitementLevel(excitement)}`}
						style={{ width: `${barWidth}%` }}
					/>
				</div>
				{excitementResult?.reason && (
					<div className='excitement-reason'>{excitementResult.reason}</div>
				)}
			</div>
		</div>
	);
};

export default GameCard;

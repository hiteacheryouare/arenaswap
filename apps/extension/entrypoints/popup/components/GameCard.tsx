import { useState } from 'react';
import type { ExcitementResult, Game, Team } from '@arenaswap/core/types';

interface Props {
	game: Game | undefined;
	excitementResult: ExcitementResult | undefined;
	tabTitle?: string;
}

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

const LOGO_SIZE = 56;

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
				className='game-card__team-logo'
			/>
		);
	}

	return (
		<div className='game-card__team-logo-fallback'>
			{team.abbreviation.slice(0, 3)}
		</div>
	);
};

const TeamColumn = ({ team }: { team: Team }) => (
	<div className='game-card__team'>
		<TeamLogo team={team} />
		<span className='game-card__team-name'>{team.abbreviation}</span>
	</div>
);

const GameCard = ({ game, excitementResult, tabTitle }: Props) => {
	if (!game) return null;

	if (game.status === 'pre') {
		return (
			<div className='game-card game-card--pre'>
				<div className='game-card__teams'>
					<TeamColumn team={game.awayTeam} />
					<div className='game-card__scores'>
						<span style={{ fontSize: '0.8rem', color: '#8b949e' }}>vs</span>
						{game.startTime && (
							<span className='game-card__start-time'>
								{formatStartTime(game.startTime)}
							</span>
						)}
					</div>
					<TeamColumn team={game.homeTeam} />
				</div>
				{tabTitle && (
					<div className='game-card__tab-label'>
						Assigned to tab: {tabTitle}
					</div>
				)}
			</div>
		);
	}

	const REGULAR_PERIODS: Partial<Record<string, number>> = { nba: 4, nfl: 4, ncaaf: 4, nhl: 3, mlb: 9, ncaab: 2 };
	const isOt = game.period > (REGULAR_PERIODS[game.sport] ?? 2);

	return (
		<div className={`game-card${isOt ? ' is-ot' : ''}`}>
			{/* LIVE badge */}
			<div className='game-card__header'>
				<div className='game-card__live-badge'>
					<span className='live-dot' />
					LIVE
				</div>
			</div>

			{/* Teams + scores */}
			<div className='game-card__teams'>
				<TeamColumn team={game.awayTeam} />
				<div className='game-card__scores'>
					<div className='game-card__score-row'>
						<span className='game-card__score'>{game.awayTeam.score}</span>
						<span className='game-card__score'>{game.homeTeam.score}</span>
					</div>
					<span className='game-card__clock'>
						{formatClock(game.clockSeconds)}
					</span>
				</div>
				<TeamColumn team={game.homeTeam} />
			</div>

			{/* Tab assignment */}
			{tabTitle && (
				<div className='game-card__tab-label'>
					Assigned to tab: {tabTitle}
				</div>
			)}
		</div>
	);
};

export default GameCard;

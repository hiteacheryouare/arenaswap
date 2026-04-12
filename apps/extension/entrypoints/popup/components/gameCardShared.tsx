import { useState } from 'react';
import { leagueConfigMap, stallPenaltyMultiplier } from '@arenaswap/core/constants';
import type { Game, Team } from '@arenaswap/core/types';

const logoSize = 56;
export const stallPenaltyPercent = Math.round((1 - stallPenaltyMultiplier) * 100);

export const formatPeriod = (game: Game): string => {
	const config = leagueConfigMap[game.league];
	const regular = config.regularPeriods;
	const period = game.period;
	if (period > regular) {
		if (config.periodFormat === 'periods') return 'OT';
		return `OT${period - regular}`;
	}
	if (config.periodFormat === 'halves') return period === 1 ? '1H' : '2H';
	if (config.periodFormat === 'periods') return `P${period}`;
	if (config.periodFormat === 'innings') return `Inn ${period}`;
	return `Q${period}`;
};

export const formatClock = (seconds: number): string => {
	const minutes = Math.floor(seconds / 60);
	const remainder = String(seconds % 60).padStart(2, '0');
	return `${minutes}:${remainder}`;
};

export const formatStartDateTime = (iso: string): string => {
	const date = new Date(iso);
	const day = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
	const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	return `${day} • ${time}`;
};

export const powerScoreColor = (score: number, max: number): string => {
	const ratio = Math.min(score / max, 1);
	const red = Math.round(139 + (247 - 139) * ratio);
	const green = Math.round(148 + (92 - 148) * ratio);
	const blue = Math.round(158 + (3 - 158) * ratio);
	return `rgb(${red},${green},${blue})`;
};

const formatOverUnder = (overUnder: number): string => (
	Number.isInteger(overUnder) ? String(overUnder) : overUnder.toFixed(1)
);

const oddsSummary = (game: Game): string | null => {
	const parts: string[] = [];
	if (game.odds?.details) parts.push(game.odds.details);
	if (game.odds?.overUnder !== undefined) parts.push(`O/U ${formatOverUnder(game.odds.overUnder)}`);
	if (parts.length === 0) return null;
	return parts.join(' • ');
};

const TeamLogo = ({ team }: { team: Team }) => {
	const [failed, setFailed] = useState(false);
	if (team.logo && !failed) {
		return (
			<img
				src={team.logo}
				alt={team.abbreviation}
				width={logoSize}
				height={logoSize}
				onError={() => setFailed(true)}
				className='object-fit-contain flex-shrink-0'
			/>
		);
	}

	return (
		<div
			className='d-flex align-items-center justify-content-center bg-light rounded-circle flex-shrink-0 fw-bold text-body-secondary team-logo-fallback'
		>
			{team.abbreviation.slice(0, 3)}
		</div>
	);
};

export const teamColumn = ({
	team,
	isFavorited,
	onToggleFavoriteTeam,
}: {
	team: Team;
	isFavorited: boolean;
	onToggleFavoriteTeam: (teamId: string) => void;
}) => (
	<div className='d-flex flex-column align-items-center gap-1 team-column'>
		<TeamLogo team={team} />
		<span className='fw-bold text-center text-nowrap team-abbreviation'>
			{team.abbreviation}
		</span>
		<button
			type='button'
			className='btn btn-link p-0 border-0 lh-1'
			data-favorited={isFavorited}
			data-team-star='true'
			aria-label={isFavorited ? `Remove ${team.abbreviation} from favorites` : `Add ${team.abbreviation} to favorites`}
			title={isFavorited ? 'Favorited' : 'Add to favorites'}
			onClick={() => onToggleFavoriteTeam(team.id)}
		>
			<i className={`bi ${isFavorited ? 'bi-star-fill' : 'bi-star'}`} />
		</button>
	</div>
);

const OddsProvider = ({ game }: { game: Game }) => {
	const [failed, setFailed] = useState(false);
	const provider = game.odds?.provider;
	if (!provider?.name) return null;

	if (provider.logoUrl && !failed) {
		return (
			<span className='d-inline-flex align-items-center odds-provider-wrap'>
				<img
					src={provider.logoUrl}
					alt={provider.name}
					onError={() => setFailed(true)}
					height={12}
					className='odds-provider-logo'
				/>
			</span>
		);
	}

	return <span className='d-inline-flex align-items-center'>{provider.name}</span>;
};

export const gameMeta = ({ game }: { game: Game }) => {
	const networks = game.broadcasts?.join(' • ');
	const odds = oddsSummary(game);
	const hasOddsProvider = Boolean(game.odds?.provider?.name);
	const hasMeta = Boolean(game.venueName || networks || odds || hasOddsProvider);
	if (!hasMeta) return null;

	return (
		<div className='d-flex flex-column align-items-center mt-1 game-meta'>
			{game.venueName && <div className='text-center game-meta-venue'>{game.venueName}</div>}
			{networks && (
				<div className='text-center game-meta-networks'>
					Watch: {networks}
				</div>
			)}
			{odds && <div className='d-flex align-items-center justify-content-center game-meta-odds'><span>{odds}</span></div>}
			{hasOddsProvider && (
				<div className='d-flex align-items-center justify-content-center game-meta-provider'>
					<span>Odds provided by:</span>
					<OddsProvider game={game} />
				</div>
			)}
		</div>
	);
};

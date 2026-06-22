import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId, Team } from '@arenaswap/core/types';
import type { BettingDisplayPrefs } from './gameCardTypes';

const logoSize = 64;


export const formatPeriod = (game: Game): string => {
	const config = leagueConfigMap[game.league];
	if (!config) return `P${game.period}`;
	const regular = config.regularPeriods;
	const period = game.period;
	if (period > regular) {
		if (config.periodFormat === 'periods') return 'OT';
		if (config.periodFormat === 'innings') return `Inn ${period}`;
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

export const formatGameClock = (game: Game): string => {
	if (game.sportType === 'soccer') return `${Math.floor(game.clockSeconds / 60)}'`;
	return formatClock(game.clockSeconds);
};

export const formatStartDateTime = (iso: string): string => {
	const date = new Date(iso);
	const day = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
	const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	return `${day} • ${time}`;
};

// Gradient from muted slate rgb(139,148,158) at 0 to orange rgb(247,92,3) at max.
export const powerScoreColor = (score: number, max: number): string => {
	const ratio = Math.min(score / max, 1);
	const red = Math.round(139 + (247 - 139) * ratio);
	const green = Math.round(148 + (92 - 148) * ratio);
	const blue = Math.round(158 + (3 - 158) * ratio);
	return `rgb(${red},${green},${blue})`;
};

export const isInteractiveCardTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;
	return Boolean(target.closest('button, select, option, input, textarea, label, a, [data-card-control="true"]'));
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
				className='object-fit-contain shrink-0'
			/>
		);
	}

	return (
		<div
			className='d-flex align-items-center justify-content-center bg-light rounded-circle shrink-0 fw-bold text-body-secondary team-logo-fallback'
		>
			{(team.abbreviation ?? '?').slice(0, 3)}
		</div>
	);
};

export const buildGameCardStyle = (game: Game) => ({
	borderLeft: `5px solid ${game.awayTeam.color ?? '#dee2e6'}`,
	borderRight: `5px solid ${game.homeTeam.color ?? '#dee2e6'}`,
	background: `linear-gradient(to right, ${game.awayTeam.color ?? '#dee2e6'}28, ${game.homeTeam.color ?? '#dee2e6'}28), #ffffff`,
});

export const buildCardHandlers = (onOpenGameDetail: (gameId: string) => void, gameId: string) => ({
	onClick: (event: MouseEvent<HTMLDivElement>) => {
		if (isInteractiveCardTarget(event.target)) return;
		onOpenGameDetail(gameId);
	},
	onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (isInteractiveCardTarget(event.target)) return;
		event.preventDefault();
		onOpenGameDetail(gameId);
	},
});

export const TeamColumn = ({
	team,
	leagueId,
	isFavorited,
	onToggleFavoriteTeam,
}: {
	team: Team;
	leagueId: LeagueId;
	isFavorited: boolean;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
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
			onClick={() => onToggleFavoriteTeam(leagueId, team.id)}
		>
			<i className={`bi ${isFavorited ? 'bi-star-fill' : 'bi-star'}`} />
		</button>
	</div>
);

const OddsProvider = ({ game, dark }: { game: Game; dark?: boolean }) => {
	const [failed, setFailed] = useState(false);
	const provider = game.odds?.provider;
	if (!provider?.name) return null;
	const logoUrl = dark && provider.darkLogoUrl ? provider.darkLogoUrl : provider.logoUrl;
	if (logoUrl && !failed) {
		return (
			<span className='d-inline-flex align-items-center odds-provider-wrap'>
				<img
					src={logoUrl}
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

export const GameMeta = ({
	game,
	dark,
	bettingPrefs,
}: {
	game: Game;
	dark?: boolean;
	bettingPrefs?: BettingDisplayPrefs;
}) => {
	const networks = game.broadcasts?.join(' • ');
	const bettingOn = bettingPrefs?.bettingEnabled ?? false;
	const odds = bettingOn ? oddsSummary(game) : null;
	const hasOddsProvider = bettingOn && Boolean(game.odds?.provider?.name);
	const hasMeta = Boolean(game.venueName || networks || odds || hasOddsProvider);
	if (!hasMeta) return null;

	return (
		<div className='d-flex flex-column align-items-center mt-1 game-meta'>
			{game.venueName && <div className='text-center game-meta-venue'>{game.venueName}</div>}
			{networks && (
				<div className='text-center game-meta-networks'>
					<span className='font-bold'>Watch:</span> {networks}
				</div>
			)}
			{odds && <div className='d-flex align-items-center justify-content-center game-meta-odds'><span>{odds}</span></div>}
			{hasOddsProvider && (
				<div className='d-flex align-items-center justify-content-center game-meta-provider'>
					<span>Odds provided by:</span>
					<OddsProvider game={game} dark={dark} />
				</div>
			)}
		</div>
	);
};

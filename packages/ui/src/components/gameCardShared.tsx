import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId, Team } from '@arenaswap/core/types';
import type { BettingDisplayPrefs } from './gameCardTypes';
import { resolveTeamColorPair } from './colorUtils';
import { useT } from './i18nContext';

const logoSize = 64;


export const formatPeriod = (game: Game): string => {
	const config = leagueConfigMap[game.league];
	if (!config) return `P${game.period}`;
	const regular = config.regularPeriods;
	const period = game.period;
	if (period > regular) {
		if (config.periodFormat === 'periods') return 'OT';
		if (config.periodFormat === 'innings') return `Inn ${period}`;
		// Soccer plays two extra-time halves (periods 3 and 4) and then a shootout (period 5), so
		// "OT1/OT2/OT3" is the wrong vocabulary and flatly wrong for the shootout. Keyed on
		// sportType, not periodFormat, so NCAA basketball's halves keep their OT numbering.
		if (game.sportType === 'soccer') {
			const extraTimeHalf = period - regular;
			return extraTimeHalf <= 2 ? `ET${extraTimeHalf}` : 'PENS';
		}
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
	// The failed URL rather than a boolean, so a changed logo retries: cards are reused across
	// polls, and a transient bad URL would otherwise stay hidden forever.
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	if (team.logo && failedSrc !== team.logo) {
		return (
			<img
				src={team.logo}
				alt={team.abbreviation}
				width={logoSize}
				height={logoSize}
				onError={() => setFailedSrc(team.logo ?? null)}
				className='object-fit-contain flex-shrink-0'
			/>
		);
	}

	return (
		<div
			className='d-flex align-items-center justify-content-center bg-light rounded-circle flex-shrink-0 fw-bold text-body-secondary team-logo-fallback'
		>
			{(team.abbreviation || '?').slice(0, 3)}
		</div>
	);
};

export const buildGameCardStyle = (game: Game) => {
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#dee2e6', '#dee2e6');
	return {
		borderLeft: `5px solid ${awayColor}`,
		borderRight: `5px solid ${homeColor}`,
		background: `linear-gradient(to right, ${awayColor}28, ${homeColor}28), #ffffff`,
	};
};

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
}) => {
	const t = useT();
	return (
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
				aria-label={isFavorited ? t('gameCard.removeFromFavorites', { team: team.abbreviation }) : t('gameCard.addToFavorites', { team: team.abbreviation })}
				title={isFavorited ? t('gameCard.favorited') : t('gameCard.addToFavoritesShort')}
				onClick={() => onToggleFavoriteTeam(leagueId, team.id)}
			>
				<i className={`bi ${isFavorited ? 'bi-star-fill' : 'bi-star'}`} />
			</button>
		</div>
	);
};

const OddsProvider = ({ game, dark }: { game: Game; dark?: boolean }) => {
	// As above — the failed URL, so a changed provider logo retries.
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const provider = game.odds?.provider;
	if (!provider?.name) return null;
	const logoUrl = dark && provider.darkLogoUrl ? provider.darkLogoUrl : provider.logoUrl;
	if (logoUrl && failedSrc !== logoUrl) {
		return (
			<span className='d-inline-flex align-items-center odds-provider-wrap'>
				<img
					src={logoUrl}
					alt={provider.name}
					onError={() => setFailedSrc(logoUrl)}
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
	hideBroadcasts,
	hideVenue,
}: {
	game: Game;
	dark?: boolean;
	bettingPrefs?: BettingDisplayPrefs;
	hideBroadcasts?: boolean;
	hideVenue?: boolean;
}) => {
	const t = useT();
	const networks = hideBroadcasts ? undefined : game.broadcasts?.join(' • ');
	const venueName = hideVenue ? undefined : game.venueName;
	const bettingOn = bettingPrefs?.bettingEnabled ?? false;
	const odds = bettingOn ? oddsSummary(game) : null;
	const hasOddsProvider = bettingOn && Boolean(game.odds?.provider?.name);
	const hasMeta = Boolean(venueName || networks || odds || hasOddsProvider);
	if (!hasMeta) return null;

	return (
		<div className='d-flex flex-column align-items-center game-meta'>
			{venueName && <div className='text-center game-meta-venue'>{venueName}</div>}
			{networks && (
				<div className='text-center game-meta-networks'>
					<span className='font-bold'>{t('gameCard.watchLabel')}</span> {networks}
				</div>
			)}
			{odds && <div className='d-flex align-items-center justify-content-center game-meta-odds'><span>{odds}</span></div>}
			{hasOddsProvider && (
				<div className='d-flex align-items-center justify-content-center game-meta-provider'>
					<span>{t('gameCard.oddsProvidedBy')}</span>
					<OddsProvider game={game} dark={dark} />
				</div>
			)}
		</div>
	);
};

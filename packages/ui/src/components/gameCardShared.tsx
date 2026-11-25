import type { ReactNode } from 'react';
import { useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { isHomeFirst, isPlaceholderTeam, leagueConfigMap, resolveConferenceCrest } from '@arenaswap/core/constants';
import Crest from './crest';
import type { Game, LeagueId, Team } from '@arenaswap/core/types';
import type { BettingDisplayPrefs } from './gameCardTypes';
import { matchupSurface, resolveTeamColorPair } from '@arenaswap/chromatic';
import OnColorCrest from './onColorCrest';
import HoverTooltip from './hoverTooltip';
import NetworkList from './networkList';
import { useDisplayLocale, useT } from './i18nContext';
import type { Translator } from './i18nContext';
import { formatBreak, formatClock, formatGameClock, formatPeriod, isHalftime } from './gameFormat';
import TimeoutDots from './timeoutDots';

export { formatBreak, formatClock, formatGameClock, formatPeriod, isHalftime };

export const formatStartTime = (iso: string, locale?: string): string => (
	new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
);

const dayFormat: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

export const formatStartDay = (iso: string, locale?: string): string => new Date(iso).toLocaleDateString(locale, dayFormat);

export const formatStartDateTime = (iso: string, locale?: string): string => `${formatStartDay(iso, locale)} • ${formatStartTime(iso, locale)}`;

export const formatCalendarDay = (day: string, locale?: string): string => {
	const [year, month, date] = day.split('-').map(Number);
	return new Date(year!, month! - 1, date).toLocaleDateString(locale, dayFormat);
};

// Only baseball finishes a suspended game on a later day; anywhere else it is a feed left stuck on live.
const resumedAfterMs = 12 * 60 * 60 * 1000;
export const isResumedGame = (game: Pick<Game, 'status' | 'startTime' | 'league'>, now: number = Date.now()): boolean => {
	if (game.status !== 'in' || !game.startTime || leagueConfigMap[game.league]?.periodFormat !== 'innings') return false;
	const startMs = new Date(game.startTime).getTime();
	return Number.isFinite(startMs) && now - startMs > resumedAfterMs;
};

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

export const oddsSummary = (game: Game): string | null => {
	const parts: string[] = [];
	if (game.odds?.details) parts.push(game.odds.details);
	if (game.odds?.overUnder !== undefined) parts.push(`O/U ${formatOverUnder(game.odds.overUnder)}`);
	if (parts.length === 0) return null;
	return parts.join(' • ');
};

const missingTeamColor = '#30363d';

export interface gameCardSurface {
	style: CSSProperties;
	awayColor: string;
	homeColor: string;
	leftColor: string;
	rightColor: string;
}

export const teamsInOrder = (game: Pick<Game, 'league' | 'sportType' | 'awayTeam' | 'homeTeam'>): [Team, Team] => (
	isHomeFirst(game) ? [game.homeTeam, game.awayTeam] : [game.awayTeam, game.homeTeam]
);

const inkShadow = (ink: string): string => (ink === '#ffffff' ? '0 1px 2px rgba(3, 7, 12, 0.45)' : 'none');

export const matchupSurfaceStyle = (leftColor: string, rightColor: string, delayed = false): CSSProperties => {
	const { backgroundImage, inks } = matchupSurface(leftColor, rightColor, delayed);
	return {
		backgroundImage,
		'--matchup-ink-left': inks.left,
		'--matchup-ink-right': inks.right,
		'--matchup-ink-center': inks.center,
		'--matchup-shadow-left': inkShadow(inks.left),
		'--matchup-shadow-right': inkShadow(inks.right),
		'--matchup-shadow-center': inkShadow(inks.center),
	} as CSSProperties;
};

export const buildGameCardSurface = (game: Game, delayed = false): gameCardSurface => {
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, missingTeamColor, missingTeamColor);
	const [leftColor, rightColor] = isHomeFirst(game) ? [homeColor, awayColor] : [awayColor, homeColor];
	return { style: matchupSurfaceStyle(leftColor, rightColor, delayed), awayColor, homeColor, leftColor, rightColor };
};

export const buildCardShellProps = (game: Game, t: Translator, onOpenGameDetail: (gameId: string) => void, interactive: boolean) => ({
	role: 'group' as const,
	'aria-label': `${game.awayTeam.abbreviation} ${t('gameCard.vs')} ${game.homeTeam.abbreviation}`,
	onClick: interactive
		? (event: MouseEvent<HTMLDivElement>) => {
			if (isInteractiveCardTarget(event.target)) return;
			onOpenGameDetail(game.id);
		}
		: undefined,
});

export const CardDetailsButton = ({ game, onOpenGameDetail }: { game: Game; onOpenGameDetail: (gameId: string) => void }) => {
	const t = useT();
	return (
		<button type='button' className='game-card-details-button' onClick={() => onOpenGameDetail(game.id)}>
			<span className='visually-hidden'>
				{t('gameCard.openDetails', { away: game.awayTeam.abbreviation, home: game.homeTeam.abbreviation })}
			</span>
		</button>
	);
};

export const TeamColumn = ({
	team,
	leagueId,
	isFavorited,
	onToggleFavoriteTeam,
	side,
	surface,
	timeoutsMax,
	interactive = true,
	seeded = false,
}: {
	team: Team;
	leagueId: LeagueId;
	isFavorited: boolean;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	side: 'away' | 'home';
	surface?: string;
	timeoutsMax?: number;
	interactive?: boolean;
	seeded?: boolean;
}) => {
	const t = useT();
	const placeholder = isPlaceholderTeam(team);
	return (
		<div className={`d-flex flex-column align-items-center gap-1 team-column is-${side}`}>
			<OnColorCrest team={team} surface={surface} className='team-crest' fallback={placeholder ? 'blank' : undefined} />
			<span className='fw-bold text-center text-nowrap team-abbreviation'>
				{team.rank !== undefined && (
					<span className='team-rank' title={seeded ? t('gameCard.teamSeed', { seed: team.rank }) : t('gameCard.teamRank', { rank: team.rank })}>
						{seeded ? team.rank : `#${team.rank}`}
					</span>
				)}
				{team.abbreviation}
			</span>
			{team.timeouts !== undefined && (
				<TimeoutDots remaining={team.timeouts} max={timeoutsMax} teamAbbreviation={team.abbreviation} />
			)}
			<button
				type='button'
				className={`btn btn-link p-0 border-0 lh-1${placeholder ? ' invisible' : ''}`}
				data-favorited={isFavorited}
				data-team-star='true'
				aria-label={isFavorited ? t('gameCard.removeFromFavorites', { team: team.abbreviation }) : t('gameCard.addToFavorites', { team: team.abbreviation })}
				title={isFavorited ? t('gameCard.favorited') : t('gameCard.addToFavoritesShort')}
				inert={!interactive || placeholder}
				onClick={() => onToggleFavoriteTeam(leagueId, team.id)}
			>
				<i className={`bi ${isFavorited ? 'bi-star-fill' : 'bi-star'}`} />
			</button>
		</div>
	);
};

export const OddsProvider = ({ game, dark }: { game: Game; dark?: boolean }) => {
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

const doubleheaderLabel = (game: Game, t: Translator): string | undefined => {
	if (!game.doubleheaderGame) return undefined;
	return t(game.isMakeup ? 'gameCard.doubleheaderMakeup' : 'gameCard.doubleheaderGame', { game: game.doubleheaderGame });
};

export const SeasonLabel = ({ game }: { game: Game }) => {
	const t = useT();
	const locale = useDisplayLocale();
	const label = game.postseasonLabel
		?? (game.isPreseason ? t(game.league === 'mlb' ? 'gameCard.springTraining' : 'gameCard.preseason') : undefined)
		?? (isResumedGame(game) ? t('gameCard.resumedFrom', { date: formatStartDay(game.startTime!, locale) }) : undefined)
		?? doubleheaderLabel(game, t);
	return label ? <span className='game-postseason-label'>{label}</span> : null;
};

export const ConferenceMark = ({ game }: { game: Game }) => {
	const [failedCrest, setFailedCrest] = useState<string>();
	const conference = game.conference;
	if (!conference || game.postseasonLabel) return null;
	const crestSrc = resolveConferenceCrest(conference.crestSlug, 'light').src;
	const crestShown = Boolean(crestSrc) && failedCrest !== crestSrc;
	return (
		<span className='d-inline-flex align-items-center text-nowrap game-card-conference'>
			{crestSrc && <Crest logo={crestSrc} abbreviation='' title={conference.shortName} className='game-card-conference-crest' fallback='none' loading='lazy' onFailed={() => setFailedCrest(crestSrc)} />}
			<span className={crestShown ? 'visually-hidden' : undefined}>{conference.shortName}</span>
		</span>
	);
};

export const CardStatusRow = ({ children, status, league, conference }: { children?: ReactNode; status?: ReactNode; league?: ReactNode; conference?: ReactNode }) => (
	<div className='d-flex align-items-center flex-wrap game-card-status-row mb-1'>
		{league || conference ? (
			<span className='d-flex align-items-center gap-3'>
				{league}
				{conference}
				{status}
			</span>
		) : status}
		{children}
	</div>
);

export const GameMeta = ({
	game,
	dark,
	bettingPrefs,
	hideBroadcasts,
	hideVenue,
	interactive = true,
}: {
	game: Game;
	dark?: boolean;
	bettingPrefs?: BettingDisplayPrefs;
	hideBroadcasts?: boolean;
	hideVenue?: boolean;
	interactive?: boolean;
}) => {
	const t = useT();
	const networks = hideBroadcasts ? undefined : game.broadcasts?.length;
	const venueName = hideVenue ? undefined : game.venueName;
	const venueCity = venueName && game.neutralSite ? game.venueLocation : undefined;
	const bettingOn = bettingPrefs?.bettingEnabled ?? false;
	const odds = bettingOn ? oddsSummary(game) : null;
	const hasOddsProvider = bettingOn && Boolean(game.odds?.provider?.name);
	const hasMeta = Boolean(venueName || networks || odds || hasOddsProvider);
	if (!hasMeta) return null;

	return (
		<div className='d-flex flex-column align-items-center game-meta'>
			{venueName && (
				<div className='text-center game-meta-venue'>
					{venueName}
					{venueCity && <span className='game-meta-venue-city'> · {venueCity}</span>}
				</div>
			)}
			{networks && (
				<div className='text-center game-meta-networks'>
					<span>{t('gameCard.watchLabel')}</span> <NetworkList game={game} surface={dark ? 'team' : 'light'} />
				</div>
			)}
			{(odds || hasOddsProvider) && (
				<div className='d-flex align-items-center justify-content-center game-meta-odds'>
					{odds && <span>{odds}</span>}
					{hasOddsProvider && (
						<HoverTooltip
							className='game-meta-attribution'
							inert={!interactive}
							text={`${t('gameCard.oddsProvidedBy')} ${game.odds!.provider!.name}`}
						>
							<OddsProvider game={game} dark={dark} />
						</HoverTooltip>
					)}
				</div>
			)}
		</div>
	);
};

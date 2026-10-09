import type { ReactNode } from 'react';
import { useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import type { Game, LeagueId, Team } from '@arenaswap/core/types';
import type { BettingDisplayPrefs } from './gameCardTypes';
import { matchupSurface, resolveTeamColorPair } from './colorUtils';
import OnColorCrest from './onColorCrest';
import HoverTooltip from './hoverTooltip';
import { useT } from './i18nContext';
import type { Translator } from './i18nContext';
import { formatClock, formatGameClock, formatPeriod, isHalftime } from './gameFormat';
import TimeoutDots from './timeoutDots';

// Re-exported so the card's existing callers keep one import site.
export { formatClock, formatGameClock, formatPeriod, isHalftime };


export const formatStartTime = (iso: string, locale?: string): string => (
	new Date(iso).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
);

export const formatStartDateTime = (iso: string, locale?: string): string => {
	const day = new Date(iso).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
	return `${day} • ${formatStartTime(iso, locale)}`;
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

export const oddsSummary = (game: Game): string | null => {
	const parts: string[] = [];
	if (game.odds?.details) parts.push(game.odds.details);
	if (game.odds?.overUnder !== undefined) parts.push(`O/U ${formatOverUnder(game.odds.overUnder)}`);
	if (parts.length === 0) return null;
	return parts.join(' • ');
};

// A team with no colour of its own sits on the popup's raised grey, which takes white ink.
const missingTeamColor = '#30363d';

export interface gameCardSurface {
	style: CSSProperties;
	awayColor: string;
	homeColor: string;
}

// White ink on a mid-tone — Carolina blue, a bright orange — is the case neither ink wins outright,
// and a soft shadow is what keeps its edges.
const inkShadow = (ink: string): string => (ink === '#ffffff' ? '0 1px 2px rgba(3, 7, 12, 0.45)' : 'none');

// The card's and the detail hero's surface as an inline style: the painted background, and the ink
// and shadow for each side as variables the stylesheet hangs every piece of text on.
export const matchupSurfaceStyle = (awayColor: string, homeColor: string, delayed = false): CSSProperties => {
	const { backgroundImage, inks } = matchupSurface(awayColor, homeColor, delayed);
	return {
		backgroundImage,
		'--matchup-ink-away': inks.away,
		'--matchup-ink-home': inks.home,
		'--matchup-ink-center': inks.center,
		'--matchup-shadow-away': inkShadow(inks.away),
		'--matchup-shadow-home': inkShadow(inks.home),
		'--matchup-shadow-center': inkShadow(inks.center),
	} as CSSProperties;
};

export const buildGameCardSurface = (game: Game, delayed = false): gameCardSurface => {
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, missingTeamColor, missingTeamColor);
	return { style: matchupSurfaceStyle(awayColor, homeColor, delayed), awayColor, homeColor };
};

// The league mark heads the away side, so it takes the logo drawn for that side's ink: the dark-ground
// one under white ink, and the light-ground one on a gold or a final card's light plate.
export const leagueMarkOnColor = (game: Game): boolean => {
	if (game.status === 'post') return false;
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, missingTeamColor, missingTeamColor);
	return matchupSurface(awayColor, homeColor, game.delayed === true).inks.away === '#ffffff';
};

// The card is a group, not a button, so the stars, the odds tooltip and the tab picker stay controls
// of their own. A click anywhere else on it still opens the game; the keyboard and screen readers
// get the same thing from CardDetailsButton.
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

// Visually hidden and first in the card, so it is the first stop in the tab order and the card's
// focus ring is drawn from it (see `.game-card-clickable` in _game-card.scss).
export const CardDetailsButton = ({ game, onOpenGameDetail }: { game: Game; onOpenGameDetail: (gameId: string) => void }) => {
	const t = useT();
	return (
		<button type='button' className='visually-hidden game-card-details-button' onClick={() => onOpenGameDetail(game.id)}>
			{t('gameCard.openDetails', { away: game.awayTeam.abbreviation, home: game.homeTeam.abbreviation })}
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
	interactive = true,
}: {
	team: Team;
	leagueId: LeagueId;
	isFavorited: boolean;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	side: 'away' | 'home';
	// The colour this side of the card is painted in, where it is painted in one.
	surface?: string;
	interactive?: boolean;
}) => {
	const t = useT();
	return (
		<div className={`d-flex flex-column align-items-center gap-1 team-column is-${side}`}>
			<OnColorCrest team={team} surface={surface} className='team-crest' />
			<span className='fw-bold text-center text-nowrap team-abbreviation'>
				{/* Smaller and greyed rather than same-size, so the tricode stays the thing you read
				    first. A ranked pair is the widest this column ever gets — see the layout spec. */}
				{team.rank !== undefined && (
					<span className='team-rank' title={t('gameCard.teamRank', { rank: team.rank })}>
						#{team.rank}
					</span>
				)}
				{team.abbreviation}
			</span>
			{team.timeouts !== undefined && (
				<TimeoutDots remaining={team.timeouts} teamAbbreviation={team.abbreviation} />
			)}
			<button
				type='button'
				className='btn btn-link p-0 border-0 lh-1'
				data-favorited={isFavorited}
				data-team-star='true'
				aria-label={isFavorited ? t('gameCard.removeFromFavorites', { team: team.abbreviation }) : t('gameCard.addToFavorites', { team: team.abbreviation })}
				title={isFavorited ? t('gameCard.favorited') : t('gameCard.addToFavoritesShort')}
				inert={!interactive}
				onClick={() => onToggleFavoriteTeam(leagueId, team.id)}
			>
				<i className={`bi ${isFavorited ? 'bi-star-fill' : 'bi-star'}`} />
			</button>
		</div>
	);
};

export const OddsProvider = ({ game, dark }: { game: Game; dark?: boolean }) => {
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

// ESPN's own name for the round, trimmed of the prefix that repeats the league and otherwise
// untouched — sponsors, casing and all. Deliberately not uppercased like the status beside it:
// uppercasing turns Cheez-It and AT&T into shouting, and the sponsor is most of the reason a bowl
// name is worth printing.
//
// Present on games that score nothing. A non-playoff bowl gets no boost and still gets its name,
// because the label and the boost answer different questions.
//
// A preseason game takes the same spot with our own word instead, since ESPN names no round for it.
export const SeasonLabel = ({ game }: { game: Game }) => {
	const t = useT();
	const label = game.postseasonLabel
		?? (game.isPreseason ? t(game.league === 'mlb' ? 'gameCard.springTraining' : 'gameCard.preseason') : undefined);
	return label ? <span className='game-postseason-label'>{label}</span> : null;
};

// The row every card puts its status on. The postseason label shares it, which costs no vertical
// space on a card that has none to spare — and when the label is too wide to share, the row wraps
// and it takes a full line to itself rather than being truncated. Two of the 389 real ESPN round
// names need that; nothing needs cutting.
export const CardStatusRow = ({ children, status, league }: { children?: ReactNode; status?: ReactNode; league?: ReactNode }) => (
	<div className='d-flex align-items-center flex-wrap game-card-status-row mb-1'>
		{league ? (
			<span className='d-flex align-items-center gap-2'>
				{league}
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
	const networks = hideBroadcasts ? undefined : game.broadcasts?.join(' • ');
	// The card names the building only. `venueLocation` is a detail-screen line — see GameInfoPanel
	// — because the answer a card exists to give is "should I switch to this", not "where is it".
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
					<span>{t('gameCard.watchLabel')}</span> {networks}
				</div>
			)}
			{(odds || hasOddsProvider) && (
				<div className='d-flex align-items-center justify-content-center game-meta-odds'>
					{odds && <span>{odds}</span>}
					{hasOddsProvider && (
						// Attribution rides at the end of the line it describes rather than spending a
						// line of its own, as it already does in the detail panel; the tooltip carries
						// the wording, the sportsbook's own name and logo stay visible. The provider
						// goes into the tooltip too, because that string ends in the colon it used to
						// introduce a visible name with.
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

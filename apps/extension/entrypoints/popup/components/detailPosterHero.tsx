import { useState } from 'react';
import { i18n } from '#i18n';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { Game, LeagueId, Team } from '@arenaswap/core/types';
import SeriesDots from './seriesDots';
import StartCountdownDisplay from './startCountdownDisplay';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';
import type { SeriesInfo, TeamRecords } from './useSummaryData';

interface detailPosterHeroProps {
	game: Game;
	seriesInfo: SeriesInfo | null;
	records: TeamRecords;
	// Empty for a normal pre-game game; a postponement or delay is the one thing that has
	// something to say before the start time, so it is not dropped with the rest of the row.
	statusText: string;
	favoriteTeamIds: ReadonlySet<string>;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
}

// The crest sits on a white disc tinted with its own team colour rather than on the poster
// itself: a navy logo on a navy half is invisible, and every league has at least one.
// `28` is the alpha the matchup card already uses for its team-colour washes.
const crestBacking = (color: string): string => (
	/^#[\da-fA-F]{6}$/.test(color)
		? `linear-gradient(160deg, ${color}14, ${color}28), #ffffff`
		: '#ffffff'
);

const PosterTeam = ({
	team,
	color,
	record,
	leagueId,
	isFavorited,
	onToggleFavoriteTeam,
}: {
	team: Team;
	color: string;
	record: string | null;
	leagueId: LeagueId;
	isFavorited: boolean;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
}) => {
	const [logoFailed, setLogoFailed] = useState(false);

	return (
		<div className='gd-poster-team'>
			<div className='gd-poster-crest' style={{ background: crestBacking(color) }}>
				{team.logo && !logoFailed
					? (
						<img
							src={team.logo}
							alt={team.abbreviation}
							className='gd-poster-crest-logo'
							onError={() => setLogoFailed(true)}
						/>
					)
					: <span className='gd-poster-crest-abbr' style={{ color }}>{team.abbreviation}</span>}
			</div>
			<div className='gd-poster-name'>{team.name || team.abbreviation}</div>
			<div className='gd-poster-meta'>
				{record && <span className='gd-poster-record'>{record}</span>}
				<button
					type='button'
					className='btn btn-link p-0 border-0 lh-1 gd-poster-star'
					data-favorited={isFavorited}
					aria-label={isFavorited
						? i18n.t('gameCard.removeFromFavorites', { team: team.abbreviation })
						: i18n.t('gameCard.addToFavorites', { team: team.abbreviation })}
					title={isFavorited ? i18n.t('gameCard.favorited') : i18n.t('gameCard.addToFavoritesShort')}
					onClick={() => onToggleFavoriteTeam(leagueId, team.id)}
				>
					<i className={`bi ${isFavorited ? 'bi-star-fill' : 'bi-star'}`} />
				</button>
			</div>
		</div>
	);
};

const detailPosterHero = ({ game, seriesInfo, records, statusText, favoriteTeamIds, onToggleFavoriteTeam }: detailPosterHeroProps) => {
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');
	const awayFavorited = favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id));
	const homeFavorited = favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id));

	// A dark scrim over the team colours, not under them: it makes the white type readable
	// against a pale team colour without having to know which colours those are.
	const posterStyle = {
		backgroundImage:
			'linear-gradient(180deg, rgba(3, 7, 12, 0.18) 0%, rgba(3, 7, 12, 0.52) 100%), '
			+ `linear-gradient(to right, ${awayColor} 0%, ${awayColor} 38%, ${homeColor} 62%, ${homeColor} 100%)`,
	};

	return (
		<div className='gd-poster' style={posterStyle}>
			<div className='gd-poster-teams'>
				<PosterTeam
					team={game.awayTeam}
					color={awayColor}
					record={records.away}
					leagueId={game.league}
					isFavorited={awayFavorited}
					onToggleFavoriteTeam={onToggleFavoriteTeam}
				/>
				<div className='gd-poster-vs'>{i18n.t('gameCard.vs')}</div>
				<PosterTeam
					team={game.homeTeam}
					color={homeColor}
					record={records.home}
					leagueId={game.league}
					isFavorited={homeFavorited}
					onToggleFavoriteTeam={onToggleFavoriteTeam}
				/>
			</div>

			{statusText && <div className='gd-poster-status'>{statusText}</div>}

			<StartCountdownDisplay startTime={game.startTime} />

			{seriesInfo && <SeriesDots info={seriesInfo} game={game} />}
		</div>
	);
};

export default detailPosterHero;

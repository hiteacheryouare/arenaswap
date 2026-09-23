import { i18n } from '#i18n';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { Game, LeagueId, Team, TeamMonoMarks } from '@arenaswap/core/types';
import TeamCrest from '@arenaswap/ui/src/components/teamCrest';
import SeriesDots from './seriesDots';
import StartCountdownDisplay from './startCountdownDisplay';
import { underHeroScrim } from '@arenaswap/ui/src/components/colorUtils';
import type { CSSProperties } from 'react';
import type { MonoLogos, SeriesInfo, TeamRecords } from './useSummaryData';

interface detailPosterHeroProps {
	game: Game;
	seriesInfo: SeriesInfo | null;
	records: TeamRecords;
	monoLogos: MonoLogos;
	// Empty for a normal pre-game game; a postponement or delay is the one thing that has
	// something to say before the start time, so it is not dropped with the rest of the row.
	statusText: string;
	// The scrimmed band of the two team colours, built once in the view and handed to whichever
	// hero renders — a live game gets the same surface a pre-game one does.
	heroStyle: CSSProperties;
	awayColor: string;
	homeColor: string;
	favoriteTeamIds: ReadonlySet<string>;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
}

const PosterTeam = ({
	team,
	color,
	monoMarks,
	record,
	leagueId,
	isFavorited,
	onToggleFavoriteTeam,
}: {
	team: Team;
	color: string;
	// ESPN's monochrome marks. Reached for only when the colour artwork stops reading against this
	// team's own half of the poster, which is the hardest surface it faces: a navy crest on navy.
	monoMarks?: TeamMonoMarks | null;
	record: string | null;
	leagueId: LeagueId;
	isFavorited: boolean;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
}) => (
	<div className='gd-poster-team'>
		<TeamCrest
			logo={team.logo}
			monoMarks={monoMarks ?? undefined}
			abbreviation={team.abbreviation}
			background={underHeroScrim(color)}
			discClassName='gd-poster-crest'
			crestClassName='gd-poster-crest-logo'
		/>
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

const detailPosterHero = ({ game, seriesInfo, records, monoLogos, statusText, heroStyle, awayColor, homeColor, favoriteTeamIds, onToggleFavoriteTeam }: detailPosterHeroProps) => {
	const awayFavorited = favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id));
	const homeFavorited = favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id));

	return (
		<div className='gd-poster' style={heroStyle}>
			<div className='gd-poster-teams'>
				<PosterTeam
					team={game.awayTeam}
					color={awayColor}
					monoMarks={monoLogos.away}
					record={records.away}
					leagueId={game.league}
					isFavorited={awayFavorited}
					onToggleFavoriteTeam={onToggleFavoriteTeam}
				/>
				<div className='gd-poster-vs'>{i18n.t('gameCard.vs')}</div>
				<PosterTeam
					team={game.homeTeam}
					color={homeColor}
					monoMarks={monoLogos.home}
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

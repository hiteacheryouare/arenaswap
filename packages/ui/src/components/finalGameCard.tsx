import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import FlipScore from './flipScore';
import type { GameCardDisplayProps } from './gameCardTypes';
import { buildCardHandlers, CardStatusRow, GameMeta, PostseasonLabel, TeamColumn } from './gameCardShared';
import { useT } from './i18nContext';

// A finished game offers nothing to act on, so this card is the live one with every affordance
// taken away: no tab dropdown, no PowerScore bar, no clock, no broadcast line. What is left is the
// result, and the result is what the card is styled around.
const finalGameCard = ({ game, favoriteTeamIds, onToggleFavoriteTeam, onOpenGameDetail, bettingPrefs }: GameCardDisplayProps) => {
	const t = useT();
	if (!game) return null;

	const awayFavorited = favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id));
	const homeFavorited = favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id));
	const { onClick: onCardClick, onKeyDown: onCardKeyDown } = buildCardHandlers(onOpenGameDetail, game.id);

	const awayScore = game.awayTeam.score;
	const homeScore = game.homeTeam.score;
	// A shootout leaves the match level, so neither side wins the scoreline and the penalties line
	// below decides it instead.
	const shootout = game.awayTeam.shootoutScore !== undefined && game.homeTeam.shootoutScore !== undefined
		? t('gameCard.shootout', { away: game.awayTeam.shootoutScore, home: game.homeTeam.shootoutScore })
		: null;

	// Team colour on the scores was tried and rejected: on a plate this light it reads as two
	// unrelated inks rather than as one scoreline, and the winner's emphasis has to fight the
	// hue instead of being the only thing the eye picks up. The result is carried by weight and a
	// receded grey, which is what every scoreboard prints.
	const lost = (score: number, other: number) => !shootout && score < other;
	const scoreClass = (score: number, other: number) => (
		`lh-1 game-score-value ${lost(score, other) ? 'is-loser fw-semibold' : 'fw-bold'}`
	);

	// ESPN's own label, so a triple overtime reads Final/3OT and a shootout reads Final/SO — both
	// broadcast conventions, and the second one is not derivable from the period at all. The suffix
	// is a token rather than a word, so it needs no translating and the word before it already is.
	const statusLabel = game.finalPeriodSuffix
		? `${t('gameCard.final')}/${game.finalPeriodSuffix}`
		: t('gameCard.final');

	return (
		<div
			className='game-card game-card-clickable is-final'
			role='button'
			tabIndex={0}
			onClick={onCardClick}
			onKeyDown={onCardKeyDown}
			aria-label={t('gameCard.openDetails', { away: game.awayTeam.abbreviation, home: game.homeTeam.abbreviation })}
		>
			<CardStatusRow status={<span className='d-flex align-items-center gap-1 fw-bold text-uppercase final-status-label'>{statusLabel}</span>}>
				<PostseasonLabel game={game} />
			</CardStatusRow>

			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				<TeamColumn leagueId={game.league} team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
				<div className='d-flex flex-column align-items-center game-card-center'>
					<div className='d-flex align-items-center game-score-row'>
						<FlipScore value={awayScore} className={scoreClass(awayScore, homeScore)} />
						<span className='game-score-sep' aria-hidden='true' />
						<FlipScore value={homeScore} className={scoreClass(homeScore, awayScore)} />
					</div>
					{shootout && <span className='font-lekton game-shootout-score'>{shootout}</span>}
				</div>
				<TeamColumn leagueId={game.league} team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} />
			</div>

			{/* The broadcast is gone: a game you cannot watch any more has no channel worth naming.
			    The venue stays, because where it was played is still true. */}
			<GameMeta game={game} bettingPrefs={bettingPrefs} hideBroadcasts />
		</div>
	);
};

export default finalGameCard;

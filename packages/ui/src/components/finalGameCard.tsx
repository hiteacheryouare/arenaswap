import { createFavoriteTeamKey, isHomeFirst } from '@arenaswap/core/constants';
import FlipScore from './flipScore';
import type { GameCardDisplayProps } from './gameCardTypes';
import { buildCardShellProps, CardDetailsButton, CardStatusRow, ConferenceMark, formatCalendarDay, formatPeriod, GameMeta, SeasonLabel, TeamColumn } from './gameCardShared';
import { formatDisruption } from './gameFormat';
import { useDisplayLocale, useT } from './i18nContext';

const finalGameCard = ({ game, favoriteTeamIds, onToggleFavoriteTeam, onOpenGameDetail, leagueSlot, interactive = true }: GameCardDisplayProps) => {
	const t = useT();
	const locale = useDisplayLocale();
	if (!game) return null;

	const awayFavorited = favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id));
	const homeFavorited = favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id));
	const shellProps = buildCardShellProps(game, t, onOpenGameDetail, interactive);

	const homeFirst = isHomeFirst(game);
	const [leftTeam, rightTeam] = homeFirst ? [game.homeTeam, game.awayTeam] : [game.awayTeam, game.homeTeam];
	const leftScore = leftTeam.score;
	const rightScore = rightTeam.score;
	const shootout = leftTeam.shootoutScore !== undefined && rightTeam.shootoutScore !== undefined
		? t('gameCard.shootout', { away: leftTeam.shootoutScore, home: rightTeam.shootoutScore })
		: null;

	const decidedByScore = !shootout && game.disruption !== 'suspended' && game.disruption !== 'forfeit';
	const lost = (score: number, other: number) => (game.disruption === 'forfeit' || (decidedByScore && score < other));
	const scoreClass = (score: number, other: number) => (
		`lh-1 game-score-value ${lost(score, other) ? 'is-loser fw-semibold' : 'fw-bold'}`
	);

	const finalLabel = game.finalPeriodSuffix
		? `${t('gameCard.final')}/${game.finalPeriodSuffix}`
		: t('gameCard.final');
	const statusLabel = formatDisruption(game, t) ?? finalLabel;
	const forfeitWinner = game.forfeitWinnerId === undefined
		? undefined
		: [game.awayTeam, game.homeTeam].find(team => team.id === game.forfeitWinnerId);

	const awayColumn = <TeamColumn leagueId={game.league} team={game.awayTeam} isFavorited={awayFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} side='away' interactive={interactive} />;
	const homeColumn = <TeamColumn leagueId={game.league} team={game.homeTeam} isFavorited={homeFavorited} onToggleFavoriteTeam={onToggleFavoriteTeam} side='home' interactive={interactive} />;

	return (
		<div
			className={`game-card${interactive ? ' game-card-clickable' : ' game-card-lift'} is-final`}
			{...shellProps}
		>
			{interactive && <CardDetailsButton game={game} onOpenGameDetail={onOpenGameDetail} />}
			<CardStatusRow league={leagueSlot} conference={<ConferenceMark game={game} />} status={<span className='d-flex align-items-center gap-1 fw-bold text-uppercase final-status-label'>{statusLabel}</span>}>
				<SeasonLabel game={game} />
			</CardStatusRow>

			<div className='d-flex align-items-center justify-content-center game-card-matchup'>
				{homeFirst ? homeColumn : awayColumn}
				<div className='d-flex flex-column align-items-center game-card-center'>
					{game.disruption === 'postponed' ? (
						<>
							<span className='pre-game-vs'>{t('gameCard.vs')}</span>
							{game.makeupDate && (
								<span className='text-center text-nowrap game-period'>{t('gameCard.makeupDate', { date: formatCalendarDay(game.makeupDate, locale) })}</span>
							)}
						</>
					) : (
						<div className='d-flex align-items-center game-score-row'>
							<FlipScore value={leftScore} className={scoreClass(leftScore, rightScore)} />
							<span className='game-score-sep' aria-hidden='true' />
							<FlipScore value={rightScore} className={scoreClass(rightScore, leftScore)} />
						</div>
					)}
					{shootout && <span className='game-shootout-score'>{shootout}</span>}
					{game.disruption === 'suspended' && <span className='game-period'>{formatPeriod(game, t)}</span>}
					{forfeitWinner && (
						<span className='text-center game-shootout-score'>{t('gameCard.forfeitWinner', { team: forfeitWinner.abbreviation })}</span>
					)}
				</div>
				{homeFirst ? awayColumn : homeColumn}
			</div>

			<GameMeta game={game} hideBroadcasts interactive={interactive} />
		</div>
	);
};

export default finalGameCard;

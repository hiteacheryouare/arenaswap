import { i18n } from '#i18n';
import type { ReactNode } from 'react';
import { createFavoriteTeamKey, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';
import { downDistanceLine } from '@arenaswap/ui/src/components/boardSituation';
import { formatStartTime } from '@arenaswap/ui/src/components/boardClock';
import Crest from '@arenaswap/ui/src/components/crest';
import GameStage from '@arenaswap/ui/src/components/gameStage';
import AtBatPanel from './atBatPanel';
import FootballFieldStrip from './footballFieldStrip';
import leagueShortName from './leagueShortName';
import SeriesDots, { seriesSports } from './seriesDots';
import StartCountdownDisplay from './startCountdownDisplay';
import type { MonoLogos, SeriesInfo, TeamRecords } from './useSummaryData';

interface detailHeroProps {
	game: Game;
	seriesInfo: SeriesInfo | null;
	records: TeamRecords;
	monoLogos: MonoLogos;
	// Which tab the game is on, when it has one: "Watching, Tab 2" or "Tab 3".
	label?: string;
	favoriteTeamIds: ReadonlySet<string>;
	// Absent where favourites can't be changed, which leaves the stars as marks rather than buttons.
	onToggleFavoriteTeam?: (leagueId: LeagueId, teamId: string) => void;
	dismiss: 'back' | 'close';
	onBack: () => void;
}

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// A game later today needs only its time. Anything further out names its day under the time, since
// nothing else on this screen says which day it is.
export const formatStartDay = (iso: string | undefined, now = new Date()): string | undefined => {
	if (!iso) return undefined;
	const start = new Date(iso);
	if (Number.isNaN(start.getTime()) || isSameDay(start, now)) return undefined;
	return start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const networksOf = (game: Game): string | undefined => {
	const networks = game.broadcasts?.slice(0, 2) ?? [];
	if (networks.length === 0) return undefined;
	return new Intl.ListFormat(undefined, { type: 'conjunction' }).format(networks);
};

const showsSeries = (info: SeriesInfo | null, game: Game): info is SeriesInfo => (
	info !== null && seriesSports.has(game.sportType) && (info.totalCompetitions ?? 0) >= 2
);

export const DetailHead = ({ game, dismiss, onBack }: Pick<detailHeroProps, 'game' | 'dismiss' | 'onBack'>) => (
	<div className='dt-head'>
		<button type='button' className='btn dt-back' onClick={onBack}>
			<i className={`bi ${dismiss === 'close' ? 'bi-x-lg' : 'bi-arrow-left'}`} aria-hidden='true' />
			<span>{i18n.t(dismiss === 'close' ? 'detail.close' : 'detail.back')}</span>
		</button>
		<span className='dt-league'>
			{/* The white disc is what every league mark was drawn for, so it takes the light artwork. */}
			<span className='dt-league-disc'>
				<Crest
					logo={resolveLeagueLogoUrl(game.league, undefined, 'light')}
					abbreviation={leagueShortName(game.league)}
					className='dt-league-logo'
					fallback='blank'
				/>
			</span>
			{leagueShortName(game.league)}
		</span>
	</div>
);

const detailHero = ({
	game,
	seriesInfo,
	records,
	monoLogos,
	label,
	favoriteTeamIds,
	onToggleFavoriteTeam,
	dismiss,
	onBack,
}: detailHeroProps) => {
	const isPre = game.status === 'pre';
	const isLive = game.status === 'in';
	const downDistance = isLive && game.sportType === 'football' ? downDistanceLine(game, i18n.t) : undefined;
	const showField = isLive && game.sportType === 'football' && (typeof game.yardLine === 'number' || downDistance !== undefined);
	const hasSituation = (isLive && Boolean(game.atBat)) || showField;

	const note: ReactNode[] = [];
	if (isPre && game.delayed === true) {
		note.push(<span key='delay' className='dt-note-delay'>{game.delayDescription ?? i18n.t('gameCard.delayFallback')}</span>);
	}
	if (isPre) note.push(<StartCountdownDisplay key='countdown' startTime={game.startTime} networks={networksOf(game)} />);
	if (showsSeries(seriesInfo, game)) note.push(<SeriesDots key='series' info={seriesInfo} game={game} />);

	const toggle = onToggleFavoriteTeam
		? (side: 'away' | 'home') => onToggleFavoriteTeam(game.league, (side === 'away' ? game.awayTeam : game.homeTeam).id)
		: undefined;

	return (
		<GameStage
			game={game}
			surface='paint'
			className='dt-hero'
			head={<DetailHead game={game} dismiss={dismiss} onBack={onBack} />}
			label={label}
			clock={isPre ? formatStartTime(game.startTime) || undefined : undefined}
			startNote={isPre ? formatStartDay(game.startTime) ?? null : null}
			names='name'
			records={records}
			monoMarks={monoLogos}
			favorites={{
				away: favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.awayTeam.id)),
				home: favoriteTeamIds.has(createFavoriteTeamKey(game.league, game.homeTeam.id)),
			}}
			onToggleFavorite={toggle}
			situation={hasSituation ? (
				<div className='dt-situation'>
					{isLive && <AtBatPanel game={game} />}
					{showField && <FootballFieldStrip game={game} monoMarks={monoLogos} />}
				</div>
			) : undefined}
			note={note.length > 0 ? note : undefined}
		/>
	);
};

export default detailHero;

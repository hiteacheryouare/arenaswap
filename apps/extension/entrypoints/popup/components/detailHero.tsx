import { i18n } from '#i18n';
import type { BasketballSituation } from '@arenaswap/sideline';
import { isHomeFirst } from '@arenaswap/core/constants';
import type { Game, Team } from '@arenaswap/core/types';
import { timeoutAllotment } from '@arenaswap/ui/src/components/timeoutDots';
import AtBatPanel from './atBatPanel';
import BaseDiamond from './baseDiamond';
import BsoIndicator from './bsoIndicator';
import DetailTeamPill from './detailTeamPill';
import FlipScore from './flipScore';
import FootballFieldStrip from './footballFieldStrip';
import { bonusKind, type GameStatus } from './gameSituation';
import GameStatusText from './gameStatusText';
import GoalScorers from './goalScorers';
import InningHalfIcon from './inningHalfIcon';
import PossessionArrow from './possessionArrow';
import SeriesDots from './seriesDots';
import { emptyTeamRecords, type MonoLogos, type SeriesInfo, type TeamRecords } from './useSummaryData';

interface detailHeroProps {
	game: Game;
	seriesInfo: SeriesInfo | null;
	records?: TeamRecords;
	monoLogos: MonoLogos;
	isDelayed: boolean;
	isInningSport: boolean;
	status: GameStatus;
	heroStyle: React.CSSProperties;
	awayColor: string;
	homeColor: string;
	basketballSituation?: BasketballSituation | null;
	possession?: 'home' | 'away';
}

const withTimeouts = (team: Team, timeoutsLeft: number | undefined): Team => (
	timeoutsLeft === undefined ? team : { ...team, timeouts: timeoutsLeft }
);

const detailHero = ({ game, seriesInfo, records = emptyTeamRecords, monoLogos, isDelayed, isInningSport, status, heroStyle, awayColor, homeColor, basketballSituation, possession }: detailHeroProps) => {
	const downDistanceLine = game.downDistance && game.fieldPosition
		? i18n.t('gameCard.downDistanceAt', { downDistance: game.downDistance, fieldPosition: game.fieldPosition })
		: game.downDistance;
	const showField = game.sportType === 'football' && game.status === 'in'
		&& (typeof game.yardLine === 'number' || downDistanceLine !== undefined);

	const liveBasketball = game.sportType === 'basketball' && game.status === 'in';
	const situation = liveBasketball ? basketballSituation : null;
	const timeoutMax = timeoutAllotment(game);
	const bonusOf = (side: 'home' | 'away') => (
		situation && game.intermission !== true ? bonusKind(situation[side], game.league) : undefined
	);
	const awayTeam = withTimeouts(game.awayTeam, situation?.away.timeoutsLeft);
	const homeTeam = withTimeouts(game.homeTeam, situation?.home.timeoutsLeft);

	const scoreClass = (score: number, other: number): string => (
		game.status === 'post' && !game.disruption && score < other
			? 'lh-1 game-detail-score-value is-loser fw-semibold'
			: 'lh-1 game-detail-score-value fw-bold'
	);

	const homeFirst = isHomeFirst(game);
	const [awayAt, homeAt] = homeFirst ? ['right', 'left'] as const : ['left', 'right'] as const;
	const awayPill = <DetailTeamPill team={awayTeam} position={awayAt} record={records.away} color={awayColor} timeoutMax={timeoutMax} bonus={bonusOf('away')} bonusSlot={Boolean(situation)} />;
	const homePill = <DetailTeamPill team={homeTeam} position={homeAt} record={records.home} color={homeColor} timeoutMax={timeoutMax} bonus={bonusOf('home')} bonusSlot={Boolean(situation)} />;
	const awayScore = <FlipScore value={game.awayTeam.score} className={scoreClass(game.awayTeam.score, game.homeTeam.score)} />;
	const homeScore = <FlipScore value={game.homeTeam.score} className={scoreClass(game.homeTeam.score, game.awayTeam.score)} />;
	const awayArrow = liveBasketball && <PossessionArrow side='away' position={awayAt} possession={possession} team={game.awayTeam} />;
	const homeArrow = liveBasketball && <PossessionArrow side='home' position={homeAt} possession={possession} team={game.homeTeam} />;

	return (
		<div className={`gd-poster game-detail-matchup gd-hero gd-hero-live${isDelayed ? ' is-delayed' : ''}`} style={heroStyle}>
			<div className='game-detail-teams-row'>
				{homeFirst ? homePill : awayPill}
				<div className='game-detail-center'>
					<div className='d-flex align-items-center game-detail-score-row'>
						{homeFirst ? homeScore : awayScore}
						{homeFirst ? homeArrow : awayArrow}
						{isInningSport && game.baseRunners
							? <BaseDiamond {...game.baseRunners} />
							: <span className='game-score-sep' aria-hidden='true' />}
						{homeFirst ? awayArrow : homeArrow}
						{homeFirst ? awayScore : homeScore}
					</div>
				</div>
				{homeFirst ? awayPill : homePill}
				{status.text && (
					<div className='game-detail-period'>
						{isInningSport && <InningHalfIcon topOfInning={game.topOfInning} />}<GameStatusText status={status} />
					</div>
				)}
			</div>

			<GoalScorers game={game} />

			{isInningSport && game.bso && (
				<div className='gd-bso-row'><BsoIndicator {...game.bso} /></div>
			)}

			<AtBatPanel game={game} />

			{showField && (
				<div className='gd-field-row'>
					{downDistanceLine && <div className='gd-field-caption'>{downDistanceLine}</div>}
					<FootballFieldStrip game={game} monoMarks={monoLogos} />
				</div>
			)}

			{seriesInfo && <SeriesDots info={seriesInfo} game={game} />}
		</div>
	);
};

export default detailHero;

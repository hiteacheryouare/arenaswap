import { i18n } from '#i18n';
import type { BasketballSituation } from '@arenaswap/core';
import type { Game, Team } from '@arenaswap/core/types';
import AtBatPanel from './atBatPanel';
import BaseDiamond from './baseDiamond';
import BsoIndicator from './bsoIndicator';
import DetailTeamPill from './detailTeamPill';
import FlipScore from './flipScore';
import FootballFieldStrip from './footballFieldStrip';
import { basketballTimeoutAllotment, bonusKind, type GameStatus } from './gameSituation';
import InningHalfIcon from './inningHalfIcon';
import PossessionArrow from './possessionArrow';
import SeriesDots from './seriesDots';
import StartCountdownDisplay from './startCountdownDisplay';
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
	const isPre = game.status === 'pre';
	// The list card carries this line itself; on the detail screen it is the field strip's caption,
	// and it is the only place the down, the distance and the yard marker appear as words.
	const downDistanceLine = game.downDistance && game.fieldPosition
		? i18n.t('gameCard.downDistanceAt', { downDistance: game.downDistance, fieldPosition: game.fieldPosition })
		: game.downDistance;
	const showField = game.sportType === 'football' && game.status === 'in'
		&& (typeof game.yardLine === 'number' || downDistanceLine !== undefined);

	const liveBasketball = game.sportType === 'basketball' && game.status === 'in';
	const situation = liveBasketball ? basketballSituation : null;
	const timeoutMax = situation ? basketballTimeoutAllotment(game.league) : undefined;
	// Between periods the fouls have already reset for the next one, so nobody is in the bonus.
	const bonusOf = (side: 'home' | 'away') => (
		situation && game.intermission !== true ? bonusKind(situation[side], game.league) : undefined
	);
	const awayTeam = withTimeouts(game.awayTeam, situation?.away.timeoutsLeft);
	const homeTeam = withTimeouts(game.homeTeam, situation?.home.timeoutsLeft);

	// Only once the game is over. During play a dimmed score would read as the team that is behind
	// rather than the team that lost, and it would flip back and forth on every basket. The weight
	// is a Bootstrap utility because `.fw-bold` is `!important` and beats a stylesheet rule here.
	const scoreClass = (score: number, other: number): string => (
		game.status === 'post' && score < other
			? 'lh-1 game-detail-score-value is-loser fw-semibold'
			: 'lh-1 game-detail-score-value fw-bold'
	);

	return (
		// `gd-poster` is the surface rather than the pre-game screen: the same scrimmed band of team
		// colour carries the live and final heroes now, so the three states read as one screen. The
		// white `.game-card` plate is gone with it, and `gd-hero-live` is what the stylesheet hangs
		// the re-toning on — every child of this hero was drawn for near-black ink on white.
		<div className={`gd-poster game-detail-matchup gd-hero gd-hero-live${isDelayed ? ' is-delayed' : ''}`} style={heroStyle}>
			<div className='game-detail-teams-row'>
				<DetailTeamPill team={awayTeam} side='away' record={records.away} color={awayColor} timeoutMax={timeoutMax} bonus={bonusOf('away')} bonusSlot={Boolean(situation)} />
				<div className='game-detail-center'>
					{isPre ? (
						<div className='gd-vs'>{i18n.t('gameCard.vs')}</div>
					) : (
						<div className='d-flex align-items-center game-detail-score-row'>
							<FlipScore value={game.awayTeam.score} className={scoreClass(game.awayTeam.score, game.homeTeam.score)} />
							{liveBasketball && <PossessionArrow side='away' possession={possession} team={game.awayTeam} />}
							{isInningSport && game.baseRunners
								? <BaseDiamond {...game.baseRunners} />
								// Without a divider two three-digit scores read as one number: "112108".
								: <span className='game-score-sep' aria-hidden='true' />}
							{liveBasketball && <PossessionArrow side='home' possession={possession} team={game.homeTeam} />}
							<FlipScore value={game.homeTeam.score} className={scoreClass(game.homeTeam.score, game.awayTeam.score)} />
						</div>
					)}
				</div>
				<DetailTeamPill team={homeTeam} side='home' record={records.home} color={homeColor} timeoutMax={timeoutMax} bonus={bonusOf('home')} bonusSlot={Boolean(situation)} />
				{status.text && (
					<div className={`game-detail-period${status.ticking ? ' is-ticking' : ''}`}>
						{isInningSport && <InningHalfIcon topOfInning={game.topOfInning} />}{status.text}
					</div>
				)}
			</div>

			{isInningSport && game.bso && (
				<div className='gd-bso-row'><BsoIndicator {...game.bso} /></div>
			)}

			{/* Directly under the count, because the count is the question this answers: who is
			    the game waiting on. Absent between innings, when ESPN drops the pair. */}
			<AtBatPanel game={game} />

			{showField && (
				<div className='gd-field-row'>
					{downDistanceLine && <div className='gd-field-caption'>{downDistanceLine}</div>}
					<FootballFieldStrip game={game} monoMarks={monoLogos} />
				</div>
			)}

			{isPre && <StartCountdownDisplay startTime={game.startTime} />}

			{seriesInfo && <SeriesDots info={seriesInfo} game={game} />}
		</div>
	);
};

export default detailHero;

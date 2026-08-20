import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import BaseDiamond from './baseDiamond';
import BsoIndicator from './bsoIndicator';
import DetailTeamPill from './detailTeamPill';
import FlipScore from './flipScore';
import InningHalfIcon from './inningHalfIcon';
import SeriesDots from './seriesDots';
import StartCountdownDisplay from './startCountdownDisplay';
import { emptyTeamRecords, type SeriesInfo, type TeamRecords } from './useSummaryData';

interface detailHeroProps {
	game: Game;
	seriesInfo: SeriesInfo | null;
	records?: TeamRecords;
	isDelayed: boolean;
	isInningSport: boolean;
	statusText: string;
	heroStyle: React.CSSProperties;
}

const detailHero = ({ game, seriesInfo, records = emptyTeamRecords, isDelayed, isInningSport, statusText, heroStyle }: detailHeroProps) => {
	const isPre = game.status === 'pre';

	return (
		<div className={`game-card game-detail-matchup gd-hero${isDelayed ? ' is-delayed' : ''}`} style={heroStyle}>
			<div className='game-detail-teams-row'>
				<DetailTeamPill team={game.awayTeam} side='away' record={records.away} />
				<div className='game-detail-center'>
					{isPre ? (
						<div className='gd-vs'>{i18n.t('gameCard.vs')}</div>
					) : (
						<div className='d-flex align-items-center game-detail-score-row'>
							<FlipScore value={game.awayTeam.score} className='fw-bold lh-1 game-detail-score-value' />
							{isInningSport && game.baseRunners
								? <BaseDiamond {...game.baseRunners} />
								// Without a divider two three-digit scores read as one number: "112108".
								: <span className='game-score-sep' aria-hidden='true' />}
							<FlipScore value={game.homeTeam.score} className='fw-bold lh-1 game-detail-score-value' />
						</div>
					)}
				</div>
				<DetailTeamPill team={game.homeTeam} side='home' record={records.home} />
				{statusText && (
					<div className='game-detail-period'>
						{isInningSport && <InningHalfIcon topOfInning={game.topOfInning} />}{statusText}
					</div>
				)}
			</div>

			{isInningSport && game.bso && (
				<div className='gd-bso-row'><BsoIndicator {...game.bso} /></div>
			)}

			{isPre && <StartCountdownDisplay startTime={game.startTime} />}

			{seriesInfo && <SeriesDots info={seriesInfo} game={game} />}
		</div>
	);
};

export default detailHero;

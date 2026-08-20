import { i18n } from '#i18n';
import type { Game, Team } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';

// Blank rather than lettered: the abbreviation is already the next element along. It still holds
// its box, because collapsing an 18px item drags the centred matchup off the card's axis.
const BarCrest = ({ team }: { team: Team }) => (
	<Crest logo={team.logo} abbreviation={team.abbreviation} className='gd-bar-logo' fallback='blank' />
);

interface detailStickyBarProps {
	game: Game;
	statusText: string;
	compact: boolean;
	onBack: () => void;
}

// The matchup is absolutely centred and the status pinned separately to the right. In one
// centred group a longer status string drags the score off the card's axis, and it drifts
// again every time the period changes.
const detailStickyBar = ({ game, statusText, compact, onBack }: detailStickyBarProps) => (
	<div className='game-detail-header'>
		<button type='button' className='btn btn-sm game-detail-back-button' onClick={onBack}>
			<i className='bi bi-arrow-left' aria-hidden='true' />
			<span>{i18n.t('detail.back')}</span>
		</button>
		<div className={`gd-bar-compact${compact ? ' is-visible' : ''}`} aria-hidden={!compact}>
			<BarCrest team={game.awayTeam} />
			<span className='gd-bar-abbrev'>{game.awayTeam.abbreviation}</span>
			<span className='gd-bar-score'>{game.awayTeam.score}</span>
			<span className='gd-bar-sep' aria-hidden='true' />
			<span className='gd-bar-score'>{game.homeTeam.score}</span>
			<span className='gd-bar-abbrev'>{game.homeTeam.abbreviation}</span>
			<BarCrest team={game.homeTeam} />
		</div>
		{statusText && (
			<span className={`gd-bar-status${compact ? ' is-visible' : ''}`} aria-hidden={!compact}>
				{statusText}
			</span>
		)}
	</div>
);

export default detailStickyBar;

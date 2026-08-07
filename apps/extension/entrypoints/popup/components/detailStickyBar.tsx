import { useState } from 'react';
import { i18n } from '#i18n';
import type { Game, Team } from '@arenaswap/core/types';

interface barCrestProps {
	team: Team;
}

// Falls back to nothing rather than the abbreviation, which is already the next element along.
const BarCrest = ({ team }: barCrestProps) => {
	const [logoFailed, setLogoFailed] = useState(false);
	if (!team.logo || logoFailed) return null;

	return (
		<img
			src={team.logo}
			alt=''
			aria-hidden='true'
			className='gd-bar-logo'
			onError={() => setLogoFailed(true)}
		/>
	);
};

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

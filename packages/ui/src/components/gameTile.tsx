import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game } from '@arenaswap/core/types';
import BoardCrest from './boardCrest';
import { resolveBoardClock, trailingSide } from './boardClock';
import FlipScore from './flipScore';
import { gameSurfaceStyle, resolveGameSurface } from './gameSurface';
import { useT } from './i18nContext';
import InningHalfIcon from './inningHalfIcon';

export interface gameTileProps {
	game: Game;
	power: number;
	trend?: number | null;
	tab?: ReactNode;
	favorites?: { away: boolean; home: boolean };
	watched?: boolean;
	interactive?: HTMLAttributes<HTMLElement>;
}

export const Trend = ({ value }: { value: number | null | undefined }) => {
	const t = useT();
	if (value === null || value === undefined) return <span className='as-trend' />;
	if (value === 0) return <span className='as-trend'>{t('board.steady')}</span>;
	const up = value > 0;
	return (
		<span className={`as-trend num ${up ? 'is-up' : 'is-down'}`}>
			<span aria-hidden='true'>{up ? '▲' : '▼'}</span> {Math.abs(value)}
			<span className='visually-hidden'> {t(up ? 'board.trendUp' : 'board.trendDown')}</span>
		</span>
	);
};

const GameTile = ({ game, power, trend, tab, favorites, watched, interactive }: gameTileProps) => {
	const t = useT();
	const surface = resolveGameSurface(game);
	const status = resolveBoardClock(game, t);
	const behind = trailingSide(game);
	const sides = [
		{ side: 'away' as const, team: game.awayTeam, color: surface.away, crest: surface.crestAway },
		{ side: 'home' as const, team: game.homeTeam, color: surface.home, crest: surface.crestHome },
	];
	return (
		<article
			className={`as-tile${watched ? ' is-watched' : ''}`}
			style={gameSurfaceStyle(surface) as CSSProperties}
			data-game={game.id}
			{...interactive}
		>
			<header className='as-tile-top'>
				<span className={`as-clock${status.word ? '' : ' num'}${status.delayed ? ' is-delayed' : ''}`}>
					{status.topOfInning !== undefined && <InningHalfIcon topOfInning={status.topOfInning} />}
					{status.text}
				</span>
				<span className='as-tile-tab'>{tab}</span>
			</header>
			<div className='as-tile-teams'>
				{sides.map(({ side, team, color, crest }) => (
					<span key={side} className='as-tile-team'>
						<BoardCrest team={team} size={24} surface={crest} color={color} />
						<b>
							{team.rank !== undefined && <span className='as-rank'>#{team.rank}</span>}
							{team.abbreviation}
							{favorites?.[side] && <i className='bi bi-star-fill as-star-mark' role='img' aria-label={t('gameCard.favorited')} />}
						</b>
						<FlipScore value={team.score} className={`as-score num${behind === side ? ' is-behind' : ''}`} />
					</span>
				))}
			</div>
			<footer className='as-tile-foot'>
				<Trend value={trend} />
				<strong className='as-tile-power num' aria-label={`${t('gameCard.powerScore')} ${power}`}>{power}</strong>
			</footer>
		</article>
	);
};

export default GameTile;

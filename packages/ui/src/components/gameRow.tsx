import type { HTMLAttributes, ReactNode } from 'react';
import type { Game } from '@arenaswap/core/types';
import BoardCrest from './boardCrest';
import { resolveBoardClock, trailingSide } from './boardClock';
import FlipScore from './flipScore';
import { resolveGameColors } from './gameSurface';
import { useT } from './i18nContext';
import InningHalfIcon from './inningHalfIcon';

export interface gameRowProps {
	game: Game;
	// The page colour the row sits on, as a hex, for the crests' legibility check.
	surface: string;
	power?: number | null;
	status?: ReactNode;
	clock?: ReactNode;
	favorites?: { away: boolean; home: boolean };
	watched?: boolean;
	quiet?: boolean;
	interactive?: HTMLAttributes<HTMLElement>;
}

const GameRow = ({ game, surface, power, status, clock, favorites, watched, quiet, interactive }: gameRowProps) => {
	const t = useT();
	const [awayColor, homeColor] = resolveGameColors(game);
	const clockState = resolveBoardClock(game, t);
	const behind = trailingSide(game);
	const sides = [
		{ side: 'away' as const, team: game.awayTeam, color: awayColor },
		{ side: 'home' as const, team: game.homeTeam, color: homeColor },
	];
	const classes = ['as-row', watched ? 'is-watched' : '', quiet ? 'is-quiet' : '', `is-${game.status}`].filter(Boolean).join(' ');
	return (
		<div className={classes} data-game={game.id} {...interactive}>
			<span className='as-row-teams'>
				{sides.map(({ side, team, color }) => (
					<span key={side} className='as-row-team'>
						<BoardCrest team={team} size={20} surface={surface} color={color} />
						<b>
							{team.rank !== undefined && <span className='as-rank'>#{team.rank}</span>}
							{team.abbreviation}
							{favorites?.[side] && <i className='bi bi-star-fill as-star-mark' role='img' aria-label={t('gameCard.favorited')} />}
						</b>
						{game.status !== 'pre' && (
							<FlipScore value={team.score} className={`as-score num${behind === side ? ' is-behind' : ''}`} />
						)}
					</span>
				))}
			</span>
			<span className='as-row-status'>
				<span className={`as-clock${clockState.word ? '' : ' num'}${clockState.delayed ? ' is-delayed' : ''}`}>
					{clock ?? (
						<>
							{clockState.topOfInning !== undefined && <InningHalfIcon topOfInning={clockState.topOfInning} />}
							{clockState.text}
						</>
					)}
				</span>
				{status}
			</span>
			<span className='as-row-power num'>{power ?? ''}</span>
		</div>
	);
};

export default GameRow;

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game, ResolvedTheme, TeamMonoMarks } from '@arenaswap/core/types';
import BoardCrest from './boardCrest';
import HeatBar from './heatBar';
import { resolveBoardClock, trailingSide } from './boardClock';
import FlipScore from './flipScore';
import { resolveRowSurface, rowSurfaceStyle } from './gameSurface';
import { useT } from './i18nContext';
import InningHalfIcon from './inningHalfIcon';

export interface gameRowProps {
	game: Game;
	theme: ResolvedTheme;
	power?: number | null;
	status?: ReactNode;
	clock?: ReactNode;
	favorites?: { away: boolean; home: boolean };
	monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null };
	watched?: boolean;
	quiet?: boolean;
	interactive?: HTMLAttributes<HTMLElement>;
}

const GameRow = ({ game, theme, power, status, clock, favorites, monoMarks, watched, quiet, interactive }: gameRowProps) => {
	const t = useT();
	const surface = resolveRowSurface(game, theme, quiet);
	const clockState = resolveBoardClock(game, t);
	const behind = trailingSide(game);
	const sides = [
		{ side: 'away' as const, team: game.awayTeam, color: surface.away, crest: surface.crestAway },
		{ side: 'home' as const, team: game.homeTeam, color: surface.home, crest: surface.crestHome },
	];
	const classes = ['as-row', watched ? 'is-watched' : '', quiet ? 'is-quiet' : '', `is-${game.status}`].filter(Boolean).join(' ');
	return (
		<div className={classes} style={rowSurfaceStyle(surface) as CSSProperties} data-game={game.id} {...interactive}>
			<span className='as-row-teams'>
				{sides.map(({ side, team, color, crest }) => (
					<span key={side} className='as-row-team'>
						<BoardCrest team={team} size={28} surface={crest} color={color} monoMarks={monoMarks?.[side]} />
						<b>
							{team.rank !== undefined && <span className='as-rank'>#{team.rank}</span>}
							{team.abbreviation}
							{favorites?.[side] && <i className='bi bi-star-fill as-star-mark' role='img' aria-label={t('gameCard.favorited')} />}
						</b>
						{game.status !== 'pre' && (
							<FlipScore value={team.score} className={`as-score${behind === side ? ' is-behind' : ''}`} />
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
			<span className='as-row-power'>
				{power ?? ''}
				{power !== undefined && power !== null && <HeatBar value={power} />}
			</span>
		</div>
	);
};

export default GameRow;

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game, ResolvedTheme, TeamMonoMarks } from '@arenaswap/core/types';
import BoardMatchup, { BoardTop } from './boardMatchup';
import { resolveBoardTone } from './boardClock';
import { roundLabel } from './boardSituation';
import { resolveRowSurface, rowSurfaceStyle } from './gameSurface';
import PowerLine from './powerLine';

export interface gameRowProps {
	game: Game;
	theme: ResolvedTheme;
	power?: number | null;
	trend?: number | null;
	tab?: ReactNode;
	clock?: ReactNode;
	favorites?: { away: boolean; home: boolean };
	monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null };
	watched?: boolean;
	quiet?: boolean;
	interactive?: HTMLAttributes<HTMLElement>;
}

const GameRow = ({ game, theme, power, trend, tab, clock, favorites, monoMarks, watched, quiet, interactive }: gameRowProps) => {
	const surface = resolveRowSurface(game, theme, quiet);
	const classes = ['as-row', watched ? 'is-watched' : '', quiet ? 'is-quiet' : '', `is-${game.status}`, `is-${resolveBoardTone(game)}`].filter(Boolean).join(' ');
	return (
		<div className={classes} style={rowSurfaceStyle(surface) as CSSProperties} data-game={game.id} {...interactive}>
			<BoardTop game={game} tab={tab} context={roundLabel(game)} />
			<BoardMatchup
				game={game}
				size='row'
				crests={{ away: surface.crestAway, home: surface.crestHome }}
				colors={{ away: surface.away, home: surface.home }}
				clock={clock}
				favorites={favorites}
				monoMarks={monoMarks}
			/>
			{power !== undefined && power !== null && <PowerLine value={power} trend={trend} />}
		</div>
	);
};

export default GameRow;

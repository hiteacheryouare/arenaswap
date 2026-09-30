import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game, TeamMonoMarks } from '@arenaswap/core/types';
import BoardMatchup, { BoardTop } from './boardMatchup';
import { resolveBoardTone } from './boardClock';
import { gameSurfaceStyle, resolveGameSurface } from './gameSurface';
import PowerLine from './powerLine';

export interface gameTileProps {
	game: Game;
	power: number;
	trend?: number | null;
	tab?: ReactNode;
	favorites?: { away: boolean; home: boolean };
	onToggleFavorite?: (side: 'away' | 'home') => void;
	monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null };
	watched?: boolean;
	interactive?: HTMLAttributes<HTMLElement>;
}

const GameTile = ({ game, power, trend, tab, favorites, onToggleFavorite, monoMarks, watched, interactive }: gameTileProps) => {
	const surface = resolveGameSurface(game);
	return (
		<article
			className={`as-tile is-${resolveBoardTone(game)}${watched ? ' is-watched' : ''}`}
			style={gameSurfaceStyle(surface) as CSSProperties}
			data-game={game.id}
			{...interactive}
		>
			<BoardTop game={game} tab={tab} />
			<BoardMatchup
				game={game}
				size='tile'
				crests={{ away: surface.crestAway, home: surface.crestHome }}
				colors={{ away: surface.away, home: surface.home }}
				favorites={favorites}
				onToggleFavorite={onToggleFavorite}
				monoMarks={monoMarks}
			/>
			<PowerLine value={power} trend={trend} />
		</article>
	);
};

export default GameTile;

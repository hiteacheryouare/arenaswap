import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game, TeamMonoMarks } from '@arenaswap/core/types';
import BoardMatchup, { BoardTop } from './boardMatchup';
import { resolveBoardTone } from './boardClock';
import { gamePlateStyle, resolveGamePlate } from './gameSurface';
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
	const plate = resolveGamePlate(game);
	return (
		<article
			className={`as-tile as-plate is-${game.status} is-${resolveBoardTone(game)}${watched ? ' is-watched' : ''}`}
			style={gamePlateStyle(plate) as CSSProperties}
			data-game={game.id}
			{...interactive}
		>
			<BoardTop game={game} />
			<BoardMatchup
				game={game}
				size='tile'
				crests={{ away: plate.crestAway, home: plate.crestHome }}
				colors={{ away: plate.away, home: plate.home }}
				favorites={favorites}
				onToggleFavorite={onToggleFavorite}
				monoMarks={monoMarks}
			/>
			<PowerLine value={power} trend={trend} />
			{tab && <div className='as-plate-tab'>{tab}</div>}
		</article>
	);
};

export default GameTile;

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game } from '@arenaswap/core/types';
import BoardMatchup, { BoardTop } from './boardMatchup';
import { resolveBoardTone } from './boardClock';
import { gamePlateStyle, resolveGamePlate } from './gameSurface';
import PowerLine from './powerLine';

export interface gameTileProps {
	game: Game;
	power: number;
	// Where it is and where to watch it.
	note?: ReactNode;
	tab?: ReactNode;
	favorites?: { away: boolean; home: boolean };
	onToggleFavorite?: (side: 'away' | 'home') => void;
	watched?: boolean;
	interactive?: HTMLAttributes<HTMLElement>;
}

const GameTile = ({ game, power, note, tab, favorites, onToggleFavorite, watched, interactive }: gameTileProps) => {
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
				plainCrests
				size='tile'
				crests={{ away: plate.crestAway, home: plate.crestHome }}
				colors={{ away: plate.away, home: plate.home }}
				favorites={favorites}
				onToggleFavorite={onToggleFavorite}
			/>
			{note && <div className='as-stage-note'>{note}</div>}
			<PowerLine value={power} />
			{tab && <div className='as-plate-tab'>{tab}</div>}
		</article>
	);
};

export default GameTile;

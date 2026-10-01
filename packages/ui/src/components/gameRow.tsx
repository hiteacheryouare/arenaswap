import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game, TeamMonoMarks } from '@arenaswap/core/types';
import BoardMatchup, { BoardTop } from './boardMatchup';
import { resolveBoardTone } from './boardClock';
import { roundLabel } from './boardSituation';
import { gamePlateStyle, resolveGamePlate } from './gameSurface';
import PowerLine from './powerLine';

export interface gameRowProps {
	game: Game;
	power?: number | null;
	trend?: number | null;
	tab?: ReactNode;
	clock?: ReactNode;
	favorites?: { away: boolean; home: boolean };
	monoMarks?: { away?: TeamMonoMarks | null; home?: TeamMonoMarks | null };
	watched?: boolean;
	interactive?: HTMLAttributes<HTMLElement>;
}

// A shorter v2 card: the status row, the teams beside their crests, the PowerScore and the picker.
const GameRow = ({ game, power, trend, tab, clock, favorites, monoMarks, watched, interactive }: gameRowProps) => {
	const plate = resolveGamePlate(game);
	const classes = ['as-row', 'as-plate', watched ? 'is-watched' : '', `is-${game.status}`, `is-${resolveBoardTone(game)}`].filter(Boolean).join(' ');
	return (
		<div className={classes} style={gamePlateStyle(plate) as CSSProperties} data-game={game.id} {...interactive}>
			<BoardTop game={game} context={roundLabel(game)} />
			<BoardMatchup
				game={game}
				size='row'
				crests={{ away: plate.crestAway, home: plate.crestHome }}
				colors={{ away: plate.away, home: plate.home }}
				clock={clock}
				favorites={favorites}
				monoMarks={monoMarks}
			/>
			{power !== undefined && power !== null && <PowerLine value={power} trend={trend} />}
			{tab && <div className='as-plate-tab'>{tab}</div>}
		</div>
	);
};

export default GameRow;

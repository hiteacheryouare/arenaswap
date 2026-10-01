import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game } from '@arenaswap/core/types';
import BoardMatchup, { BoardTop } from './boardMatchup';
import { resolveBoardTone } from './boardClock';
import { roundLabel } from './boardSituation';
import { gamePlateStyle, resolveGamePlate } from './gameSurface';
import PowerLine from './powerLine';
import type { temperatureDisplayUnit } from './weatherUtils';

export interface gameRowProps {
	game: Game;
	power?: number | null;
	// Where it is and where to watch it.
	note?: ReactNode;
	tab?: ReactNode;
	clock?: ReactNode;
	favorites?: { away: boolean; home: boolean };
	// Set to draw an upcoming game's forecast under its start time.
	temperatureUnit?: temperatureDisplayUnit;
	watched?: boolean;
	interactive?: HTMLAttributes<HTMLElement>;
}

// A shorter v2 card: the status row, the teams beside their crests, the PowerScore and the picker.
const GameRow = ({ game, power, note, tab, clock, favorites, temperatureUnit, watched, interactive }: gameRowProps) => {
	const plate = resolveGamePlate(game);
	const classes = ['as-row', 'as-plate', watched ? 'is-watched' : '', `is-${game.status}`, `is-${resolveBoardTone(game)}`].filter(Boolean).join(' ');
	return (
		<div className={classes} style={gamePlateStyle(plate) as CSSProperties} data-game={game.id} {...interactive}>
			<BoardTop game={game} context={roundLabel(game)} />
			<BoardMatchup
				game={game}
				plainCrests
				size='row'
				crests={{ away: plate.crestAway, home: plate.crestHome }}
				colors={{ away: plate.away, home: plate.home }}
				clock={clock}
				favorites={favorites}
				temperatureUnit={temperatureUnit}
			/>
			{note && <div className='as-stage-note'>{note}</div>}
			{power !== undefined && power !== null && <PowerLine value={power} />}
			{tab && <div className='as-plate-tab'>{tab}</div>}
		</div>
	);
};

export default GameRow;

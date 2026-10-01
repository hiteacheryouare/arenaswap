import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game } from '@arenaswap/core/types';
import BoardMatchup, { BoardTop, type matchupTeamOptions } from './boardMatchup';
import { resolveBoardTone } from './boardClock';
import { roundLabel } from './boardSituation';
import { gamePlateStyle, gameSurfaceStyle, resolveGamePlate, resolveGameSurface } from './gameSurface';
import PowerLine from './powerLine';

export interface gameStageProps extends matchupTeamOptions {
	game: Game;
	// The plate is the hottest game on the board. Paint is the detail view's hero, in the teams' own
	// colours under a veil.
	surface?: 'plate' | 'paint';
	// Along the bottom: the tab picker, or the line that says the popup is about to switch.
	tab?: ReactNode;
	// On the hero's status row, where the plate has its picker at the bottom instead.
	label?: ReactNode;
	clock?: ReactNode;
	startNote?: ReactNode;
	note?: ReactNode;
	// Under the matchup: the at-bat pair, the field.
	situation?: ReactNode;
	power?: number | null;
	head?: ReactNode;
	watched?: boolean;
	className?: string;
	interactive?: HTMLAttributes<HTMLElement>;
}

export const StageField = () => <div className='as-stage-field' aria-hidden='true' />;

const GameStage = ({ game, surface = 'plate', tab, label, clock, startNote, note, situation, power, head, watched, className, interactive, ...options }: gameStageProps) => {
	const paint = surface === 'paint';
	const painted = paint ? resolveGameSurface(game) : null;
	const palette = painted ?? resolveGamePlate(game);
	const style = painted ? gameSurfaceStyle(painted) : gamePlateStyle(palette);
	const classes = ['as-stage', paint ? 'is-paint' : 'as-plate', watched ? 'is-watched' : '', `is-${game.status}`, `is-${resolveBoardTone(game)}`, className ?? ''].filter(Boolean).join(' ');
	return (
		<article className={classes} style={style as CSSProperties} data-game={game.id} {...interactive}>
			{paint && <StageField />}
			{head}
			<BoardTop game={game} context={roundLabel(game)}>
				{label && <span className='as-top-tab'>{label}</span>}
			</BoardTop>
			<BoardMatchup
				game={game}
				size={paint ? 'hero' : 'stage'}
				plainCrests={!paint}
				crests={{ away: palette.crestAway, home: palette.crestHome }}
				colors={{ away: palette.away, home: palette.home }}
				clock={clock}
				startNote={startNote}
				timeouts
				{...options}
			/>
			{situation}
			{note && <div className='as-stage-note'>{note}</div>}
			{power !== undefined && power !== null && <PowerLine value={power} />}
			{tab && <div className='as-plate-tab'>{tab}</div>}
		</article>
	);
};

export default GameStage;

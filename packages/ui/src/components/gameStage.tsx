import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { Game } from '@arenaswap/core/types';
import BoardMatchup, { BoardTop, type matchupTeamOptions } from './boardMatchup';
import { resolveBoardTone } from './boardClock';
import { roundLabel } from './boardSituation';
import { gameSurfaceStyle, resolveGameSurface } from './gameSurface';
import HeatBar from './heatBar';

export interface gameStageProps extends matchupTeamOptions {
	game: Game;
	// The tab picker, or the line that says the popup is about to switch.
	label?: ReactNode;
	clock?: ReactNode;
	startNote?: ReactNode;
	note?: ReactNode;
	// Under the matchup: the count, the at-bat pair, the field.
	situation?: ReactNode;
	power?: { value: number; label: string } | null;
	head?: ReactNode;
	watched?: boolean;
	className?: string;
	interactive?: HTMLAttributes<HTMLElement>;
}

export const StageField = () => <div className='as-stage-field' aria-hidden='true' />;

const GameStage = ({ game, label, clock, startNote, note, situation, power, head, watched, className, interactive, ...options }: gameStageProps) => {
	const surface = resolveGameSurface(game);
	const classes = ['as-stage', watched ? 'is-watched' : '', `is-${game.status}`, `is-${resolveBoardTone(game)}`, className ?? ''].filter(Boolean).join(' ');
	return (
		<article
			className={classes}
			style={gameSurfaceStyle(surface) as CSSProperties}
			data-game={game.id}
			{...interactive}
		>
			<StageField />
			{head}
			<BoardTop game={game} tab={label} context={roundLabel(game)} />
			<BoardMatchup
				game={game}
				size='stage'
				crests={{ away: surface.crestAway, home: surface.crestHome }}
				colors={{ away: surface.away, home: surface.home }}
				clock={clock}
				startNote={startNote}
				timeouts
				{...options}
			/>
			{situation}
			{(note || power) && (
				<div className='as-stage-foot'>
					<div className='as-stage-note'>{note}</div>
					{power && (
						<span className='as-stage-power'>
							<strong>{power.value}</strong>
							<small>{power.label}</small>
							<HeatBar value={power.value} />
						</span>
					)}
				</div>
			)}
		</article>
	);
};

export default GameStage;

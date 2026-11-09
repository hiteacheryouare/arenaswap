import type { CSSProperties } from 'react';
import type { Game } from '@arenaswap/core/types';
import RevealCutCrest from './revealCutCrest';
import { revealSlamTypePx } from '../cardReveal';

interface revealTypeSlamProps {
	game: Game;
	awayColor: string;
	homeColor: string;
	width: number;
	height: number;
}

const typeStyle = (size: number) => ({ '--reveal-slam-size': `${size}px` }) as CSSProperties;

const RevealTypeSlam = ({ game, awayColor, homeColor, width, height }: revealTypeSlamProps) => {
	const sides = [['away', game.awayTeam], ['home', game.homeTeam]] as const;
	return (
		<div className='game-card-reveal-slam'>
			{sides.map(([side, team]) => (
				<span key={`half-${side}`} className={`game-card-reveal-slam-half is-${side}`}>
					<span className='game-card-reveal-slam-type' style={typeStyle(revealSlamTypePx(team.abbreviation, width * 0.42, height * 0.5))}>{team.abbreviation}</span>
				</span>
			))}
			{sides.map(([side, team]) => (
				<span key={`card-${side}`} className={`game-card-reveal-slam-card is-${side}`}>
					<span className='game-card-reveal-slam-type' style={typeStyle(revealSlamTypePx(team.abbreviation, width * 0.86, height * 0.74))}>{team.abbreviation}</span>
				</span>
			))}
			<RevealCutCrest team={game.awayTeam} surface={awayColor} side='away' />
			<RevealCutCrest team={game.homeTeam} surface={homeColor} side='home' />
		</div>
	);
};

export default RevealTypeSlam;

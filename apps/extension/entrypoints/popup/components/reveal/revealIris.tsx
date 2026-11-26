import type { Game } from '@arenaswap/core/types';
import RevealCutCrest from './revealCutCrest';

interface revealIrisProps {
	game: Game;
	awayColor: string;
	homeColor: string;
}

const RevealIris = ({ game, awayColor, homeColor }: revealIrisProps) => (
	<div className='game-card-reveal-iris'>
		{(['away', 'home'] as const).map(side => (
			<span key={side} className={`game-card-reveal-iris-half is-${side}`}>
				<span className='game-card-reveal-iris-bloom' />
				<span className='game-card-reveal-iris-hole' />
			</span>
		))}
		<RevealCutCrest team={game.awayTeam} surface={awayColor} side='away' />
		<RevealCutCrest team={game.homeTeam} surface={homeColor} side='home' />
	</div>
);

export default RevealIris;

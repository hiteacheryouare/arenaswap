import type { Game } from '@arenaswap/core/types';
import RevealCutCrest from './revealCutCrest';

interface revealHeadToHeadProps {
	game: Game;
	awayColor: string;
	homeColor: string;
}

const RevealHeadToHead = ({ game, awayColor, homeColor }: revealHeadToHeadProps) => (
	<div className='game-card-reveal-duel'>
		<span className='game-card-reveal-duel-slab is-away' />
		<span className='game-card-reveal-duel-slab is-home' />
		<RevealCutCrest team={game.awayTeam} surface={awayColor} side='away' />
		<RevealCutCrest team={game.homeTeam} surface={homeColor} side='home' />
	</div>
);

export default RevealHeadToHead;

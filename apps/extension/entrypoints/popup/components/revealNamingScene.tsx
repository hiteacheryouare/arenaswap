import type { Game } from '@arenaswap/core/types';
import RevealName from './revealName';

const namingBands = (['away', 'home'] as const).map(side => (
	<span key={side} className={`game-card-reveal-opening-band is-${side}`} />
));

const revealNamingScene = ({ game }: { game: Game }) => (
	<>
		{namingBands}
		<RevealName key={`away-${game.awayTeam.name}`} team={game.awayTeam} className='game-card-reveal-opening-name is-away' />
		<RevealName key={`home-${game.homeTeam.name}`} team={game.homeTeam} className='game-card-reveal-opening-name is-home' />
	</>
);

export default revealNamingScene;

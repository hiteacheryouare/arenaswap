import type { CSSProperties } from 'react';
import OnColorCrest from '@arenaswap/ui/src/components/onColorCrest';
import { buildGameCardSurface } from '@arenaswap/ui/src/components/gameCardShared';
import type { Game } from '@arenaswap/core/types';

const StreamView = ({ game, t, className = '', style }: { game: Game; t: number; className?: string; style?: CSSProperties }) => {
	const { awayColor, homeColor } = buildGameCardSurface(game);
	const drift = Math.sin(t * 0.45) * 8;
	return (
		<div className={`stream ${className}`} style={style}>
			<div className='stream-field' style={{ background: `linear-gradient(105deg, ${awayColor} 0%, ${awayColor} ${46 + drift * 0.3}%, ${homeColor} ${54 + drift * 0.3}%, ${homeColor} 100%)` }} />
			<div className='stream-crests'>
				<OnColorCrest team={game.awayTeam} surface={awayColor} className='stream-crest' fallback='blank' loading='eager' />
				<OnColorCrest team={game.homeTeam} surface={homeColor} className='stream-crest' fallback='blank' loading='eager' />
			</div>
		</div>
	);
};

export default StreamView;

export const ChannelView = ({ games, className = '', style }: { games: Game[]; className?: string; style?: CSSProperties }) => (
	<div className={`stream channel ${className}`} style={style}>
		<div className='channel-set' />
		<div className='channel-lower-third'>
			{games.map(game => (
				<span key={game.id} className='channel-score'>
					{game.awayTeam.abbreviation} <b>{game.awayTeam.score}</b> <span className='channel-score-divider' /> {game.homeTeam.abbreviation} <b>{game.homeTeam.score}</b>
				</span>
			))}
		</div>
	</div>
);

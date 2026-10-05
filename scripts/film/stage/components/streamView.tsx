import type { CSSProperties } from 'react';
import OnColorCrest from '../../../../packages/ui/src/components/onColorCrest';
import { buildGameCardSurface } from '../../../../packages/ui/src/components/gameCardShared';
import type { Game } from '../../../../packages/core/src/types';

// What plays in a tab. Not footage: the two teams' colours, split the way the popup's cards split
// them, with each side's dark-ground crest, and light drifting across the field so it reads as a
// picture that is moving rather than a still.
const StreamView = ({ game, t, flash = 0, className = '', style }: { game: Game; t: number; flash?: number; className?: string; style?: CSSProperties }) => {
	const { awayColor, homeColor } = buildGameCardSurface(game);
	const drift = Math.sin(t * 0.45) * 8;
	const sweep = ((t * 0.08) % 1) * 160 - 30;
	return (
		<div className={`stream ${className}`} style={style}>
			<div className='stream-field' style={{ background: `linear-gradient(105deg, ${awayColor} 0%, ${awayColor} ${46 + drift * 0.3}%, ${homeColor} ${54 + drift * 0.3}%, ${homeColor} 100%)` }} />
			<div className='stream-light' style={{ background: `radial-gradient(60% 90% at ${sweep}% 30%, rgba(255,255,255,0.14), transparent 70%)` }} />
			<div className='stream-crests'>
				<OnColorCrest team={game.awayTeam} surface={awayColor} className='stream-crest' fallback='blank' loading='eager' />
				<OnColorCrest team={game.homeTeam} surface={homeColor} className='stream-crest' fallback='blank' loading='eager' />
			</div>
			<div className='stream-vignette' />
			{flash > 0 && <div className='stream-flash' style={{ opacity: flash }} />}
		</div>
	);
};

export default StreamView;

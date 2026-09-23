import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import type { gameCardProps } from './gameCardTypes';
import LiveGameCard from './liveGameCard';
import PreGameCard from './preGameCard';

const gameCard = (props: gameCardProps) => {
	if (!props.game) return null;
	if (props.game.status === 'pre') return <PreGameCard {...props} />;
	// Straight out of the shared package rather than through a local wrapper: the wrapper the other
	// two have exists only to inject the tab dropdown, and a finished game has no tab to assign.
	if (props.game.status === 'post') return <FinalGameCard {...props} />;
	return <LiveGameCard {...props} />;
};

export default gameCard;

import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import type { gameCardProps } from './gameCardTypes';
import LiveGameCard from './liveGameCard';
import PreGameCard from './preGameCard';

const gameCard = (props: gameCardProps) => {
	if (!props.game) return null;
	if (props.game.status === 'pre') return <PreGameCard {...props} />;
	if (props.game.status === 'post') return <FinalGameCard {...props} />;
	return <LiveGameCard {...props} />;
};

export default gameCard;

import type { GameCardDisplayProps } from './gameCardTypes';
import FinalGameCard from './finalGameCard';
import LiveGameCard from './liveGameCard';
import PreGameCard from './preGameCard';

const gameCard = (props: GameCardDisplayProps) => {
	if (!props.game) return null;
	if (props.game.status === 'pre') return <PreGameCard {...props} />;
	if (props.game.status === 'post') return <FinalGameCard {...props} />;
	return <LiveGameCard {...props} />;
};

export default gameCard;

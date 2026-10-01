import type { ReactNode } from 'react';

const gameCard = ({ game, leagueSlot }: { game: { id: string }; leagueSlot?: ReactNode }) => <div data-testid={`game-card-${game.id}`}>{leagueSlot}</div>;
export default gameCard;

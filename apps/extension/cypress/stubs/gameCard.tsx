const gameCard = ({ game }: { game: { id: string } }) => <div data-testid={`game-card-${game.id}`} />;
export default gameCard;

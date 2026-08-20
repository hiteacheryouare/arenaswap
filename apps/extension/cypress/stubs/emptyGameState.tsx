const emptyGameState = ({
	noLeaguesSelected,
	noGames,
}: {
	noLeaguesSelected: boolean;
	noGames: boolean;
	onOpenSetup: () => void;
	onRefresh: () => void;
}) => (
	<>
		{noLeaguesSelected && <div data-testid='empty-no-leagues'>Choose leagues to get started</div>}
		{noGames && <div data-testid='empty-no-games'>No games right now</div>}
	</>
);
export default emptyGameState;

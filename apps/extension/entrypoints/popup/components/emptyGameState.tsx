interface emptyGameStateProps {
	noLeaguesSelected: boolean;
	noGames: boolean;
	onOpenSetup: () => void;
	onRefresh: () => void;
}

const emptyGameState = ({ noLeaguesSelected, noGames, onOpenSetup, onRefresh }: emptyGameStateProps) => {
	if (noLeaguesSelected) {
		return (
			<div className='text-center rounded mt-2 mb-3 p-3 popup-empty-leagues'>
				<h2 className='fw-bold text-white lh-sm mb-2 popup-empty-leagues-title'>Choose leagues to get started</h2>
				<p className='mb-2 lh-sm popup-empty-leagues-copy'>
					ArenaSwap needs at least one league selected before it can find games to swap between.
				</p>
				<button className='btn btn-primary btn-lg w-100' onClick={onOpenSetup}>Select Leagues in Settings</button>
			</div>
		);
	}

	if (noGames) {
		return (
			<div className='mt-3 text-center popup-no-games-wrap'>
				<div className='fw-bold text-body mb-1 popup-no-games-title'>No games right now 💔</div>
				<div className='popup-no-games-sub mb-2'>Nothing live across your selected leagues.</div>
				<div className='d-flex justify-content-center gap-3'>
					<button className='btn btn-link btn-sm p-0 popup-settings-link' onClick={onRefresh}>Refresh</button>
					<button className='btn btn-link btn-sm p-0 popup-settings-link' onClick={onOpenSetup}>Settings →</button>
				</div>
			</div>
		);
	}

	return null;
};

export default emptyGameState;

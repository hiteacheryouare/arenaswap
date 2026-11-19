import type { GameStatus } from './gameSituation';

const gameStatusText = ({ status }: { status: GameStatus }) => (
	<>
		{status.text}
		{status.clock && <> • <span className='game-status-clock'>{status.clock}</span></>}
	</>
);

export default gameStatusText;

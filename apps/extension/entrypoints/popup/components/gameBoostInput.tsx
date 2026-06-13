interface gameBoostInputProps {
	gameId: string;
	currentBoost: number;
	onSetGameBoost: (gameId: string, boost: number) => void;
}

const GameBoostInput = ({ gameId, currentBoost, onSetGameBoost }: gameBoostInputProps) => (
	<div className='game-detail-boost-section'>
		<div className='game-detail-boost-heading'>Game boost</div>
		<div className='game-detail-boost-row'>
			<span className='game-detail-boost-explainer'>Add points to this game's PowerScore to raise its priority.</span>
			<input
				id={`boost-detail-${gameId}`}
				type='number'
				min={0}
				step={1}
				value={currentBoost}
				onChange={e => onSetGameBoost(gameId, Math.max(0, Math.round(Number(e.target.value) || 0)))}
				className='powerscore-boost-input'
			/>
		</div>
	</div>
);

export default GameBoostInput;

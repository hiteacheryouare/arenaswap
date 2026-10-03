import { i18n } from '#i18n';
import BoostPointsInput from './boostPointsInput';

interface gameBoostInputProps {
	gameId: string;
	currentBoost: number;
	onSetGameBoost: (gameId: string, boost: number) => void;
	// Renders the explainer and field alone, for hosts that supply their own card and heading.
	bare?: boolean;
}

const BoostRow = ({ gameId, currentBoost, onSetGameBoost }: gameBoostInputProps) => (
	<div className='game-detail-boost-row'>
		<span className='game-detail-boost-explainer'>{i18n.t('gameBoost.explainer')}</span>
		<BoostPointsInput
			id={`boost-detail-${gameId}`}
			value={currentBoost}
			onChange={boost => onSetGameBoost(gameId, boost)}
			className='powerscore-boost-input'
			ariaLabel={i18n.t('gameBoost.heading')}
		/>
	</div>
);

const GameBoostInput = ({ gameId, currentBoost, onSetGameBoost, bare = false }: gameBoostInputProps) => {
	const row = <BoostRow gameId={gameId} currentBoost={currentBoost} onSetGameBoost={onSetGameBoost} />;
	if (bare) return row;

	return (
		<div className='game-detail-boost-section'>
			<div className='game-detail-boost-heading'>{i18n.t('gameBoost.heading')}</div>
			{row}
		</div>
	);
};

export default GameBoostInput;

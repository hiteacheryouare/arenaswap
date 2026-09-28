import { i18n } from '#i18n';

interface gameBoostInputProps {
	gameId: string;
	currentBoost: number;
	onSetGameBoost: (gameId: string, boost: number) => void;
	// The row alone, for a host that supplies its own card.
	bare?: boolean;
}

const clamp = (value: number) => Math.max(0, Math.round(value || 0));

const BoostRow = ({ gameId, currentBoost, onSetGameBoost, bare }: gameBoostInputProps) => {
	const inputId = `boost-detail-${gameId}`;
	return (
		<div className='dt-boost'>
			<div className='dt-boost-copy'>
				<label className={bare ? 'dt-row-label' : 'dt-card-title'} htmlFor={inputId}>{i18n.t('gameBoost.heading')}</label>
				<p className='dt-boost-explainer'>{i18n.t('gameBoost.explainer')}</p>
			</div>
			<div className='dt-stepper'>
				<button
					type='button'
					className='as-icon'
					aria-label={i18n.t('gameBoost.decrease')}
					disabled={currentBoost <= 0}
					onClick={() => onSetGameBoost(gameId, clamp(currentBoost - 1))}
				>
					<i className='bi bi-dash-lg' aria-hidden='true' />
				</button>
				<input
					id={inputId}
					type='number'
					min={0}
					step={1}
					inputMode='numeric'
					value={currentBoost}
					onChange={e => onSetGameBoost(gameId, clamp(Number(e.target.value)))}
					className='powerscore-boost-input num'
				/>
				<button
					type='button'
					className='as-icon'
					aria-label={i18n.t('gameBoost.increase')}
					onClick={() => onSetGameBoost(gameId, clamp(currentBoost + 1))}
				>
					<i className='bi bi-plus-lg' aria-hidden='true' />
				</button>
			</div>
		</div>
	);
};

const GameBoostInput = (props: gameBoostInputProps) => {
	if (props.bare) return <BoostRow {...props} />;
	return (
		<section className='card dt-card game-detail-boost-section'>
			<BoostRow {...props} />
		</section>
	);
};

export default GameBoostInput;

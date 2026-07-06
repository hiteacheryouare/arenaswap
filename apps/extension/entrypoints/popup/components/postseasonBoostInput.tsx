import { i18n } from '#i18n';

interface postseasonBoostInputProps {
	value: number;
	onChange: (val: number) => void;
}

const postseasonBoostInput = ({ value, onChange }: postseasonBoostInputProps) => (
	<div>
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<label className='text-body-secondary setting-toggle-label' htmlFor='postseasonBoostInput'>
				<i className='bi bi-trophy me-1 text-primary' />{i18n.t('postseasonBoost.label')}
			</label>
			<span className='fw-semibold setting-value-label'>{i18n.t('postseasonBoost.points', [value])}</span>
		</div>
		<input
			id='postseasonBoostInput'
			type='number'
			min={0}
			step={1}
			value={value}
			onChange={e => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
			className='form-control form-control-sm'
			inputMode='numeric'
		/>
		<div className='mt-1 setting-explainer'>
			{i18n.t('postseasonBoost.explainer')}
		</div>
	</div>
);

export default postseasonBoostInput;

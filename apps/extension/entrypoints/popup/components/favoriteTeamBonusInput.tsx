interface favoriteTeamBonusInputProps {
	value: number;
	onChange: (val: number) => void;
}

const favoriteTeamBonusInput = ({ value, onChange }: favoriteTeamBonusInputProps) => (
	<div>
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<label className='text-body-secondary setting-toggle-label' htmlFor='favoriteTeamBonusInput'>
				<i className='bi bi-star me-1 text-primary' />Favorite team bonus
			</label>
			<span className='fw-semibold setting-value-label'>+{value} per team</span>
		</div>
		<input
			id='favoriteTeamBonusInput'
			type='number'
			min={0}
			step={1}
			value={value}
			onChange={e => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
			className='form-control form-control-sm'
			inputMode='numeric'
		/>
		<div className='mt-1 setting-explainer'>
			Applied once for each favorited team in a game. If both teams are favorited, the bonus is doubled.
		</div>
	</div>
);

export default favoriteTeamBonusInput;

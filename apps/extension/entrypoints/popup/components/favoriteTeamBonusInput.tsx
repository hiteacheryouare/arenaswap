interface favoriteTeamBonusInputProps {
	value: number;
	onChange: (val: number) => void;
}

const favoriteTeamBonusInput = ({ value, onChange }: favoriteTeamBonusInputProps) => (
	<div>
		<label className='setting-toggle-label d-block mb-1' htmlFor='favoriteTeamBonusInput'>
			<i className='bi bi-star me-1 text-primary' />Favorite team bonus
		</label>
		<input
			id='favoriteTeamBonusInput'
			type='number'
			min={0}
			step={1}
			value={value}
			onChange={e => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
			className='form-control form-control-sm powerscore-boost-input'
			inputMode='numeric'
		/>
		<div className='mt-1 setting-explainer'>
			Applied once per favorited team in a matchup. Both teams favorited doubles it.
		</div>
	</div>
);

export default favoriteTeamBonusInput;

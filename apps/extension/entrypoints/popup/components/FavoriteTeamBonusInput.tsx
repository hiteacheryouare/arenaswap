interface Props {
	value: number;
	onChange: (val: number) => void;
}

const EXPLAINER_STYLE = { fontSize: '0.55rem', lineHeight: 1.3, color: '#6e7681' } as const;

const FavoriteTeamBonusInput = ({ value, onChange }: Props) => (
	<div>
		<div className='d-flex justify-content-between align-items-center mb-1'>
			<label className='text-body-secondary' style={{ fontSize: '0.65rem' }} htmlFor='favoriteTeamBonusInput'>
				Favorite team bonus
			</label>
			<span className='fw-semibold' style={{ fontSize: '0.6rem' }}>
				+{value} per team
			</span>
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
		<div className='mt-1' style={EXPLAINER_STYLE}>
			Applied once for each favorited team in a game. If both teams are favorited, the bonus is doubled.
		</div>
	</div>
);

export default FavoriteTeamBonusInput;

import { useState } from 'react';
import { boostPointsMax, clampBoostPoints } from '@arenaswap/core/constants';

interface boostPointsInputProps {
	id: string;
	value: number;
	onChange: (value: number) => void;
	className: string;
	ariaLabel?: string;
	// Drawn inside the field, after the number. `className` then styles that wrapper, not the input.
	unit?: string;
}

// The field holds what was typed rather than the committed number, so it can sit empty while the
// user retypes it. Without that, deleting "10" snapped straight back to "0" and typing 5 read "05".
const boostPointsInput = ({ id, value, onChange, className, ariaLabel, unit }: boostPointsInputProps) => {
	const [draft, setDraft] = useState<string | null>(null);

	const settle = () => setDraft(null);
	const unitId = `${id}-unit`;

	const input = (
		<input
			id={id}
			type='number'
			min={0}
			max={boostPointsMax}
			step={1}
			inputMode='numeric'
			value={draft ?? String(value)}
			onChange={e => {
				const typed = e.target.value;
				if (typed.trim() === '') {
					setDraft(typed);
					return;
				}
				const points = clampBoostPoints(Number(typed));
				setDraft(Number(typed) > boostPointsMax ? String(points) : typed);
				onChange(points);
			}}
			onBlur={settle}
			onKeyDown={e => {
				if (e.key === 'Enter') settle();
			}}
			className={unit ? 'form-ghost' : className}
			aria-label={ariaLabel}
			aria-describedby={unit ? unitId : undefined}
		/>
	);

	if (!unit) return input;

	return (
		<label className={`${className} form-adorn`}>
			{input}
			<span id={unitId} className='form-adorn-text' aria-hidden='true'>{unit}</span>
		</label>
	);
};

export default boostPointsInput;

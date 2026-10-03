import { useState } from 'react';
import { boostPointsMax, clampBoostPoints } from '@arenaswap/core/constants';

interface boostPointsInputProps {
	id: string;
	value: number;
	onChange: (value: number) => void;
	className: string;
	ariaLabel?: string;
}

// The field holds what was typed rather than the committed number, so it can sit empty while the
// user retypes it. Without that, deleting "10" snapped straight back to "0" and typing 5 read "05".
const boostPointsInput = ({ id, value, onChange, className, ariaLabel }: boostPointsInputProps) => {
	const [draft, setDraft] = useState<string | null>(null);

	const settle = () => setDraft(null);

	return (
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
			className={className}
			aria-label={ariaLabel}
		/>
	);
};

export default boostPointsInput;

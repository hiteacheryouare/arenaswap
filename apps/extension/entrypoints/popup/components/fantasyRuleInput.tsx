import { useState } from 'react';

interface fantasyRuleInputProps {
	id: string;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (value: number) => void;
	ariaLabel: string;
	ariaDescribedBy?: string;
}

// The boost input's draft handling, with a rule's own bounds. A lone "-" or "." is a number on its
// way in, so it waits in the draft rather than committing as zero.
const fantasyRuleInput = ({ id, value, min, max, step, onChange, ariaLabel, ariaDescribedBy }: fantasyRuleInputProps) => {
	const [draft, setDraft] = useState<string | null>(null);

	const settle = () => setDraft(null);

	return (
		<input
			id={id}
			type='number'
			min={min}
			max={max}
			step={step}
			inputMode='decimal'
			value={draft ?? String(value)}
			onChange={e => {
				const typed = e.target.value;
				const parsed = Number(typed);
				if (typed.trim() === '' || !Number.isFinite(parsed)) {
					setDraft(typed);
					return;
				}
				const clamped = Math.min(max, Math.max(min, parsed));
				setDraft(clamped === parsed ? typed : String(clamped));
				onChange(clamped);
			}}
			onBlur={settle}
			onKeyDown={e => {
				if (e.key === 'Enter') settle();
			}}
			className='form-control form-control-sm fantasy-rule-input'
			aria-label={ariaLabel}
			aria-describedby={ariaDescribedBy}
		/>
	);
};

export default fantasyRuleInput;

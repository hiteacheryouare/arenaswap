import { useEffect, useRef, useState } from 'react';
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

// Every keystroke would otherwise write to synced storage, which allows 120 writes a minute, so the
// number is committed once typing pauses, and at once on blur, Enter and unmount.
const commitDelayMs = 400;

// The field holds what was typed rather than the committed number, so it can sit empty while the
// user retypes it. Without that, deleting "10" snapped straight back to "0" and typing 5 read "05".
const boostPointsInput = ({ id, value, onChange, className, ariaLabel, unit }: boostPointsInputProps) => {
	const [draft, setDraft] = useState<string | null>(null);

	const pendingRef = useRef<number | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const flush = () => {
		clearTimeout(timerRef.current);
		if (pendingRef.current === null) return;
		const points = pendingRef.current;
		pendingRef.current = null;
		onChangeRef.current(points);
	};

	useEffect(() => {
		window.addEventListener('pagehide', flush);
		return () => {
			window.removeEventListener('pagehide', flush);
			flush();
		};
	}, []);

	const settle = () => {
		flush();
		setDraft(null);
	};
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
				pendingRef.current = points;
				clearTimeout(timerRef.current);
				timerRef.current = setTimeout(flush, commitDelayMs);
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

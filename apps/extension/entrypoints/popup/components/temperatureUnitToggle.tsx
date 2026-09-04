import { useEffect, useRef, useState } from 'react';
import { i18n } from '#i18n';
import { romerUnlockClicks, romerUnlockWindowMs, type temperatureUnit } from '../../../utils/temperatureUnitCycle';

interface temperatureUnitToggleProps {
	unit: temperatureUnit;
	romerUnlocked: boolean;
	disabled: boolean;
	onCycle: () => void;
	onUnlockRomer: () => void;
}

// Matches the sweep on the button. There is nothing to read afterwards, so nothing outlives it.
const revealDurationMs = 1200;

const unitLabelKeys = {
	F: 'setup.temperatureUnitF',
	C: 'setup.temperatureUnitC',
	Ro: 'setup.temperatureUnitRomer',
} as const;

const temperatureUnitToggle = ({ unit, romerUnlocked, disabled, onCycle, onUnlockRomer }: temperatureUnitToggleProps) => {
	const clicks = useRef(0);
	const windowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const revealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const [revealing, setRevealing] = useState(false);

	useEffect(() => () => {
		clearTimeout(windowTimer.current);
		clearTimeout(revealTimer.current);
	}, []);

	const handleClick = () => {
		onCycle();
		if (romerUnlocked) return;

		clicks.current += 1;
		clearTimeout(windowTimer.current);
		windowTimer.current = setTimeout(() => { clicks.current = 0; }, romerUnlockWindowMs);
		if (clicks.current < romerUnlockClicks) return;

		clicks.current = 0;
		clearTimeout(windowTimer.current);
		onUnlockRomer();
		setRevealing(true);
		revealTimer.current = setTimeout(() => setRevealing(false), revealDurationMs);
	};

	return (
		<>
			<div className='d-flex justify-content-between align-items-center mt-2'>
				<label className='text-body-secondary setting-toggle-label' htmlFor='temperatureUnitToggle'>{i18n.t('setup.temperatureUnit')}</label>
				<button
					type='button'
					id='temperatureUnitToggle'
					className={`btn btn-sm btn-outline-secondary temperature-unit-toggle${revealing ? ' romer-revealing' : ''}`}
					onClick={handleClick}
					disabled={disabled}
				>
					{i18n.t(unitLabelKeys[unit])}
				</button>
			</div>
		</>
	);
};

export default temperatureUnitToggle;

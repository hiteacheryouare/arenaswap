import { useEffect, useRef, useState } from 'react';
import { i18n } from '#i18n';
import { romerUnlockClicks, romerUnlockWindowMs, type temperatureUnit } from '../../../utils/temperatureUnitCycle';
import { SettingCopy } from './settingControls';

interface temperatureUnitToggleProps {
	unit: temperatureUnit;
	romerUnlocked: boolean;
	disabled: boolean;
	onCycle: () => void;
	onUnlockRomer: () => void;
}

// Outlasts the frost sweep on the button, so the class never cuts the animation short.
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
		<div className='st-control st-toggle'>
			<SettingCopy htmlFor='temperatureUnitToggle' label={i18n.t('setup.temperatureUnit')} />
			<button
				type='button'
				id='temperatureUnitToggle'
				className={`btn btn-quiet st-unit${revealing ? ' romer-revealing' : ''}`}
				onClick={handleClick}
				disabled={disabled}
			>
				{i18n.t(unitLabelKeys[unit])}
			</button>
		</div>
	);
};

export default temperatureUnitToggle;

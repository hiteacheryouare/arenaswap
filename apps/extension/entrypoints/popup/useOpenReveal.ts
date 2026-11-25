import { useEffect, useRef, useState } from 'react';
import { resolveOpenRevealCut, resolveOpenRevealMode, revealSettleMs, revealSkipOutMs } from './cardReveal';
import { writeOpenRevealEnabled } from '../../utils/openReveal';

interface openRevealInput {
	listOnScreen: boolean;
	prefsLoaded: boolean;
	openRevealEnabled: boolean;
}

export default ({ listOnScreen, prefsLoaded, openRevealEnabled }: openRevealInput) => {
	const [revealMode, setRevealMode] = useState(resolveOpenRevealMode);
	const [revealCut] = useState(() => resolveOpenRevealCut(revealMode));
	const revealStartedRef = useRef(false);
	useEffect(() => {
		if (revealMode === 'none') return;
		if (!listOnScreen) {
			if (!revealStartedRef.current) return;
			setRevealMode('none');
			return;
		}
		revealStartedRef.current = true;
		const timer = setTimeout(() => setRevealMode('none'), revealSettleMs(revealMode, revealCut));
		return () => clearTimeout(timer);
	}, [revealMode, revealCut, listOnScreen]);

	const [revealSkipping, setRevealSkipping] = useState(false);
	useEffect(() => {
		if (revealMode === 'none' || revealSkipping) return;
		const skip = () => setRevealSkipping(true);
		window.addEventListener('pointerdown', skip, true);
		window.addEventListener('keydown', skip, true);
		return () => {
			window.removeEventListener('pointerdown', skip, true);
			window.removeEventListener('keydown', skip, true);
		};
	}, [revealMode, revealSkipping]);

	useEffect(() => {
		if (!revealSkipping) return;
		const timer = setTimeout(() => setRevealMode('none'), revealSkipOutMs);
		return () => clearTimeout(timer);
	}, [revealSkipping]);

	useEffect(() => {
		if (!prefsLoaded) return;
		writeOpenRevealEnabled(openRevealEnabled);
	}, [prefsLoaded, openRevealEnabled]);

	return { revealMode, revealCut, revealSkipping };
};

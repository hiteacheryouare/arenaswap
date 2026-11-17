import { useEffect, useState } from 'react';
import { measureLogoSwitchColor, pendingSwitchCrest } from '@arenaswap/chromatic';

interface switchCrestTeam {
	color?: string;
	alternateColor?: string;
	logo?: string;
}

const useSwitchCrest = (away: switchCrestTeam, home: switchCrestTeam): void => {
	const [, setMeasured] = useState(0);
	const pending = pendingSwitchCrest(away, home);
	const crest = pending?.crest;
	const primary = pending?.primary;

	useEffect(() => {
		if (!crest || !primary) return;
		let mounted = true;
		void measureLogoSwitchColor(crest, primary).then(() => {
			if (mounted) setMeasured(count => count + 1);
		});
		return () => {
			mounted = false;
		};
	}, [crest, primary]);
};

export default useSwitchCrest;

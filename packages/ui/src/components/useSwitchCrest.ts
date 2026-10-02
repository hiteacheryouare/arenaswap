import { useEffect, useState } from 'react';
import { pendingSwitchCrest } from './colorUtils';
import { measureLogoSwitchColor } from './logoSwitchColor';

interface switchCrestTeam {
	color?: string;
	alternateColor?: string;
	logo?: string;
}

// Reads the away crest when a clash needs a colour out of it, and renders again once it has one,
// so the switch lands in whatever resolveTeamColorPair the component calls next.
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

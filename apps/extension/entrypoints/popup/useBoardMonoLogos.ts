import { useEffect, useState } from 'react';
import type { TeamMonoLogoMap } from '@arenaswap/core/types';
import { isMonoLogoCacheFresh, monoLogoCacheKey } from '../../utils/monoLogoCache';

// The stored marks paint on the first frame; the background then fills in any league it hasn't
// fetched yet.
const useBoardMonoLogos = (): TeamMonoLogoMap => {
	const [monoLogos, setMonoLogos] = useState<TeamMonoLogoMap>({});

	useEffect(() => {
		let cancelled = false;
		const merge = (logos: TeamMonoLogoMap | undefined) => {
			if (!cancelled && logos) setMonoLogos(current => ({ ...current, ...logos }));
		};
		void (async () => {
			try {
				const stored = (await browser.storage.local.get(monoLogoCacheKey))[monoLogoCacheKey];
				if (isMonoLogoCacheFresh(stored, Date.now())) merge(stored.logos);
				merge(await browser.runtime.sendMessage({ type: 'GET_MONO_LOGOS' }) as TeamMonoLogoMap | undefined);
			} catch {
				// No marks means colour crests, which is what the board drew before it had any.
			}
		})();
		return () => { cancelled = true; };
	}, []);

	return monoLogos;
};

export default useBoardMonoLogos;

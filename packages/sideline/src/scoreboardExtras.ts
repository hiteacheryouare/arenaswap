import type { BroadcastLogo } from '@arenaswap/core';
import type { EspnCompetition } from './espnSchemas';

export const parseBroadcastLogos = (comp: EspnCompetition): Record<string, BroadcastLogo> | undefined => {
	const logos: Record<string, BroadcastLogo> = {};
	for (const geoBroadcast of comp.geoBroadcasts ?? []) {
		const name = geoBroadcast.media?.shortName?.trim();
		const logo = geoBroadcast.media?.logo?.trim();
		const darkLogo = geoBroadcast.media?.darkLogo?.trim();
		if (!name || (!logo && !darkLogo) || logos[name]) continue;
		logos[name] = { ...(logo ? { logo } : {}), ...(darkLogo ? { darkLogo } : {}) };
	}
	return Object.keys(logos).length > 0 ? logos : undefined;
};

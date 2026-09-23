import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';

// The same mark serves several leagues (one NCAA shield, one Olympic ring set), and a flyby that
// showed the shield nine times would read as a repeat rather than as a slate. Deduping by URL is
// what keeps it looking like a field of different leagues.
const ludicrousLogoUrls = (): string[] => {
	const seen = new Set<string>();
	for (const config of leagueConfigs) {
		const url = resolveLeagueLogoUrl(config.id);
		if (url) seen.add(url);
	}
	return [...seen];
};

export const preloadLogoImages = (): HTMLImageElement[] => ludicrousLogoUrls().map(url => {
	const img = new Image();
	img.decoding = 'async';
	img.src = url;
	return img;
});

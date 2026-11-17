import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';

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

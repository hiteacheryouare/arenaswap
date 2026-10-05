import { allLeagueIds } from '../../../packages/powerscore/src/constants';
import { resolveLeagueLogoUrl, teamLogoOnColor } from '../../../packages/core/src/constants';
import type { Cut } from './cuts/cutTypes';
import type { Slate } from './data/slate';
import { filmTabs } from './data/tabs';

const load = (url: string) => new Promise<void>(resolve => {
	const image = new Image();
	image.crossOrigin = 'anonymous';
	image.addEventListener('load', () => {
		image.decode().catch(() => {}).finally(() => resolve());
	});
	image.addEventListener('error', () => resolve());
	image.src = url;
});

// Every image the stage itself draws, fetched before frame 0 so none of them pops in on camera.
const preloadImages = async (_cut: Cut, slate: Slate) => {
	const urls = new Set<string>();
	for (const game of slate.raw.wall) {
		for (const team of [game.away, game.home]) {
			if (!team.logo) continue;
			urls.add(team.logo);
			urls.add(teamLogoOnColor(team.logo) ?? team.logo);
		}
	}
	for (const tab of filmTabs) {
		const game = slate.gameAt(tab.gameId, Date.parse(slate.raw.source.to));
		for (const team of game ? [game.awayTeam, game.homeTeam] : []) {
			if (!team.logo) continue;
			urls.add(team.logo);
			urls.add(teamLogoOnColor(team.logo) ?? team.logo);
		}
	}
	for (const league of allLeagueIds) urls.add(resolveLeagueLogoUrl(league, slate.raw.leagueLogos[league]));
	await Promise.all([...urls].filter(Boolean).map(load));
};

export default preloadImages;

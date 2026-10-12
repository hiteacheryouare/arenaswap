import type { LeagueId } from '../../../../packages/core/src/types';

export interface FilmTab {
	id: number;
	gameId: string;
	league: LeagueId;
	title: string;
	url: string;
	host: string;
}

// The five streams open that night, each on the service the game actually aired on.
export const filmTabs: FilmTab[] = [
	{
		id: 101,
		gameId: '401856709',
		league: 'ncaaf',
		title: 'SEC Football: Kentucky Wildcats at South Carolina Gamecocks - YouTube TV',
		url: 'https://tv.youtube.com/watch/sec-network',
		host: 'tv.youtube.com',
	},
	{
		id: 102,
		gameId: '401907985',
		league: 'mlb',
		title: 'MLB on TBS: New York Yankees vs. Tampa Bay Rays | HBO Max',
		url: 'https://play.hbomax.com/channel/watch/tbs',
		host: 'play.hbomax.com',
	},
	{
		id: 103,
		gameId: '401858247',
		league: 'ncaaf',
		title: 'California Golden Bears at UNLV Rebels | Fubo',
		url: 'https://www.fubo.tv/p/sports/cbs-sports-network',
		host: 'fubo.tv',
	},
	{
		id: 104,
		gameId: '401891776',
		league: 'nhl',
		title: 'Chicago Blackhawks at Buffalo Sabres - Gotham Sports',
		url: 'https://gothamsports.com/watch/msg-buffalo',
		host: 'gothamsports.com',
	},
	{
		id: 105,
		gameId: '401854018',
		league: 'nwsl',
		title: 'Bay FC at Kansas City Current | ION',
		url: 'https://iontelevision.com/nwsl/live',
		host: 'iontelevision.com',
	},
];

// A 24/7 studio channel, open all night as the viewer's Standby Stream.
export interface ChannelTab {
	id: number;
	title: string;
	url: string;
	host: string;
}

export const standbyTab: ChannelTab = {
	id: 106,
	title: 'CBS Sports HQ - Watch Live | CBS Sports',
	url: 'https://www.cbssports.com/watch/cbs-sports-hq',
	host: 'cbssports.com',
};

export type BrowserTab = FilmTab | ChannelTab;

export const browserTabs: BrowserTab[] = [...filmTabs, standbyTab];

export const isGameTab = (tab: BrowserTab): tab is FilmTab => 'gameId' in tab;

export const tabById = (id: number) => browserTabs.find(tab => tab.id === id)!;

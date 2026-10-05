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

export const tabById = (id: number) => filmTabs.find(tab => tab.id === id)!;
export const tabForGame = (gameId: string) => filmTabs.find(tab => tab.gameId === gameId)!;

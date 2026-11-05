import { resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { Game, LeagueId, PowerScoreResult } from '@arenaswap/core/types';

// One evening of games shared by every help-article demo, so the popup, the card, the breakdown, the
// notification and the tab strip all describe the same night. The Celtics and Knicks game is the one
// ArenaSwap is on: its signals are the breakdown's, and a 5-point Game Boost takes it from 85 to 90.

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;

export interface DemoEntry {
	game: Game;
	result: PowerScoreResult;
	tabTitle: string;
	tabHost: string;
}

export const celticsKnicks: DemoEntry = {
	game: {
		id: 'demo-nba',
		league: 'nba',
		sportType: 'basketball',
		status: 'in',
		period: 4,
		clockSeconds: 130,
		venueName: 'Madison Square Garden',
		broadcasts: ['Prime Video'],
		awayTeam: { id: '2', name: 'Boston Celtics', abbreviation: 'BOS', score: 100, logo: espnTeamLogo('nba/500/bos'), color: '#007A33', alternateColor: '#BA9653' },
		homeTeam: { id: '18', name: 'New York Knicks', abbreviation: 'NYK', score: 100, logo: espnTeamLogo('nba/500/nyk'), color: '#006BB6', alternateColor: '#F58426' },
	},
	result: { gameId: 'demo-nba', total: 85, closeness: 38, lateGame: 31, momentum: 8, leadChanges: 5, comeback: 3, reason: 'Tied with 2:10 left' },
	tabTitle: 'Boston at New York',
	tabHost: 'primevideo.com',
};

export const notificationScore = `${celticsKnicks.game.awayTeam.abbreviation} ${celticsKnicks.game.awayTeam.score}–${celticsKnicks.game.homeTeam.score} ${celticsKnicks.game.homeTeam.abbreviation}`;

export const flyersPenguins: DemoEntry = {
	game: {
		id: 'demo-nhl',
		league: 'nhl',
		sportType: 'hockey',
		status: 'in',
		period: 3,
		clockSeconds: 401,
		venueName: 'PPG Paints Arena',
		broadcasts: ['TNT'],
		awayTeam: { id: '15', name: 'Philadelphia Flyers', abbreviation: 'PHI', score: 2, logo: espnTeamLogo('nhl/500/phi'), color: '#F74902', alternateColor: '#000000' },
		homeTeam: { id: '16', name: 'Pittsburgh Penguins', abbreviation: 'PIT', score: 2, logo: espnTeamLogo('nhl/500/pit'), color: '#000000', alternateColor: '#FCB514' },
	},
	result: { gameId: 'demo-nhl', total: 76, closeness: 34, lateGame: 24, momentum: 10, leadChanges: 5, comeback: 3, reason: 'Tied with 6:41 left' },
	tabTitle: 'Philadelphia at Pittsburgh',
	tabHost: 'max.com',
};

// Soccer lists the host first, so Arsenal is on the left.
export const arsenalChelsea: DemoEntry = {
	game: {
		id: 'demo-epl',
		league: 'epl',
		sportType: 'soccer',
		status: 'in',
		period: 2,
		clockSeconds: 78 * 60,
		venueName: 'Emirates Stadium',
		broadcasts: ['Peacock'],
		awayTeam: { id: '363', name: 'Chelsea', abbreviation: 'CHE', score: 2, logo: espnTeamLogo('soccer/500/363'), color: '#034694', alternateColor: '#D1D3D4' },
		homeTeam: { id: '359', name: 'Arsenal', abbreviation: 'ARS', score: 1, logo: espnTeamLogo('soccer/500/359'), color: '#EF0107', alternateColor: '#023474' },
	},
	result: { gameId: 'demo-epl', total: 63, closeness: 26, lateGame: 18, momentum: 12, leadChanges: 4, comeback: 3, reason: 'Chelsea up 1 in the 78th minute' },
	tabTitle: 'Chelsea at Arsenal',
	tabHost: 'peacocktv.com',
};

export const arizonaPurdue: DemoEntry = {
	game: {
		id: 'demo-ncaab',
		league: 'ncaab',
		sportType: 'basketball',
		status: 'in',
		period: 2,
		clockSeconds: 252,
		venueName: 'Mackey Arena',
		broadcasts: ['FS1'],
		awayTeam: { id: '12', name: 'Arizona Wildcats', abbreviation: 'ARIZ', score: 68, logo: espnTeamLogo('ncaa/500/12'), color: '#CC0033', alternateColor: '#003366' },
		homeTeam: { id: '2509', name: 'Purdue Boilermakers', abbreviation: 'PUR', score: 66, logo: espnTeamLogo('ncaa/500/2509'), color: '#000000', alternateColor: '#CEB888' },
	},
	result: { gameId: 'demo-ncaab', total: 71, closeness: 30, lateGame: 22, momentum: 11, leadChanges: 5, comeback: 3, reason: 'Arizona up 2 with 4:12 left' },
	tabTitle: 'Arizona at Purdue',
	tabHost: 'foxsports.com',
};

// Ranked by PowerScore, the way the popup lists them.
export const liveEntries: DemoEntry[] = [celticsKnicks, flyersPenguins, arsenalChelsea];

// A date-time with no offset is read as local time, so the card prints 4:25 PM wherever the site is built.
export const chiefsBills: Game = {
	id: 'demo-nfl',
	league: 'nfl',
	sportType: 'football',
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	startTime: '2026-11-08T16:25:00',
	venueName: 'Highmark Stadium',
	broadcasts: ['CBS'],
	awayTeam: { id: '12', name: 'Kansas City Chiefs', abbreviation: 'KC', score: 0, logo: espnTeamLogo('nfl/500/kc'), color: '#E31837', alternateColor: '#FFB612' },
	homeTeam: { id: '2', name: 'Buffalo Bills', abbreviation: 'BUF', score: 0, logo: espnTeamLogo('nfl/500/buf'), color: '#00338D', alternateColor: '#C60C30' },
};

export const michiganOhioState: Game = {
	id: 'demo-ncaaf',
	league: 'ncaaf',
	sportType: 'football',
	status: 'post',
	period: 4,
	clockSeconds: 0,
	venueName: 'Ohio Stadium',
	awayTeam: { id: '130', name: 'Michigan Wolverines', abbreviation: 'MICH', score: 24, logo: espnTeamLogo('ncaa/500/130'), color: '#00274C', alternateColor: '#FFCB05' },
	homeTeam: { id: '194', name: 'Ohio State Buckeyes', abbreviation: 'OSU', score: 27, logo: espnTeamLogo('ncaa/500/194'), color: '#BB0000', alternateColor: '#666666' },
};

// The league mark drawn for a dark ground, which is what a tab strip and a card's tab picker both are.
export const leagueFavicon = (league: LeagueId) => resolveLeagueLogoUrl(league, undefined, 'dark');

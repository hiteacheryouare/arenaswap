import type { Browser } from 'wxt/browser';
import type { Game, LeagueId, SportType, Team } from '@arenaswap/core/types';

// The tour's games. Real teams with their real crests and colours, so every step draws with the same
// board components the Games screen does.
const crest = (league: string, abbreviation: string) => `https://a.espncdn.com/i/teamlogos/${league}/500/${abbreviation}.png`;

const team = (fields: Omit<Team, 'score'>, score: number): Team => ({ ...fields, score });

export const eagles = { id: '21', name: 'Philadelphia Eagles', nickname: 'Eagles', abbreviation: 'PHI', logo: crest('nfl', 'phi'), color: '#004C54', alternateColor: '#A5ACAF' };
export const giants = { id: '19', name: 'New York Giants', nickname: 'Giants', abbreviation: 'NYG', logo: crest('nfl', 'nyg'), color: '#0B2265', alternateColor: '#A71930' };
export const chiefs = { id: '12', name: 'Kansas City Chiefs', nickname: 'Chiefs', abbreviation: 'KC', logo: crest('nfl', 'kc'), color: '#E31837', alternateColor: '#FFB612' };
const sixers = { id: '20', name: 'Philadelphia 76ers', nickname: '76ers', abbreviation: 'PHI', logo: crest('nba', 'phi'), color: '#006BB6', alternateColor: '#ED174C' };
const celtics = { id: '2', name: 'Boston Celtics', nickname: 'Celtics', abbreviation: 'BOS', logo: crest('nba', 'bos'), color: '#007A33', alternateColor: '#BA9653' };
export const bucks = { id: '15', name: 'Milwaukee Bucks', nickname: 'Bucks', abbreviation: 'MIL', logo: crest('nba', 'mil'), color: '#00471B', alternateColor: '#EEE1C6' };

interface mockGameFields {
	id: string;
	league: LeagueId;
	sportType: SportType;
	away: Omit<Team, 'score'>;
	home: Omit<Team, 'score'>;
	score: [number, number];
	period: number;
	clockSeconds: number;
	records?: [string, string];
}

const liveGame = ({ id, league, sportType, away, home, score, period, clockSeconds, records }: mockGameFields): Game => ({
	id,
	league,
	sportType,
	status: 'in',
	period,
	clockSeconds,
	awayTeam: team({ ...away, record: records?.[0] }, score[0]),
	homeTeam: team({ ...home, record: records?.[1] }, score[1]),
});

export const eaglesGiantsQ2 = liveGame({ id: 'tour-phi-nyg', league: 'nfl', sportType: 'football', away: eagles, home: giants, score: [14, 10], period: 2, clockSeconds: 463 });

export const sixersCelticsQ4 = liveGame({ id: 'tour-phi-bos', league: 'nba', sportType: 'basketball', away: sixers, home: celtics, score: [98, 95], period: 4, clockSeconds: 82 });

export const eaglesGiantsQ4 = liveGame({
	id: 'tour-phi-nyg-late',
	league: 'nfl',
	sportType: 'football',
	away: eagles,
	home: giants,
	score: [21, 17],
	period: 4,
	clockSeconds: 134,
	records: ['9-3', '7-5'],
});

// Two streams in two browser tabs, which is all the tab steps need to pick between.
const tab = (id: number, index: number, url: string): Browser.tabs.Tab => ({
	id,
	index,
	url,
	title: url,
	active: false,
	pinned: false,
	highlighted: false,
	incognito: false,
	windowId: 1,
	discarded: false,
	autoDiscardable: true,
	frozen: false,
	groupId: -1,
	selected: false,
} as Browser.tabs.Tab);

export const tourTabs = [
	tab(101, 0, 'youtube.com/watch?v=Philly_stream'),
	tab(102, 1, 'nfl.com/watch/live'),
];

export const tourTabLabel = (entry: Browser.tabs.Tab) => entry.url ?? '';

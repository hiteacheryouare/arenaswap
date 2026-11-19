import type { SportType } from '@arenaswap/core/types';

export interface MosaicTeam {
	abbreviation: string;
	logo: string;
	color: string;
}

export interface MosaicGame {
	sport: SportType;
	away: MosaicTeam;
	home: MosaicTeam;
	awayScore: number;
	homeScore: number;
}

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;

const team = (abbreviation: string, path: string, color: string): MosaicTeam => ({ abbreviation, logo: espnTeamLogo(path), color });

interface MosaicLeague {
	sport: SportType;
	scoreRange: [number, number];
	teams: MosaicTeam[];
}

const nfl: MosaicLeague = {
	sport: 'football',
	scoreRange: [0, 34],
	teams: [
		team('KC', 'nfl/500/kc', '#E31837'),
		team('BUF', 'nfl/500/buf', '#00338D'),
		team('DAL', 'nfl/500/dal', '#041E42'),
		team('SF', 'nfl/500/sf', '#AA0000'),
		team('DET', 'nfl/500/det', '#0076B6'),
		team('GB', 'nfl/500/gb', '#203731'),
		team('BAL', 'nfl/500/bal', '#241773'),
	],
};

const collegeFootball: MosaicLeague = {
	sport: 'football',
	scoreRange: [0, 34],
	teams: [
		team('MICH', 'ncaa/500/130', '#00274C'),
		team('OSU', 'ncaa/500/194', '#BB0000'),
		team('ARMY', 'ncaa/500-dark/349', '#2C2A29'),
		team('NAVY', 'ncaa/500-dark/2426', '#00225B'),
	],
};

const nba: MosaicLeague = {
	sport: 'basketball',
	scoreRange: [62, 112],
	teams: [
		team('BOS', 'nba/500/bos', '#007A33'),
		team('NYK', 'nba/500/nyk', '#006BB6'),
		team('LAL', 'nba/500/lal', '#552583'),
		team('GS', 'nba/500/gs', '#1D428A'),
		team('DEN', 'nba/500/den', '#0E2240'),
		team('MIL', 'nba/500/mil', '#00471B'),
		team('OKC', 'nba/500/okc', '#007AC1'),
	],
};

const collegeBasketball: MosaicLeague = {
	sport: 'basketball',
	scoreRange: [48, 88],
	teams: [
		team('UK', 'ncaa/500/96', '#0033A0'),
		team('MSU', 'ncaa/500/127', '#18453B'),
		team('ARIZ', 'ncaa/500/12', '#CC0033'),
		team('MICH', 'ncaa/500/130', '#00274C'),
	],
};

const wnba: MosaicLeague = {
	sport: 'basketball',
	scoreRange: [58, 94],
	teams: [
		team('GS', 'wnba/500-dark/gs', '#B38FCF'),
		team('IND', 'wnba/500/5', '#002D62'),
	],
};

const mlb: MosaicLeague = {
	sport: 'baseball',
	scoreRange: [0, 7],
	teams: [
		team('TB', 'mlb/500/tb', '#092C5C'),
		team('STL', 'mlb/500/stl', '#BE0A14'),
		team('BOS', 'mlb/500/bos', '#BD3039'),
		team('NYY', 'mlb/500/nyy', '#0C2340'),
		team('LAD', 'mlb/500/lad', '#005A9C'),
		team('CHC', 'mlb/500/chc', '#0E3386'),
		team('HOU', 'mlb/500/hou', '#EB6E1F'),
		team('SEA', 'mlb/500/sea', '#0C2C56'),
	],
};

const nhl: MosaicLeague = {
	sport: 'hockey',
	scoreRange: [0, 5],
	teams: [
		team('PIT', 'nhl/500/pit', '#FCB514'),
		team('NYR', 'nhl/500/nyr', '#0038A8'),
		team('TOR', 'nhl/500/tor', '#00205B'),
		team('EDM', 'nhl/500/edm', '#FF4C00'),
		team('COL', 'nhl/500/col', '#6F263D'),
		team('MTL', 'nhl/500/mtl', '#AF1E2D'),
	],
};

const premierLeague: MosaicLeague = {
	sport: 'soccer',
	scoreRange: [0, 3],
	teams: [
		team('ARS', 'soccer/500/359', '#EF0107'),
		team('MCI', 'soccer/500/382', '#6CABDD'),
		team('CHE', 'soccer/500/363', '#034694'),
		team('LIV', 'soccer/500/364', '#C8102E'),
		team('AVL', 'soccer/500-dark/362', '#660E36'),
		team('BOU', 'soccer/500-dark/349', '#F42727'),
	],
};

const rotation = [nfl, nba, mlb, nhl, premierLeague, collegeFootball, nba, nfl, collegeBasketball, mlb, nhl, premierLeague, wnba];

const seeded = (seed: number) => () => {
	seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
	return seed / 2_147_483_648;
};

export const mosaicGames = (count: number): MosaicGame[] => {
	const random = seeded(19);
	return Array.from({ length: count }, (_, index) => {
		const league = rotation[index % rotation.length]!;
		const awayIndex = Math.floor(random() * league.teams.length);
		const homeIndex = (awayIndex + 1 + Math.floor(random() * (league.teams.length - 1))) % league.teams.length;
		const [low, high] = league.scoreRange;
		const score = () => low + Math.floor(random() * (high - low + 1));
		return {
			sport: league.sport,
			away: league.teams[awayIndex]!,
			home: league.teams[homeIndex]!,
			awayScore: score(),
			homeScore: score(),
		};
	});
};

// The four boxes in the home page's Multiview demo. Each is a real game in a league ArenaSwap tracks,
// so the crest bar can name it, and the footage is credited on /legal/credits.
// `left` and `right` follow the league's matchup order: soccer puts the home side on the left.

export interface MultiviewSide {
	abbreviation: string;
	logo: string;
	color: string;
}

export interface MultiviewGame {
	video: string;
	left: MultiviewSide;
	right: MultiviewSide;
}

// Each side's crest is the one drawn for a dark ground where our sources have one, as Multiview draws
// it; the Fever have none, so theirs is the published crest.
const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;

export const multiviewGames: MultiviewGame[] = [
	{
		video: 'multiview/soccer',
		left: { abbreviation: 'BOU', logo: espnTeamLogo('soccer/500-dark/349'), color: '#F42727' },
		right: { abbreviation: 'AVL', logo: espnTeamLogo('soccer/500-dark/362'), color: '#660E36' },
	},
	{
		video: 'multiview/collegeFootball',
		left: { abbreviation: 'ORE', logo: espnTeamLogo('ncaa/500-dark/2483'), color: '#044520' },
		right: { abbreviation: 'WSU', logo: espnTeamLogo('ncaa/500-dark/265'), color: '#94022A' },
	},
	{
		video: 'multiview/wnba',
		left: { abbreviation: 'GS', logo: espnTeamLogo('wnba/500-dark/gs'), color: '#B38FCF' },
		right: { abbreviation: 'IND', logo: espnTeamLogo('wnba/500/5'), color: '#002D62' },
	},
	{
		video: 'multiview/baseball',
		left: { abbreviation: 'TB', logo: espnTeamLogo('mlb/500-dark/tb'), color: '#092C5C' },
		right: { abbreviation: 'STL', logo: espnTeamLogo('mlb/500-dark/stl'), color: '#BE0A14' },
	},
];

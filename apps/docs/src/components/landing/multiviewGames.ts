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

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;

export const multiviewGames: MultiviewGame[] = [
	{
		video: 'multiview/soccer',
		left: { abbreviation: 'BOU', logo: espnTeamLogo('soccer/500-dark/349'), color: '#F42727' },
		right: { abbreviation: 'AVL', logo: espnTeamLogo('soccer/500-dark/362'), color: '#660E36' },
	},
	{
		video: 'multiview/football',
		left: { abbreviation: 'ARMY', logo: espnTeamLogo('ncaa/500-dark/349'), color: '#000000' },
		right: { abbreviation: 'NAVY', logo: espnTeamLogo('ncaa/500-dark/2426'), color: '#00225b' },
	},
	{
		video: 'multiview/wnba',
		left: { abbreviation: 'GS', logo: espnTeamLogo('wnba/500-dark/gs'), color: '#B38FCF' },
		right: { abbreviation: 'IND', logo: espnTeamLogo('wnba/500/5'), color: '#002D62' },
	},
	{
		video: 'multiview/basketball',
		left: { abbreviation: 'NAU', logo: espnTeamLogo('ncaa/500-dark/2464'), color: '#f1c40f' },
		right: { abbreviation: 'HAW', logo: espnTeamLogo('ncaa/500-dark/62'), color: '#000000' },
	},
];

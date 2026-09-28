import type { Team } from '@arenaswap/core/types';

// Team records for the store stills. The ids, colours and crest paths are our sources' own, so a
// still draws each team exactly the way the popup does.
const crest = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;

export const team = (path: string, id: string, abbreviation: string, name: string, score: number, color: string, alternateColor: string): Team => ({
	id,
	name,
	abbreviation,
	score,
	logo: crest(path),
	color,
	alternateColor,
});

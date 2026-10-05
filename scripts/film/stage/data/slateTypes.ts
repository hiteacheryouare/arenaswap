import type { Game, GuideSlate, LeagueId, LeagueLogoMap, LiveScore } from '../../../../packages/core/src/types';

export interface ScoreTotal {
	total: number;
	reason: string;
	stalled?: boolean;
}

export type ScoreEntry = [number, LiveScore | ScoreTotal | null];

export interface GameTrack {
	league: LeagueId;
	// One entry per poll of the game's league. The first is the whole game; every later one holds
	// only the fields that changed, with null for a field that went away.
	frames: [number, Partial<Game>][];
}

export interface WallTeam {
	abbreviation: string;
	score: number;
	color?: string;
	logo?: string;
}

export interface WallGame {
	id: string;
	league: LeagueId;
	away: WallTeam;
	home: WallTeam;
}

export interface FilmSlate {
	source: {
		recording: string;
		recorderGitSha?: string;
		from: string;
		to: string;
		wallAt: string;
		guideAt: string;
	};
	leagueLogos: LeagueLogoMap;
	games: Record<string, GameTrack>;
	// Per viewer profile, per game. A detail game has one entry per poll, the full score or null when
	// it repeats the one before; any other game has an entry only when its total moves.
	scores: Record<string, Record<string, ScoreEntry[]>>;
	summaries: Record<string, [number, unknown][]>;
	// The home side's win probability, sampled once a minute from the recorded summaries.
	winProbabilities: Record<string, [number, number[]][]>;
	wall: WallGame[];
	guide: GuideSlate;
}

import type { Game, GuideSlate, LeagueId, LeagueLogoMap, LiveScore } from '@arenaswap/core/types';

export interface ScoreTotal {
	total: number;
	reason: string;
	onBreak?: boolean;
}

export type ScoreEntry = [number, LiveScore | ScoreTotal | null];

export interface GameTrack {
	league: LeagueId;
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

export interface PregameData {
	fetchedAt: number;
	game: Game;
	summary: Record<string, unknown>;
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
	scores: Record<string, Record<string, ScoreEntry[]>>;
	summaries: Record<string, [number, unknown][]>;
	winProbabilities: Record<string, [number, number[]][]>;
	wall: WallGame[];
	guide: GuideSlate;
}

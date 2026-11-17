import type { Game } from '@arenaswap/core/types';

const fieldYards = 100;
export const endZoneYards = 10;
export const stripYards = fieldYards + endZoneYards * 2;

// ESPN's yardLine is absolute: 0 is the home team's own goal line, 100 is the away team's. The
// strip puts the away end zone on the left so the field's two halves sit under the crests that own
// them — the hero card already washes away-colour left and home-colour right — which leaves the
// away offense driving left to right and the home offense right to left.
export const yardLineToX = (yardLine: number): number => endZoneYards + (fieldYards - yardLine);

export const turfColor = '#22683B';
export const mownColor = '#2A7645';

export const awayEndZoneX = 0;
export const homeEndZoneX = endZoneYards + fieldYards;

export const yardNumbers = [10, 20, 30, 40, 50, 60, 70, 80, 90].map(fromAwayGoal => ({
	x: endZoneYards + fromAwayGoal,
	label: fromAwayGoal > 50 ? fieldYards - fromAwayGoal : fromAwayGoal,
	isMidfield: fromAwayGoal === 50,
}));

export const fieldWidthYards = 160 / 3;
export const stripHeight = 32;

export const acrossToY = (fromSideline: number): number => (fromSideline / fieldWidthYards) * stripHeight;

const hashInsetYards: Record<string, number> = {
	nfl: 70.75 / 3,
	ncaaf: 20,
};

export const resolveHashRows = (league: string): [number, number] => {
	const inset = hashInsetYards[league] ?? hashInsetYards.nfl!;
	return [acrossToY(inset), acrossToY(fieldWidthYards - inset)];
};

export const hashLength = 2 / 3;

export const buildHashPath = (rows: [number, number]): string => {
	const segments: string[] = [];
	for (let yard = 1; yard < fieldYards; yard += 1) {
		if (yard % 5 === 0) continue;
		const x = endZoneYards + yard - hashLength / 2;
		for (const row of rows) segments.push(`M${x} ${row}h${hashLength}`);
	}
	return segments.join('');
};

export const numberRowsY: [number, number] = [acrossToY(12), acrossToY(fieldWidthYards - 12)];

export interface FieldDiagram {
	ballX: number;
	firstDownX: number | null;
	driveStartX: number | null;
	possession: 'home' | 'away' | null;
	drivesRight: boolean | null;
}

export interface FieldFrame {
	gameId: string;
	yardLine: number;
	diagram: FieldDiagram;
}

const clampToField = (yardLine: number): number => Math.min(Math.max(yardLine, 0), fieldYards);

// A live yardLine is not on its own proof that there is a snap to draw. A college kickoff arrives
// as `down: 1, distance: 10, yardLine: 65` — identical in shape to a real first down — and the only
// thing separating them is that ESPN nulls every text field on a kickoff. The NFL sends `down: 0`
// for the same play, so the down alone cannot carry the gate either, and after any score both
// leagues send `down: -1` alongside a yardLine that is simply wrong: one home field goal reported
// 35 and the touchdown before it 65 for what is the same spot.
const isFootballSituation = (game: Game): boolean => (
	game.sportType === 'football'
	&& game.status === 'in'
	&& typeof game.yardLine === 'number'
	&& typeof game.down === 'number' && game.down >= 1
	&& typeof game.distance === 'number' && game.distance >= 0
	&& game.fieldPosition !== undefined
);

const resolvePossession = (game: Game): 'home' | 'away' | null => {
	if (game.possessionTeamId === game.homeTeam.id) return 'home';
	if (game.possessionTeamId === game.awayTeam.id) return 'away';
	return null;
};

const resolveFirstDownYardLine = (game: Game, possession: 'home' | 'away'): number | null => {
	const { yardLine, distance } = game;
	if (typeof yardLine !== 'number' || typeof distance !== 'number' || distance <= 0) return null;
	// Clamped rather than special-cased for goal to go. ESPN sets `distance` to exactly the yards
	// remaining there, so the ordinary arithmetic already lands on the paint and the line to gain
	// simply recolours the goal line — which at 2.4px to the yard is the same column of pixels.
	return clampToField(possession === 'home' ? yardLine + distance : yardLine - distance);
};

// A drive bar is only drawn for ground actually gained. That is partly because a bar shorter than
// the ball marker says nothing, and mostly because `lastPlay.drive` still describes the *previous*
// team's drive for the one poll after a change of possession — a punt leaves it pointing tens of
// yards the wrong way, and every one of those stale reads is negative in the new offense's
// direction. A genuine drive that has lost ground is rare and costs only its own bar.
const resolveDriveStartX = (game: Game, possession: 'home' | 'away' | null): number | null => {
	const { driveStartYardLine, yardLine } = game;
	if (possession === null || typeof driveStartYardLine !== 'number' || typeof yardLine !== 'number') return null;
	// A drive never opens on a goal line. ESPN publishes exactly 0 or 100 as a placeholder on a
	// drive it has only just opened — three live games carried `drive.start.yardLine: 0` under a
	// truthful "1 play, 5 yards" description at the same moment — and taking it literally would
	// draw the length of the field as ground gained. That one inflates the gain rather than
	// inverting it, so the stale-possession guard below sails straight past it.
	if (driveStartYardLine <= 0 || driveStartYardLine >= fieldYards) return null;
	const gained = possession === 'home' ? yardLine - driveStartYardLine : driveStartYardLine - yardLine;
	return gained > 0 ? yardLineToX(driveStartYardLine) : null;
};

export const resolveFieldDiagram = (game: Game): FieldDiagram | null => {
	if (!isFootballSituation(game)) return null;
	const possession = resolvePossession(game);
	const firstDownYardLine = possession === null ? null : resolveFirstDownYardLine(game, possession);

	return {
		ballX: yardLineToX(clampToField(game.yardLine!)),
		firstDownX: typeof firstDownYardLine === 'number' ? yardLineToX(firstDownYardLine) : null,
		driveStartX: resolveDriveStartX(game, possession),
		possession,
		drivesRight: possession === null ? null : possession === 'away',
	};
};

// ESPN clears the down and the yard marker at every dead ball, which would otherwise take the whole
// strip off the screen at a timeout — one of the moments somebody is most likely to be looking at
// it. The ball is still sitting on the field then and play resumes from that exact spot, so the
// frame is held. After a score the same fields clear but the yardLine also jumps to a meaningless
// value, and whether the yard line moved is what tells the two states apart.
//
// Overtime needs nothing here. Both college teams attack the same physical end zone in a given
// overtime period, and ESPN does not represent that — it normalizes overtime into the ordinary
// home/away frame, which is exactly what keeps the direction rule above working.
export const resolveFieldFrame = (game: Game, held: FieldFrame | null): FieldFrame | null => {
	const diagram = resolveFieldDiagram(game);
	if (diagram !== null) return { gameId: game.id, yardLine: game.yardLine!, diagram };
	if (held !== null && held.gameId === game.id && game.yardLine === held.yardLine) return held;
	return null;
};

import type { Game } from '@arenaswap/core/types';

// The strip is drawn in yards, so an SVG viewBox of `0 0 120 10` lets every x coordinate below be
// a real field measurement rather than a pixel derived from one.
export const fieldYards = 100;
export const endZoneYards = 10;
export const stripYards = fieldYards + endZoneYards * 2;

// ESPN's yardLine is absolute: 0 is the home team's own goal line, 100 is the away team's. The
// strip puts the away end zone on the left so the field's two halves sit under the crests that own
// them — the hero card already washes away-colour left and home-colour right — which leaves the
// away offense driving left to right and the home offense right to left.
export const yardLineToX = (yardLine: number): number => endZoneYards + (fieldYards - yardLine);

export const awayEndZoneX = 0;
export const homeEndZoneX = endZoneYards + fieldYards;

// 10 through 90 in yards from the away goal line, labelled the way the field is actually painted:
// mirrored about the 50 and identical whichever way the offense happens to be moving.
export const yardNumbers = [10, 20, 30, 40, 50, 60, 70, 80, 90].map(fromAwayGoal => ({
	x: endZoneYards + fromAwayGoal,
	label: fromAwayGoal > 50 ? fieldYards - fromAwayGoal : fromAwayGoal,
	isMidfield: fromAwayGoal === 50,
}));

// --- Cross-field geometry --------------------------------------------------
// A field is 53 1/3 yards from sideline to sideline, which against 120 yards of length would make
// the strip 128px tall inside a 320px popup. The viewBox squashes that into 32, so every y below is
// a real cross-field measurement put through `acrossToY`. Glyphs are the exception and are drawn at
// their own legible size: a painted numeral is 2 yards tall, which lands under 3px here.
export const fieldWidthYards = 160 / 3;
export const stripHeight = 32;

export const acrossToY = (fromSideline: number): number => (fromSideline / fieldWidthYards) * stripHeight;

// The one marking the two codes genuinely disagree about. The NFL sets its hashes 70'9" from each
// sideline, which puts them 18'6" apart — narrower than the goal posts, so every play starts near
// the middle of the field. College hashes are 60' from each sideline and 40' apart, which is why a
// college offense has a real wide side and short side to work with.
const hashInsetYards: Record<string, number> = {
	nfl: 70.75 / 3,
	ncaaf: 20,
};

export const resolveHashRows = (league: string): [number, number] => {
	const inset = hashInsetYards[league] ?? hashInsetYards.nfl!;
	return [acrossToY(inset), acrossToY(fieldWidthYards - inset)];
};

// A hash mark is 4 inches wide by 24 inches long and painted at every single yard, and the 24 inches
// run *lengthwise* — parallel to the sideline, straddling the yard rather than crossing it. That is
// what makes a hash row read as a near-solid dashed line from above instead of as countable ticks:
// a 24 inch mark on a 36 inch pitch leaves a gap of only a foot. Drawing them across the field
// instead would be twice as legible and simply not what a field looks like.
//
// They go out as one path rather than 198 elements, and they skip the yard lines themselves, since
// a mark painted on top of a line is just the line. The end zones carry none: both rulebooks scope
// hashes to the field of play.
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

// Painted numerals sit 12 yards in from each sideline, mirrored top and bottom, and the numeral is
// what the arrow beside it points away from — always toward the nearer goal line, which is what
// tells a player which way is downfield when the number alone reads the same from both directions.
export const numberRowsY: [number, number] = [acrossToY(12), acrossToY(fieldWidthYards - 12)];

export interface FieldDiagram {
	// All three are x coordinates in the same 0-120 yard space as `yardLineToX`.
	ballX: number;
	firstDownX: number | null;
	driveStartX: number | null;
	possession: 'home' | 'away' | null;
	// The direction the offense is moving across the strip. Null while possession is unknown.
	drivesRight: boolean | null;
}

export interface FieldFrame {
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

// Where the line to gain sits, in ESPN's absolute yardLine coordinates, or null to draw no line at
// all. The offense advances toward the end zone it is attacking — the home team toward yardLine
// 100, the away team toward 0 — so `distance` is added in one direction and subtracted in the
// other.
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
	if (diagram !== null) return { yardLine: game.yardLine!, diagram };
	if (held !== null && game.yardLine === held.yardLine) return held;
	return null;
};

import type { teamSide } from './scoreConfettiHelpers';

export interface screenBox {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface confettiStage {
	locateTeam: (gameId: string, side: teamSide) => screenBox | null;
	visibleArea: () => screenBox | null;
}

export interface confettiLaunch {
	origin: { x: number; y: number };
	angle: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// canvas-confetti measures angles counter-clockwise from pointing right, so 90 fires straight up.
const angleTowardTheMiddle = (x: number, y: number, visible: screenBox): number => {
	if (y < visible.top) return 270;
	if (y > visible.bottom) return 90;
	if (x < visible.left) return 0;
	if (x > visible.right) return 180;
	return 90;
};

// A team in view gets confetti from its crest. A team scrolled out of view gets it from the edge
// it is hiding past, fired back into the list, so the burst never looks like it came from whichever
// card happens to be sitting where the real one isn't.
export const launchFromTeam = (team: screenBox, visible: screenBox, canvas: screenBox): confettiLaunch => {
	const x = (team.left + team.right) / 2;
	const y = (team.top + team.bottom) / 2;
	return {
		origin: {
			x: (clamp(x, visible.left, visible.right) - canvas.left) / (canvas.right - canvas.left),
			y: (clamp(y, visible.top, visible.bottom) - canvas.top) / (canvas.bottom - canvas.top),
		},
		angle: angleTowardTheMiddle(x, y, visible),
	};
};

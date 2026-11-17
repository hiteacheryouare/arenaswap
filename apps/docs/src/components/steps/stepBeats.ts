import { heroGames, heroTickCount } from '../hero/heroGames';
import { openingIndex, replayThrough } from '../hero/heroTimeline';

export type CursorSpot = 'rest' | 'newTab' | 'toggle' | 'option';

export interface CursorFrame {
	spot: CursorSpot;
	pressed: boolean;
}

export interface OpenFrame {
	tabCount: number;
	loading: boolean;
	cursor: CursorFrame;
}

export interface AssignFrame {
	open: boolean;
	assigned: boolean;
	cursor: CursorFrame;
}

export interface BestFrame {
	onScreen: number;
}

export interface StepFrames {
	open: OpenFrame;
	assign: AssignFrame;
	best: BestFrame;
}

interface Beat {
	at: number;
	open?: Partial<OpenFrame>;
	assign?: Partial<AssignFrame>;
	best?: Partial<BestFrame>;
}

export const assignGameIndex = 1;

const bestHops = replayThrough(heroTickCount - 1).switches.map(hop => heroGames.findIndex(game => game.tabTitle === hop.to));

const press = (spot: CursorSpot): CursorFrame => ({ spot, pressed: true });
const point = (spot: CursorSpot): CursorFrame => ({ spot, pressed: false });

const openTab = (from: number, tabCount: number): Beat[] => [
	{ at: from, open: { cursor: point('newTab') } },
	{ at: from + 800, open: { cursor: press('newTab') } },
	{ at: from + 950, open: { cursor: point('newTab'), tabCount, loading: true } },
	{ at: from + 1650, open: { loading: false } },
];

const assignFrom = 4800;
const bestFrom = 9600;
const hopEvery = 1900;

export const stepBeats: Beat[] = [
	{
		at: 0,
		open: { tabCount: 1, loading: false, cursor: point('rest') },
		assign: { open: false, assigned: false, cursor: point('rest') },
		best: { onScreen: openingIndex },
	},
	...openTab(500, 2),
	...openTab(2400, 3),
	{ at: 4300, open: { cursor: point('rest') } },

	{ at: assignFrom, assign: { cursor: point('toggle') } },
	{ at: assignFrom + 800, assign: { cursor: press('toggle') } },
	{ at: assignFrom + 950, assign: { cursor: point('toggle'), open: true } },
	{ at: assignFrom + 1700, assign: { cursor: point('option') } },
	{ at: assignFrom + 2500, assign: { cursor: press('option') } },
	{ at: assignFrom + 2650, assign: { cursor: point('option'), open: false, assigned: true } },
	{ at: assignFrom + 3500, assign: { cursor: point('rest') } },

	...bestHops.map((onScreen, hop) => ({ at: bestFrom + (hop + 1) * hopEvery, best: { onScreen } })),
];

export const loopHoldMs = 2400;

export const stepPlayingAt = (beat: number): number => {
	const at = stepBeats[beat].at;
	return at < assignFrom ? 0 : at < bestFrom ? 1 : 2;
};

export const framesAt = (beat: number): StepFrames => {
	const frames = { ...stepBeats[0] } as Required<Omit<Beat, 'at'>>;
	for (let index = 1; index <= beat; index++) {
		const { open, assign, best } = stepBeats[index];
		if (open) frames.open = { ...frames.open, ...open };
		if (assign) frames.assign = { ...frames.assign, ...assign };
		if (best) frames.best = { ...frames.best, ...best };
	}
	return frames as StepFrames;
};

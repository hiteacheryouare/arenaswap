import { i18n } from '#i18n';

export type Phase =
	| 'prelaunch'
	| 'cruising'
	| 'lightspeed'
	| 'ridiculous'
	| 'ludicrous'
	| 'plaidentry'
	| 'plaid'
	| 'panic'
	| 'stopping';

// Which camera the sequence is cutting to. The run opens and ends on the bridge, watches the
// takeoff and the slowdown from behind the ship, and spends the speed steps inside the warp.
export type View = 'cockpit' | 'rear' | 'full';

export interface DisplayState {
	text: string;
	cls: string;
}

export interface Beat {
	ms: number;
	phase?: Phase;
	view?: View;
	speed?: number;
	display?: DisplayState;
	brake?: 'visible' | 'pressed';
	logos?: boolean;
	end?: boolean;
}

const line = (text: string, ms: number, cls: string): Beat => ({
	ms,
	display: { text, cls },
});

export const buildScript = (): Beat[] => [
	{ ms: 1500, view: 'cockpit', display: { text: i18n.t('ludicrousSpeed.intro.l1'), cls: 'dialogue prelaunch' } },
	line(i18n.t('ludicrousSpeed.intro.l2'), 1700, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.intro.l3'), 1200, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.intro.l4'), 1400, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.intro.l5'), 1500, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.intro.l6'), 1100, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.intro.l7'), 1500, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.intro.l8'), 1700, 'dialogue prelaunch'),

	line(i18n.t('ludicrousSpeed.prelaunch.l1'), 1300, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l2'), 1600, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l3'), 1700, 'dialogue prelaunch'),
	// The list of preparations is a run-on gag; each item is clipped so it gathers pace.
	line(i18n.t('ludicrousSpeed.prelaunch.l4'), 1100, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l5'), 1150, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l6'), 1150, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l7'), 1150, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l8'), 1000, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l9'), 1600, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l10'), 1600, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l11'), 1200, 'dialogue prelaunch'),
	line(i18n.t('ludicrousSpeed.prelaunch.l12'), 1100, 'dialogue prelaunch'),

	{ ms: 1500, display: { text: i18n.t('ludicrousSpeed.announce'), cls: 'announce' } },

	{ ms: 1300, view: 'rear', phase: 'cruising', speed: 5.5, display: { text: i18n.t('ludicrousSpeed.go'), cls: 'go' } },
	{ ms: 1300, display: { text: '', cls: 'stars-only' } },
	line(i18n.t('ludicrousSpeed.gforce.l1'), 1400, 'dialogue postlaunch'),
	{ ms: 1800, speed: 6.5, display: { text: i18n.t('ludicrousSpeed.gforce.l2'), cls: 'dialogue postlaunch' } },

	{ ms: 1900, view: 'full', phase: 'lightspeed', speed: 7.5, display: { text: i18n.t('ludicrousSpeed.signs.light'), cls: 'speedsign lightspeed' } },
	{ ms: 1900, phase: 'ridiculous', speed: 9.5, display: { text: i18n.t('ludicrousSpeed.signs.ridiculous'), cls: 'speedsign ridiculous' } },
	{ ms: 2000, phase: 'ludicrous', speed: 12.5, display: { text: i18n.t('ludicrousSpeed.signs.ludicrous'), cls: 'speedsign ludicrous' } },

	// The starlines elongate and the weave resolves out of them. The sign stays up through it: the
	// ship is at ludicrous speed for the whole transition, and the word PLAID has not been said yet.
	{ ms: 1900, phase: 'plaidentry', speed: 14 },
	{ ms: 1700, phase: 'plaid', display: { text: i18n.t('ludicrousSpeed.signs.plaid'), cls: 'plaid-rect' } },
	{ ms: 1900, logos: true, display: { text: '', cls: 'stars-only' } },

	/* The cut lands before the line does. "We passed them!" is the payoff the whole fly-by sets up,
	   and it cannot share its entrance with a camera change, the brake arriving and the logos still
	   going — so it gets the screen to itself and it gets held. */
	{ ms: 900, view: 'cockpit', phase: 'panic', speed: 10, logos: true, display: { text: '', cls: 'stars-only' } },
	{ ms: 2600, logos: true, display: { text: i18n.t('ludicrousSpeed.panic.l1'), cls: 'dialogue panic' } },

	// The brake arrives under a line already on screen, and stays live for nearly nine seconds. The
	// label says NEVER USE, so the joke needs long enough to notice it, think about it and reach it.
	{ ms: 1500, brake: 'visible' },
	line(i18n.t('ludicrousSpeed.panic.l2'), 1900, 'dialogue panic'),
	line(i18n.t('ludicrousSpeed.panic.l3'), 1900, 'dialogue panic'),
	line(i18n.t('ludicrousSpeed.panic.l4'), 2000, 'dialogue panic'),
	{ ms: 1600, display: { text: '', cls: 'stars-only' } },

	{ ms: 900, brake: 'pressed' },
	{ ms: 3600, view: 'rear', phase: 'stopping', speed: 0, display: { text: i18n.t('ludicrousSpeed.stop'), cls: 'stop' } },
	// The ship coming off its speed is a beat of its own, so the last thing on screen is it at rest.
	{ ms: 1200, display: { text: '', cls: 'stars-only' } },
	{ ms: 0, end: true },
];

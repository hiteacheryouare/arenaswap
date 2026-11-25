import { i18n } from '#i18n';

export type Phase =
	| 'prelaunch'
	| 'windup'
	| 'cruising'
	| 'lightspeed'
	| 'ridiculous'
	| 'ludicrous'
	| 'plaidentry'
	| 'plaid'
	| 'panic'
	| 'stopping';

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

const readingCharsPerSecond = 20;

const readableMs = (text: string, ms: number): number => (
	Math.max(ms, Math.round((text.length / readingCharsPerSecond) * 1000))
);

const line = (text: string, ms: number, cls = 'dialogue'): Beat => ({
	ms: readableMs(text, ms),
	display: { text, cls },
});

const quiet = (ms: number, beat: Omit<Beat, 'ms' | 'display'> = {}): Beat => ({
	ms,
	...beat,
	display: { text: '', cls: 'stars-only' },
});

export const buildScript = (): Beat[] => [
	{ ...line(i18n.t('ludicrousSpeed.intro.l1'), 1500), view: 'cockpit' },
	line(i18n.t('ludicrousSpeed.intro.l2'), 1700),
	line(i18n.t('ludicrousSpeed.intro.l3'), 1200),
	line(i18n.t('ludicrousSpeed.intro.l4'), 1600),
	line(i18n.t('ludicrousSpeed.intro.l5'), 1500),
	line(i18n.t('ludicrousSpeed.intro.l6'), 1100),
	line(i18n.t('ludicrousSpeed.intro.l7'), 1500),
	line(i18n.t('ludicrousSpeed.intro.l8'), 1700),

	line(i18n.t('ludicrousSpeed.prelaunch.l1'), 1300),
	line(i18n.t('ludicrousSpeed.prelaunch.l2'), 1600),
	line(i18n.t('ludicrousSpeed.prelaunch.l3'), 1700),
	line(i18n.t('ludicrousSpeed.prelaunch.l4'), 1100),
	line(i18n.t('ludicrousSpeed.prelaunch.l5'), 1150),
	line(i18n.t('ludicrousSpeed.prelaunch.l6'), 1150),
	line(i18n.t('ludicrousSpeed.prelaunch.l7'), 1150),
	line(i18n.t('ludicrousSpeed.prelaunch.l8'), 1000),
	line(i18n.t('ludicrousSpeed.prelaunch.l9'), 1600),
	line(i18n.t('ludicrousSpeed.prelaunch.l10'), 1600),
	line(i18n.t('ludicrousSpeed.prelaunch.l11'), 1200),
	line(i18n.t('ludicrousSpeed.prelaunch.l12'), 1100),

	{ ...line(i18n.t('ludicrousSpeed.announce'), 1500, 'shout announce'), phase: 'windup', speed: 0.25 },

	{ ...line(i18n.t('ludicrousSpeed.go'), 1300, 'shout go'), view: 'rear', phase: 'cruising', speed: 5.5 },
	quiet(1000),

	{ ...line(i18n.t('ludicrousSpeed.gforce.l1'), 1400), view: 'cockpit', speed: 6.5 },
	{ ...line(i18n.t('ludicrousSpeed.gforce.l2'), 2000), phase: 'lightspeed', speed: 7.5 },
	quiet(1700, { phase: 'ridiculous', speed: 9.5 }),
	quiet(1900, { phase: 'ludicrous', speed: 12.5 }),

	quiet(1900, { view: 'full', phase: 'plaidentry', speed: 14 }),
	quiet(1700, { phase: 'plaid' }),
	quiet(1900, { logos: true }),

	quiet(900, { view: 'cockpit', phase: 'panic', speed: 10, logos: true }),
	{ ...line(i18n.t('ludicrousSpeed.panic.l1'), 2600), logos: true },

	{ ms: 1500, brake: 'visible' },
	line(i18n.t('ludicrousSpeed.panic.l2'), 1900),
	line(i18n.t('ludicrousSpeed.panic.l3'), 1900),
	line(i18n.t('ludicrousSpeed.panic.l4'), 2000),
	quiet(600),

	{ ms: 700, brake: 'pressed' },
	{ ...line(i18n.t('ludicrousSpeed.stop'), 2600, 'shout stop'), view: 'rear', phase: 'stopping', speed: 0 },
	{ ms: 0, end: true },
];

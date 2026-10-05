import type { Cue, ScoreSection } from '../../audio/score';
import type { Profile } from '../data/slate';

export type Format = 'landscape' | 'portrait';

export const frameSizes: Record<Format, { width: number; height: number }> = {
	landscape: { width: 1920, height: 1080 },
	portrait: { width: 1080, height: 1920 },
};

export type ShotKind =
	| 'wall'
	| 'browser'
	| 'flick'
	| 'popupOpen'
	| 'ranked'
	| 'assign'
	| 'swaps'
	| 'detail'
	| 'scorebugs'
	| 'boxScore'
	| 'settings'
	| 'guide'
	| 'leagues'
	| 'favorite'
	| 'payoff'
	| 'endCard';

// Seconds into the cut. `from` is inclusive, `to` exclusive; shots may overlap for a transition.
export interface Shot {
	kind: ShotKind;
	from: number;
	to: number;
}

export type SuperPlace = 'top' | 'center' | 'left' | 'bottom';

export interface Super {
	// A key in stage/locales/<locale>.json.
	key: string;
	from: number;
	to: number;
	place: SuperPlace;
}

// Film time to the moment of the night a popup is showing. Linear between keys, held outside them.
export interface ClockKey {
	at: number;
	slate: string;
}

export type PopupAction =
	| { at: number; kind: 'click'; selector: string }
	| { at: number; kind: 'scroll'; selector: string; to: number; over: number }
	| { at: number; kind: 'scrollTo'; selector: string; target: string; offset?: number; over: number }
	| { at: number; kind: 'profile'; profile: Profile }
	| { at: number; kind: 'value'; selector: string; value: string };

export interface PopupPlan {
	id: string;
	page: 'popup' | 'guide';
	// When the iframe is created. Popups that are not opened on camera load early and wait.
	loadAt: number;
	profile: Profile;
	reveal: 'full' | 'quick' | 'off';
	clock: ClockKey[];
	// Tabs registered before the popup loads; the main popup instead assigns them on camera.
	registered: boolean;
	actions: PopupAction[];
	width?: number;
	height?: number;
}

// The browser window's own timeline: which tab is in front, and how it got there.
export interface TabSwitch {
	at: number;
	tabId: number;
	// 'swap' is ArenaSwap switching (solid arrow), 'back' is ArenaSwap returning (dashed arrow),
	// 'flick' is somebody hammering Ctrl+Tab.
	via: 'cut' | 'swap' | 'back' | 'flick';
}

export interface Cut {
	id: '15' | '30' | '60';
	bars: number;
	duration: number;
	sections: ScoreSection[];
	shots: Shot[];
	supers: Super[];
	popups: PopupPlan[];
	tabs: TabSwitch[];
	// From here on the tabs are registered, so ArenaSwap mutes every one but the tab in front.
	managedFrom: number;
	cues: Cue[];
}

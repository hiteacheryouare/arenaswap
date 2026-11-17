import type { UserPreferences } from '@arenaswap/core/types';
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
	| 'settings'
	| 'guide'
	| 'leagues'
	| 'favorite'
	| 'payoff'
	| 'card'
	| 'pregame'
	| 'standby'
	| 'endCard'
	| 'credits'
	| 'signature'
	| 'legal';

export type CardOrigin = { popup: string; selector: string } | 'leagueDot';

export interface Ending {
	balls: number[];
	plainAgain: number;
	landsAt: number;
	beatScale: number;
}

export interface Shot {
	kind: ShotKind;
	from: number;
	to: number;
	origin?: CardOrigin;
	ending?: Ending;
}

export type SuperPlace = 'top' | 'center' | 'left' | 'bottom' | 'card';

export interface Super {
	key: string;
	from: number;
	to: number;
	place: SuperPlace;
	animate?: 'words';
}

export interface ClockKey {
	at: number;
	slate: string;
}

export type PopupAction =
	| { at: number; kind: 'click'; selector: string }
	| { at: number; kind: 'scroll'; selector: string; to: number; over: number }
	| { at: number; kind: 'scrollTo'; selector: string; target: string; offset?: number; over: number }
	| { at: number; kind: 'profile'; profile: Profile }
	| { at: number; kind: 'value'; selector: string; value: string }
	| { at: number; kind: 'hide'; selector: string };

export interface PopupPlan {
	id: string;
	page: 'popup' | 'guide';
	loadAt: number;
	profile: Profile;
	reveal: 'full' | 'quick' | 'off';
	clock: ClockKey[];
	registered: boolean;
	source?: 'pregame';
	prefs?: Partial<UserPreferences>;
	standbyAt?: number;
	actions: PopupAction[];
	width?: number;
	height?: number;
}

export interface TabSwitch {
	at: number;
	tabId: number;
	via: 'cut' | 'swap' | 'back' | 'standby' | 'flick';
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
	tabsRegisteredFrom: number;
	landsAt: number;
	cues: Cue[];
}

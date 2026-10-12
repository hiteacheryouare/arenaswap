import type { BackgroundState, GuideSlate } from '../../../../packages/core/src/types';

export interface PopupBoot {
	messages: Record<string, { message: string }>;
	state: BackgroundState;
	tabs: { id: number; title: string; url: string }[];
	local: Record<string, unknown>;
	session: Record<string, unknown>;
	sync: Record<string, unknown>;
	guideSlate: GuideSlate;
	// window.localStorage entries to set (or, for null, clear) before the app reads them.
	localStorage: Record<string, string | null>;
}

// What the stage exposes on its window for the popups it hosts.
export interface FilmHost {
	boot: (popupId: string) => PopupBoot;
	slateNow: (popupId: string) => number;
	summaryAt: (gameId: string, ts: number) => Record<string, unknown> | undefined;
}

// What a booted popup exposes back.
export interface PopupHandle {
	push: (state: BackgroundState) => void;
	sent: { type: string; [key: string]: unknown }[];
	registry: () => { tabId: number; gameId: string }[];
}

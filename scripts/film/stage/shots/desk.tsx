import type { CSSProperties } from 'react';
import BrowserWindow, { type TabView } from '../components/browserWindow';
import type { Cut, Format } from '../cuts/cutTypes';
import { slateTimeAt } from '../popup/popupHost';
import { easeSignature, lerp, progress } from '../timing';
import type { ShotContext } from './shotTypes';

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DeskLayout {
	window: Rect;
	windowZoom: number;
	popup: { x: number; y: number; scale: number };
}

// The browser and the popup side by side, as they sit on a real screen. In landscape the popup
// hangs from the extension button as Chrome draws it; in portrait it stacks under the window.
export const deskLayouts: Record<Format, DeskLayout> = {
	landscape: {
		window: { x: 96, y: 214, width: 1240, height: 800 },
		windowZoom: 1.32,
		popup: { x: 1262, y: 322, scale: 1.3 },
	},
	portrait: {
		window: { x: 40, y: 330, width: 1000, height: 560 },
		windowZoom: 1.12,
		popup: { x: 284, y: 918, scale: 1.6 },
	},
};

// The window alone, before the popup opens.
export const soloLayouts: Record<Format, { window: Rect; windowZoom: number }> = {
	landscape: { window: { x: 240, y: 230, width: 1440, height: 790 }, windowZoom: 1.45 },
	portrait: { window: { x: 40, y: 560, width: 1000, height: 760 }, windowZoom: 1.12 },
};

const wipeSeconds = 0.42;

export const tabViewAt = (cut: Cut, t: number): TabView => {
	const happened = cut.tabs.filter(change => change.at <= t);
	const current = happened[happened.length - 1] ?? cut.tabs[0]!;
	const previous = happened[happened.length - 2];
	const managed = t >= cut.managedFrom;
	if ((current.via === 'swap' || current.via === 'back') && previous) {
		return {
			activeTabId: current.tabId,
			previousTabId: previous.tabId,
			wipe: easeSignature(progress(t, current.at, current.at + wipeSeconds)),
			wipeFrom: current.via === 'swap' ? 'left' : 'right',
			managed,
		};
	}
	return { activeTabId: current.tabId, managed };
};

// The moment of the night the browser shows: the main popup's, once it exists.
export const browserSlateTime = (ctx: ShotContext) => {
	const main = ctx.cut.popups.find(plan => plan.id === 'main')!;
	return slateTimeAt(main.clock, ctx.t);
};

export const mixRect = (from: Rect, to: Rect, amount: number): Rect => ({
	x: lerp(from.x, to.x, amount),
	y: lerp(from.y, to.y, amount),
	width: lerp(from.width, to.width, amount),
	height: lerp(from.height, to.height, amount),
});

export const Desk = ({ ctx, rect, zoom, style, flash }: { ctx: ShotContext; rect: Rect; zoom: number; style?: CSSProperties; flash?: number }) => (
	<BrowserWindow
		view={tabViewAt(ctx.cut, ctx.t)}
		slate={ctx.slate}
		slateTime={browserSlateTime(ctx)}
		t={ctx.t}
		width={rect.width}
		height={rect.height}
		zoom={zoom}
		flash={flash}
		style={{ position: 'absolute', left: rect.x / zoom, top: rect.y / zoom, ...style }}
	/>
);

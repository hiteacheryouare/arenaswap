import type { ReactNode } from 'react';
import type { Cut, Format, Shot } from '../cuts/cutTypes';
import type { Slate } from '../data/slate';
import type { PopupHostApi } from '../popup/popupHost';
import type { Measure } from '../measure';

export interface ShotContext {
	t: number;
	// Seconds since this shot started.
	local: number;
	shot: Shot;
	cut: Cut;
	format: Format;
	width: number;
	height: number;
	slate: Slate;
	host: PopupHostApi;
	copy: (key: string) => string;
}

export interface PopupPlacement {
	id: string;
	x: number;
	y: number;
	scale: number;
	opacity: number;
	// Rounded-corner clip and drop shadow, as the browser draws a popup.
	chrome?: boolean;
	// The part of the page to show, in the page's own pixels. Shifted so the visible part sits at x, y.
	crop?: { top: number; right: number; bottom: number; left: number };
	rotate?: number;
}

export interface Point {
	x: number;
	y: number;
}

export interface ArrowState {
	kind: 'solid' | 'dashed';
	from: Point;
	to: Point;
	// How much of the line is drawn, from `from`.
	drawn: number;
	opacity: number;
	// Thickness of the line in px; the head scales with it.
	weight: number;
}

export interface DotState extends Point {
	radius: number;
	opacity: number;
}

export interface OverlayState {
	dot?: DotState;
	arrows?: ArrowState[];
}

export interface Camera {
	scale: number;
	// The point in the frame that stays put while the camera scales.
	originX: number;
	originY: number;
	x?: number;
	y?: number;
}

export interface ShotModule {
	Component: (props: { ctx: ShotContext }) => ReactNode;
	popups?: (ctx: ShotContext) => PopupPlacement[];
	overlay?: (ctx: ShotContext, measure: Measure) => OverlayState;
	camera?: (ctx: ShotContext) => Camera;
}

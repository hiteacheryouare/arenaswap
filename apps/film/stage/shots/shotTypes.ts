import type { ReactNode } from 'react';
import type { Cut, Format, Shot } from '../cuts/cutTypes';
import type { Slate } from '../data/slate';
import type { PopupHostApi } from '../popup/popupHost';
import type { Measure } from '../measure';

export interface ShotContext {
	t: number;
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
	chrome?: boolean;
	crop?: { top: number; right: number; bottom: number; left: number };
	rotate?: number;
}

export interface Point {
	x: number;
	y: number;
}

export interface DotState extends Point {
	radius: number;
	opacity: number;
	color?: string;
}

export interface OverlayState {
	dot?: DotState;
}

export interface ShotModule {
	Component: (props: { ctx: ShotContext }) => ReactNode;
	popups?: (ctx: ShotContext) => PopupPlacement[];
	overlay?: (ctx: ShotContext, measure: Measure) => OverlayState;
}

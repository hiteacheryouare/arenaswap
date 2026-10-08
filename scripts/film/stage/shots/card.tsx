import { cardTiming } from '../cuts/shared';
import type { Measure } from '../measure';
import { easeIn, easeInOut, lerp, progress, spring } from '../timing';
import { leagueDotPoint } from './montageShots';
import type { Point, ShotContext, ShotModule } from './shotTypes';

const coverRadius = (ctx: ShotContext, point: Point) => Math.max(
	Math.hypot(point.x, point.y),
	Math.hypot(ctx.width - point.x, point.y),
	Math.hypot(point.x, ctx.height - point.y),
	Math.hypot(ctx.width - point.x, ctx.height - point.y),
) + 4;

const originPoint = (ctx: ShotContext, measure: Measure): { point: Point; radius: number } => {
	const origin = ctx.shot.origin;
	if (origin === 'leagueDot') return leagueDotPoint(ctx);
	const box = origin ? measure.inPopup(origin.popup, origin.selector) : null;
	if (box) return { point: { x: box.cx, y: box.cy }, radius: box.width / 2 };
	console.error(`Orange card at ${ctx.shot.from}s found no origin; growing from the frame centre`);
	return { point: { x: ctx.width / 2, y: ctx.height / 2 }, radius: 10 };
};

// The point the card grew from, kept so it shrinks back about exactly the same place.
const origins = new Map<number, { point: Point; radius: number }>();

// The dot swells out of the shot before until the frame is orange, holds for the line, then shrinks
// back down about the same point until it is gone.
const cardOverlay = (ctx: ShotContext, measure: Measure) => {
	const { local } = ctx;
	const { swell: swellSeconds, open: openSeconds, close: closeSeconds } = cardTiming;
	const length = ctx.shot.to - ctx.shot.from;
	if (local < swellSeconds + openSeconds) origins.set(ctx.shot.from, originPoint(ctx, measure));
	const { point, radius } = origins.get(ctx.shot.from) ?? originPoint(ctx, measure);
	const swell = lerp(radius, radius * 2.4, spring(local, swellSeconds));
	const open = easeIn(progress(local, swellSeconds, swellSeconds + openSeconds));
	const close = easeInOut(progress(local, length - closeSeconds, length));
	return { dot: { ...point, radius: lerp(swell, coverRadius(ctx, point), open) * (1 - close), opacity: 1 } };
};

const Empty = () => null;

const card: ShotModule = {
	Component: Empty,
	overlay: cardOverlay,
};

export default card;

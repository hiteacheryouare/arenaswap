import type { Measure } from '../measure';
import { tabById } from '../data/tabs';
import { easeIn, easeInOut, easeSignature, lerp, progress, spring, window01 } from '../timing';
import { Desk, deskLayouts, mixRect, soloLayouts } from './desk';
import { filmTimeOf } from '../popup/popupHost';
import { sat } from '../cuts/shared';
import type { ArrowState, Camera, OverlayState, PopupPlacement, ShotContext, ShotModule } from './shotTypes';

const popupWidth = 320;

const deskPopup = (ctx: ShotContext, opacity = 1): PopupPlacement => {
	const { popup } = deskLayouts[ctx.format];
	return { id: 'main', x: popup.x, y: popup.y, scale: popup.scale, opacity };
};

const DeskShot = ({ ctx }: { ctx: ShotContext }) => {
	const layout = deskLayouts[ctx.format];
	return <Desk ctx={ctx} rect={layout.window} zoom={layout.windowZoom} />;
};

// The popup brought forward on its own, with the window stepped back behind it, for the shots
// where the copy needs the frame. `amount` 0 is the desk, 1 is the feature.
const featureLayouts = {
	landscape: { popup: { x: 1150, y: 58, scale: 1.72 }, windowShift: { x: -260, y: 0 } },
	portrait: { popup: { x: 172, y: 470, scale: 2.3 }, windowShift: { x: 0, y: -260 } },
};

const FeatureDesk = ({ ctx, amount }: { ctx: ShotContext; amount: number }) => {
	const layout = deskLayouts[ctx.format];
	const shift = featureLayouts[ctx.format].windowShift;
	const rect = { ...layout.window, x: layout.window.x + shift.x * amount, y: layout.window.y + shift.y * amount };
	return <Desk ctx={ctx} rect={rect} zoom={layout.windowZoom} style={{ opacity: 1 - 0.82 * amount }} />;
};

const featurePopup = (ctx: ShotContext, amount: number): PopupPlacement => {
	const desk = deskLayouts[ctx.format].popup;
	const feature = featureLayouts[ctx.format].popup;
	return { id: 'main', x: lerp(desk.x, feature.x, amount), y: lerp(desk.y, feature.y, amount), scale: lerp(desk.scale, feature.scale, amount), opacity: 1 };
};

// In over the shot's first stretch, or out of it when `leaving`.
const featureAmount = (ctx: ShotContext, leaving: boolean) => {
	const blend = easeInOut(progress(ctx.local, 0, 0.75));
	return leaving ? 1 - blend : blend;
};

const featureShot = (leaving: boolean, extra: Partial<ShotModule> = {}): ShotModule => ({
	Component: ({ ctx }) => <FeatureDesk ctx={ctx} amount={featureAmount(ctx, leaving)} />,
	popups: ctx => [featurePopup(ctx, featureAmount(ctx, leaving))],
	...extra,
});

const followsFavorite = (ctx: ShotContext) => ctx.cut.shots[ctx.cut.shots.indexOf(ctx.shot) - 1]?.kind === 'favorite';

// A point on the popup's top card, in frame pixels, for the camera to push toward.
const topCardFocus = (ctx: ShotContext) => {
	const { popup } = deskLayouts[ctx.format];
	return { originX: popup.x + (popupWidth * popup.scale) / 2, originY: popup.y + 250 * popup.scale };
};

// ─── The popup opens ─────────────────────────────────────────────────────────────────────────
const PopupOpen = ({ ctx }: { ctx: ShotContext }) => {
	const solo = soloLayouts[ctx.format];
	const desk = deskLayouts[ctx.format];
	const slide = easeSignature(progress(ctx.local, 0, 0.95));
	return <Desk ctx={ctx} rect={mixRect(solo.window, desk.window, slide)} zoom={solo.windowZoom + (desk.windowZoom - solo.windowZoom) * slide} />;
};

const popupOpen: ShotModule = {
	Component: PopupOpen,
	popups: ctx => {
		const grow = easeSignature(progress(ctx.local, 0.3, 1.05));
		const { popup } = deskLayouts[ctx.format];
		const scale = popup.scale * (0.72 + 0.28 * grow);
		const fullWidth = popupWidth * popup.scale;
		const portrait = ctx.format === 'portrait';
		return [{
			id: 'main',
			// Grows out of the extension button in landscape, rises into place in portrait.
			x: portrait ? popup.x + (fullWidth - popupWidth * scale) / 2 : popup.x + fullWidth - popupWidth * scale - 40 * (1 - grow),
			y: popup.y + (portrait ? (1 - grow) * 120 : -(1 - grow) * 18),
			scale,
			opacity: grow,
		}];
	},
};

// ─── The ranked list, and the push into a PowerScore ─────────────────────────────────────────
const ranked = featureShot(false);

// ─── Tabs assigned from the suggestions ──────────────────────────────────────────────────────
const assign = featureShot(true);

// ─── ArenaSwap switching, with the dot and the swap arrows ───────────────────────────────────
const cardSelector = (gameId: string) => `[data-glide-key="${gameId}"] .game-card`;

const hopSeconds = 0.32;
const drawSeconds = 0.3;

const arc = (from: { x: number; y: number }, to: { x: number; y: number }, amount: number, lift: number) => ({
	x: lerp(from.x, to.x, amount),
	y: lerp(from.y, to.y, amount) - Math.sin(Math.PI * amount) * lift,
});

export const switchOverlay = (ctx: ShotContext, measure: Measure): OverlayState => {
	const portrait = ctx.format === 'portrait';
	const weight = portrait ? 7 : 8;
	const radius = portrait ? 9 : 10;
	const arrows: ArrowState[] = [];
	let dot: OverlayState['dot'];

	const changes = ctx.cut.tabs.filter(change => change.via === 'swap' || change.via === 'back');
	for (const change of changes) {
		const start = change.at - hopSeconds - drawSeconds;
		if (ctx.t < start || ctx.t > change.at + 0.6) continue;
		const index = ctx.cut.tabs.indexOf(change);
		const previous = ctx.cut.tabs[index - 1];
		if (!previous) continue;
		const fromCard = measure.inPopup('main', cardSelector(tabById(previous.tabId).gameId));
		const toCard = measure.inPopup('main', cardSelector(tabById(change.tabId).gameId));
		const tab = measure.inStage(`[data-film-tab="${change.tabId}"]`);
		if (!fromCard || !toCard || !tab) continue;

		const cardPoint = (box: { x: number; y: number; width: number; height: number; cx: number; cy: number }) => (
			portrait ? { x: box.cx, y: box.y + 14 } : { x: box.x + 14, y: box.cy }
		);
		const tabPoint = { x: tab.cx, y: tab.y + tab.height - 4 };
		const hop = easeInOut(progress(ctx.t, start, start + hopSeconds));
		const draw = easeSignature(progress(ctx.t, start + hopSeconds, change.at));
		const fade = 1 - easeIn(progress(ctx.t, change.at + 0.1, change.at + 0.55));

		if (ctx.t < start + hopSeconds) {
			dot = { ...arc(cardPoint(fromCard), cardPoint(toCard), hop, 46), radius: radius * spring(ctx.t - start, 0.25), opacity: 1 };
		} else {
			const from = cardPoint(toCard);
			const head = { x: lerp(from.x, tabPoint.x, draw), y: lerp(from.y, tabPoint.y, draw) };
			arrows.push({ kind: change.via === 'swap' ? 'solid' : 'dashed', from, to: tabPoint, drawn: draw, opacity: fade, weight });
			dot = { ...head, radius: radius * (1 - easeIn(progress(ctx.t, change.at, change.at + 0.35))), opacity: 1 };
		}
	}
	return { dot, arrows };
};

const swaps: ShotModule = {
	Component: DeskShot,
	popups: ctx => [deskPopup(ctx)],
	overlay: switchOverlay,
};

// ─── Starring Kentucky ───────────────────────────────────────────────────────────────────────
const starSelector = 'button[data-team-star="true"][aria-label="Remove UK from favorites"], button[data-team-star="true"][aria-label="Add UK to favorites"]';

const favorite = featureShot(false, {
	overlay: (ctx, measure) => {
		const action = ctx.cut.popups.find(plan => plan.id === 'main')?.actions.find(candidate => candidate.kind === 'click' && candidate.selector.includes('favorites'));
		if (!action) return {};
		const star = measure.inPopup('main', starSelector);
		if (!star) return {};
		const pop = window01(ctx.t, action.at - 0.18, action.at + 0.35, 0.16);
		return { dot: { x: star.cx, y: star.cy, radius: 12 * pop, opacity: pop } };
	},
});

// ─── Overtime ────────────────────────────────────────────────────────────────────────────────
// Kentucky's touchdown and two-point conversion, found on the main popup's own clock so the light
// lands on whatever frame the score does.
const scoringMoments = (ctx: ShotContext) => {
	const clock = ctx.cut.popups.find(plan => plan.id === 'main')!.clock;
	return {
		touchdown: filmTimeOf(clock, sat('8:01:49'), ctx.shot.from, ctx.shot.to),
		conversion: filmTimeOf(clock, sat('8:02:51'), ctx.shot.from, ctx.shot.to),
	};
};

const PayoffDesk = ({ ctx }: { ctx: ShotContext }) => {
	const { touchdown, conversion } = scoringMoments(ctx);
	const flash = Math.max(
		touchdown > ctx.shot.from + 0.05 ? 0.55 * window01(ctx.t, touchdown, touchdown + 0.7, 0.08) : 0,
		window01(ctx.t, conversion, conversion + 0.9, 0.08),
	);
	const amount = followsFavorite(ctx) ? featureAmount(ctx, true) : 0;
	const layout = deskLayouts[ctx.format];
	const shift = featureLayouts[ctx.format].windowShift;
	const rect = { ...layout.window, x: layout.window.x + shift.x * amount, y: layout.window.y + shift.y * amount };
	return <Desk ctx={ctx} rect={rect} zoom={layout.windowZoom} flash={flash} style={{ opacity: 1 - 0.82 * amount }} />;
};

const payoff: ShotModule = {
	Component: PayoffDesk,
	popups: ctx => [featurePopup(ctx, followsFavorite(ctx) ? featureAmount(ctx, true) : 0)],
	camera: (ctx): Camera => {
		const { conversion } = scoringMoments(ctx);
		const push = easeInOut(progress(ctx.t, conversion - 0.9, conversion + 0.1)) * (1 - easeInOut(progress(ctx.t, ctx.shot.to - 1.2, ctx.shot.to)));
		return { scale: 1 + 0.42 * push, ...topCardFocus(ctx) };
	},
};

export { popupOpen, ranked, assign, swaps, favorite, payoff, deskPopup, featureLayouts };

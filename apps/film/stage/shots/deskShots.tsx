import { easeSignature, progress, window01 } from '../timing';
import { Desk, deskLayouts, mixRect, soloLayouts } from './desk';
import type { PopupPlacement, ShotContext, ShotModule } from './shotTypes';

const popupWidth = 320;

const deskPopup = (ctx: ShotContext, id = 'main'): PopupPlacement => {
	const { popup } = deskLayouts[ctx.format];
	return { id, x: popup.x, y: popup.y, scale: popup.scale, opacity: 1 };
};

// The browser and the popup side by side, held still while the popup does the work.
const deskShot = (id = 'main', extra: Partial<ShotModule> = {}): ShotModule => ({
	Component: ({ ctx }) => {
		const layout = deskLayouts[ctx.format];
		return <Desk ctx={ctx} rect={layout.window} zoom={layout.windowZoom} popupId={id} />;
	},
	popups: ctx => [deskPopup(ctx, id)],
	...extra,
});

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

const ranked = deskShot();
const assign = deskShot();
const swaps = deskShot();
const payoff = deskShot();

// The settings popup beside the browser, so the Standby Stream switch it causes is in frame.
const standby = deskShot('standby');

// ─── Starring Kentucky ───────────────────────────────────────────────────────────────────────
const starSelector = 'button[data-team-star="true"][aria-label="Remove UK from favorites"], button[data-team-star="true"][aria-label="Add UK to favorites"]';

const favorite = deskShot('main', {
	overlay: (ctx, measure) => {
		const action = ctx.cut.popups.find(plan => plan.id === 'main')?.actions.find(candidate => candidate.kind === 'click' && candidate.selector.includes('favorites'));
		if (!action) return {};
		const star = measure.inPopup('main', starSelector);
		if (!star) return {};
		const pop = window01(ctx.t, action.at - 0.18, action.at + 0.35, 0.16);
		return { dot: { x: star.cx, y: star.cy, radius: 12 * pop, opacity: pop } };
	},
});

export { popupOpen, ranked, assign, swaps, standby, favorite, payoff };

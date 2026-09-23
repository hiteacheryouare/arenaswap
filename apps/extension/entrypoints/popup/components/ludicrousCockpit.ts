import { i18n } from '#i18n';
import type { Rect } from './ludicrousPainters';
import type { Phase } from './ludicrousScript';

const panes = 5;

export const cockpitWindowRect = (w: number, h: number): Rect => ({
	x: 10,
	y: 14,
	w: w - 20,
	h: Math.round(h * 0.4),
});

const consoleTop = (h: number): number => Math.round(h * 0.4) + 20;

/* The bridge window is a faceted panorama in a shallow arc, not one flat sheet: five trapezoidal
   panes divided by heavy pale mullions. The arc is carried by the top and bottom edges bowing away
   from the middle, which is cheaper than five clipped quads and reads the same. */
const bowAt = (x: number, r: Rect, depth: number): number => (
	depth * Math.pow(Math.abs(x - (r.x + r.w / 2)) / (r.w / 2), 2)
);

export const traceCockpitWindow = (ctx: CanvasRenderingContext2D, r: Rect): void => {
	const steps = panes * 4;
	ctx.beginPath();
	for (let i = 0; i <= steps; i += 1) {
		const x = r.x + (r.w * i) / steps;
		const y = r.y + bowAt(x, r, 13);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	for (let i = steps; i >= 0; i -= 1) {
		const x = r.x + (r.w * i) / steps;
		ctx.lineTo(x, r.y + r.h - bowAt(x, r, 9));
	}
	ctx.closePath();
};

export const paintCockpitMullions = (ctx: CanvasRenderingContext2D, r: Rect): void => {
	ctx.save();
	ctx.strokeStyle = '#9aa0a0';
	ctx.lineWidth = 4;
	for (let i = 1; i < panes; i += 1) {
		const x = r.x + (r.w * i) / panes;
		ctx.beginPath();
		ctx.moveTo(x, r.y + bowAt(x, r, 13));
		ctx.lineTo(x, r.y + r.h - bowAt(x, r, 9));
		ctx.stroke();
	}
	traceCockpitWindow(ctx, r);
	ctx.strokeStyle = '#b3b8b6';
	ctx.lineWidth = 6;
	ctx.stroke();
	ctx.strokeStyle = 'rgba(0,0,0,0.45)';
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.restore();
};

const phaseRank: Record<Phase, number> = {
	prelaunch: 0,
	cruising: 1,
	lightspeed: 1,
	ridiculous: 2,
	ludicrous: 3,
	plaidentry: 3,
	plaid: 3,
	panic: 3,
	stopping: 0,
};

/* Field and lettering colours are medians measured off the film's own backlit panels. An unlit panel
   goes flat pale grey-green carrying a ghost of its own lettering rather than dark, which is what
   makes the three of them lighting in turn read as a sequence. */
const panelFields = ['#37c182', '#c2741c', '#b8281a'];
const panelH = 26;
const panelGap = 5;

const condensedText = (ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, color: string): void => {
	ctx.save();
	ctx.translate(cx, cy);
	ctx.scale(0.88, 1);
	ctx.font = `700 ${size}px 'DM Sans', sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = color;
	ctx.fillText(text.toUpperCase(), 0, 0);
	ctx.restore();
};

const paintSpeedPanels = (ctx: CanvasRenderingContext2D, w: number, top: number, rank: number): void => {
	const labels = [
		i18n.t('ludicrousSpeed.signs.light'),
		i18n.t('ludicrousSpeed.signs.ridiculous'),
		i18n.t('ludicrousSpeed.signs.ludicrous'),
	];
	panelFields.forEach((field, i) => {
		const y = top + i * (panelH + panelGap);
		const lit = rank > i;
		ctx.fillStyle = '#0e100f';
		ctx.fillRect(10, y - 2, w - 20, panelH + 4);
		ctx.fillStyle = lit ? field : '#8d9689';
		ctx.fillRect(14, y, w - 28, panelH);
		condensedText(ctx, labels[i]!, w / 2, y + panelH / 2, 13, lit ? '#b7fdf6' : 'rgba(20,26,20,0.26)');
		if (lit) {
			ctx.strokeStyle = 'rgba(255,255,255,0.28)';
			ctx.lineWidth = 1;
			ctx.strokeRect(14.5, y + 0.5, w - 29, panelH - 1);
		}
	});
};

/* The screen-used console panels are sheet metal with black tape linework, black rub-down decals and
   off-the-shelf white square pushbuttons carrying two-character legends. That is the grammar here,
   labels included. */
const buttonLegends = ['AB', 'CD', 'EF', 'GH', 'JK', '01', '02', '03', '04', '05'];
const tapeLabels = ['FAULT WARNING', 'FIRE QUADRANT'];

const paintButtonBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void => {
	const bw = 17;
	const bh = 13;
	const gap = 4;
	for (let r = 0; r < 2; r += 1) {
		const rowY = y + r * (bh + gap);
		ctx.strokeStyle = '#0b0d0c';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(x, rowY + bh / 2);
		ctx.lineTo(x + 5 * (bw + gap) + 60, rowY + bh / 2);
		ctx.stroke();

		for (let c = 0; c < 5; c += 1) {
			const bx = x + c * (bw + gap);
			ctx.fillStyle = (frame + r * 17 + c * 31) % 240 < 26 ? '#fff8e6' : '#e6e6e0';
			ctx.fillRect(bx, rowY, bw, bh);
			ctx.fillStyle = 'rgba(0,0,0,0.55)';
			ctx.font = "600 7px 'Lekton', monospace";
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(buttonLegends[r * 5 + c]!, bx + bw / 2, rowY + bh / 2 + 0.5);
		}

		ctx.fillStyle = '#16120b';
		ctx.fillRect(x + 5 * (bw + gap) + 2, rowY + 1, 56, bh - 2);
		ctx.fillStyle = 'rgba(222,224,217,0.75)';
		ctx.font = "700 6px 'Lekton', monospace";
		ctx.textAlign = 'left';
		ctx.fillText(tapeLabels[r]!, x + 5 * (bw + gap) + 5, rowY + bh / 2 + 0.5);
	}
};

const paintPilotLamps = (ctx: CanvasRenderingContext2D, x: number, y: number, count: number, rank: number, frame: number): void => {
	const litCount = Math.round((count * rank) / 3);
	for (let i = 0; i < count; i += 1) {
		const on = i < litCount && (frame + i * 9) % 90 > 12;
		ctx.beginPath();
		ctx.arc(x + i * 13, y, 3.6, 0, Math.PI * 2);
		ctx.fillStyle = on ? '#ffa519' : '#3a3730';
		ctx.fill();
		ctx.strokeStyle = 'rgba(0,0,0,0.5)';
		ctx.lineWidth = 1;
		ctx.stroke();
	}
};

// The brake placard and its lever share a pedestal at the foot of the console. The DOM button is
// positioned onto this exact rect, so the control the user clicks is the one that is drawn.
export const cockpitBrakeRect = (w: number, h: number): Rect => {
	const top = consoleTop(h);
	const y = top + 24 + 3 * (panelH + panelGap) + 6 + 72 + 12 + 30 + 12;
	return { x: 12, y, w: w - 62, h: 36 };
};

// The lever on this bridge is the emergency brake, not a throttle: a black rod with a ball handle on
// a riveted pedestal, and a dome lamp that lights red when it is pulled.
const paintBrakeLever = (ctx: CanvasRenderingContext2D, x: number, y: number, pulled: boolean): void => {
	ctx.fillStyle = '#6d716c';
	ctx.fillRect(x - 14, y + 18, 28, 18);
	ctx.fillStyle = 'rgba(0,0,0,0.35)';
	for (let i = 0; i < 3; i += 1) ctx.fillRect(x - 9 + i * 8, y + 31, 2, 2);

	const knobX = pulled ? x + 9 : x;
	const knobY = pulled ? y + 8 : y - 6;
	ctx.strokeStyle = '#141514';
	ctx.lineWidth = 4;
	ctx.beginPath();
	ctx.moveTo(x, y + 20);
	ctx.lineTo(knobX, knobY);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(knobX, knobY, 5.5, 0, Math.PI * 2);
	ctx.fillStyle = '#161716';
	ctx.fill();

	ctx.beginPath();
	ctx.arc(x, y + 26, 3.6, 0, Math.PI * 2);
	ctx.fillStyle = pulled ? '#ff2a1a' : '#4a473f';
	ctx.fill();
};

export const paintCockpitConsole = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	phase: Phase,
	frame: number,
	brakeArmed: boolean,
	brakePulled: boolean,
): void => {
	const top = consoleTop(h);
	const rank = phaseRank[phase];

	// Pale cool grey at the window end, warmer olive-grey aft.
	const face = ctx.createLinearGradient(0, top, 0, h);
	face.addColorStop(0, '#8e9491');
	face.addColorStop(0.1, '#5d615b');
	face.addColorStop(0.55, '#3f4139');
	face.addColorStop(1, '#26271f');
	ctx.fillStyle = face;
	ctx.fillRect(0, top, w, h - top);
	ctx.fillStyle = 'rgba(255,255,255,0.16)';
	ctx.fillRect(0, top, w, 1.5);

	paintPilotLamps(ctx, 16, top + 12, 12, rank, frame);
	paintSpeedPanels(ctx, w, top + 24, rank);

	// Recessed well. The dialogue is DOM and lands inside this box.
	const wellTop = top + 24 + 3 * (panelH + panelGap) + 6;
	ctx.fillStyle = 'rgba(0,0,0,0.55)';
	ctx.fillRect(10, wellTop, w - 20, 72);
	ctx.strokeStyle = 'rgba(255,255,255,0.12)';
	ctx.lineWidth = 1;
	ctx.strokeRect(10.5, wellTop + 0.5, w - 21, 71);

	paintButtonBlock(ctx, 14, wellTop + 84, frame);

	const brake = cockpitBrakeRect(w, h);
	ctx.fillStyle = '#0d0f0d';
	ctx.fillRect(brake.x - 3, brake.y - 3, brake.w + 6, brake.h + 6);
	if (!brakeArmed) {
		ctx.fillStyle = '#4c4a42';
		ctx.fillRect(brake.x, brake.y, brake.w, brake.h);
		ctx.fillStyle = 'rgba(0,0,0,0.25)';
		ctx.fillRect(brake.x, brake.y, brake.w, 2);
	}
	paintBrakeLever(ctx, w - 28, brake.y - 2, brakePulled);
};

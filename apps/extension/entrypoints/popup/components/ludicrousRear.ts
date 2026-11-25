const bumperText = 'WE BRAKE FOR NOBODY';

export const sternRecede = (speed: number): number => Math.min(1, Math.pow(Math.max(0, speed - 0.5) / 13, 0.85));

interface SternState {
	recede: number;
	speed: number;
	braking: number | null;
}

const brakeLurch = (frames: number | null, w: number, h: number): { dx: number; dy: number } => {
	if (frames === null) return { dx: 0, dy: 0 };
	const lift = h * 0.03 * Math.exp(-frames / 10) * Math.sin(frames * 0.42);
	const shudder = w * 0.008 * Math.exp(-frames / 5) * Math.sin(frames * 2.3);
	return { dx: shudder, dy: -lift };
};

export const paintStern = (ctx: CanvasRenderingContext2D, w: number, h: number, { recede, speed, braking }: SternState): void => {
	const scale = 1 - recede * 0.82;
	const lurch = brakeLurch(braking, w, h);
	const cx = w / 2 + lurch.dx;
	const cy = h * 0.44 - recede * h * 0.05 + lurch.dy;
	const hullW = w * 0.78 * scale;
	const hullH = w * 0.34 * scale;
	const bloom = Math.min(1, Math.pow(Math.max(0, speed - 1) / 12, 1.3));

	ctx.save();

	ctx.beginPath();
	ctx.moveTo(cx - hullW / 2, cy - hullH / 2);
	ctx.lineTo(cx + hullW / 2, cy - hullH / 2);
	ctx.lineTo(cx + hullW / 2.35, cy + hullH / 2);
	ctx.lineTo(cx - hullW / 2.35, cy + hullH / 2);
	ctx.closePath();
	const hull = ctx.createLinearGradient(0, cy - hullH / 2, 0, cy + hullH / 2);
	hull.addColorStop(0, '#6f757b');
	hull.addColorStop(0.45, '#43484d');
	hull.addColorStop(1, '#1d2023');
	ctx.fillStyle = hull;
	ctx.fill();
	ctx.strokeStyle = 'rgba(0,0,0,0.6)';
	ctx.lineWidth = 1;
	ctx.stroke();

	const bellR = hullH * 0.3;
	for (let i = -1; i <= 1; i += 1) {
		const bx = cx + i * hullW * 0.27;
		const by = cy - hullH * 0.05;
		ctx.beginPath();
		ctx.arc(bx, by, bellR * 1.16, 0, Math.PI * 2);
		ctx.fillStyle = '#15181b';
		ctx.fill();

		const reach = bellR * (1 + bloom * 2.6);
		const glow = ctx.createRadialGradient(bx, by, 0, bx, by, reach);
		glow.addColorStop(0, `rgba(255,255,255,${0.5 + bloom * 0.5})`);
		glow.addColorStop(0.3, `rgba(190,225,255,${0.35 + bloom * 0.6})`);
		glow.addColorStop(1, 'rgba(120,180,255,0)');
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(bx, by, reach, 0, Math.PI * 2);
		ctx.fill();
	}

	const plateW = hullW * 0.62;
	const plateH = Math.max(7, hullH * 0.2);
	const plateY = cy + hullH / 2 - plateH * 0.1;
	ctx.fillStyle = '#d8d3c4';
	ctx.fillRect(cx - plateW / 2, plateY, plateW, plateH);
	ctx.fillStyle = '#1a1a18';
	ctx.font = `700 ${Math.max(4, plateH * 0.56)}px 'DM Sans', sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(bumperText, cx, plateY + plateH / 2 + 0.5);

	if (bloom > 0.02) {
		const reach = hullW * (0.7 + bloom * 0.6);
		const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
		wash.addColorStop(0, `rgba(226,240,255,${bloom * 0.4})`);
		wash.addColorStop(1, 'rgba(160,200,255,0)');
		ctx.fillStyle = wash;
		ctx.fillRect(cx - reach, cy - reach, reach * 2, reach * 2);
	}

	ctx.restore();
};

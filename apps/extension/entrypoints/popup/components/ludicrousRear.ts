/* The takeoff and the slowdown, watched from behind. There is deliberately no hull stretch: the
   film has no elongation shot, which is a Millennium Falcon memory. It has the three engine bells
   blooming white-blue over the bumper placard, and the ship receding into that bloom. */
const bumperText = 'WE BRAKE FOR NOBODY';

export const paintStern = (ctx: CanvasRenderingContext2D, w: number, h: number, speed: number, frame: number): void => {
	const recede = Math.min(1, Math.pow(Math.max(0, speed - 0.5) / 13, 0.85));
	const scale = 1 - recede * 0.82;
	const cx = w / 2;
	const cy = h * 0.44 - recede * h * 0.05;
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

	// The bumper placard, which is a real prop on the ship's stern and the reason this shot is funny.
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
		const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * (0.3 + bloom * 0.9));
		wash.addColorStop(0, `rgba(226,240,255,${bloom * 0.85})`);
		wash.addColorStop(1, 'rgba(160,200,255,0)');
		ctx.fillStyle = wash;
		ctx.fillRect(0, 0, w, h);
	}

	ctx.strokeStyle = `rgba(210,235,255,${bloom * 0.35})`;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(cx - hullW, cy + Math.sin(frame * 0.3) * 0.5);
	ctx.lineTo(cx + hullW, cy);
	ctx.stroke();

	ctx.restore();
};

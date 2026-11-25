import type { Phase } from './ludicrousScript';

export interface Star {
	x: number;
	y: number;
	z: number;
}

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export const makeStar = (): Star => ({
	x: (Math.random() - 0.5) * 1.5,
	y: (Math.random() - 0.5) * 1.5,
	z: Math.random() * 0.8 + 0.15,
});

export const resetStar = (s: Star): void => {
	s.x = (Math.random() - 0.5) * 1.5;
	s.y = (Math.random() - 0.5) * 1.5;
	s.z = 0.88 + Math.random() * 0.12;
};

export const makeStars = (n: number): Star[] => Array.from({ length: n }, makeStar);

const starTint: Record<Phase, [number, number, number]> = {
	prelaunch: [0.78, 0.86, 1],
	windup: [0.78, 0.86, 1],
	cruising: [0.94, 0.96, 1],
	lightspeed: [0.94, 0.94, 1],
	ridiculous: [1, 0.9, 0.72],
	ludicrous: [1, 0.72, 0.3],
	plaidentry: [1, 0.86, 0.55],
	plaid: [1, 1, 1],
	panic: [1, 0.6, 0.3],
	stopping: [1, 0.96, 0.9],
};

const plaidSpectrum: [number, number, number][] = [
	[0.74, 0.29, 0.03],
	[0.65, 0.25, 0.07],
	[0.79, 0.45, 0.06],
	[0.47, 0.04, 0.06],
	[0.53, 0.01, 0.04],
	[0.83, 0.75, 0.37],
];

const starColor = (z: number, phase: Phase, index: number, mix: number): string => {
	const bri = 220 + (1 - z) * 80;
	const f = 0.38 + (1 - z) * 0.62;
	let [r, g, b] = starTint[phase];
	if (phase === 'plaidentry') {
		const [pr, pg, pb] = plaidSpectrum[index % plaidSpectrum.length]!;
		const [lr, lg, lb] = starTint.ludicrous;
		r = lr + (pr - lr) * mix;
		g = lg + (pg - lg) * mix;
		b = lb + (pb - lb) * mix;
	}
	return `rgb(${Math.round(bri * r * f)},${Math.round(bri * g * f)},${Math.round(bri * b * f)})`;
};

export interface StarfieldOptions {
	speed: number;
	phase: Phase;
	spread?: number;
	widthScale?: number;
	alpha?: number;
	paletteMix?: number;
	stretch?: number;
}

export const paintStarfield = (
	ctx: CanvasRenderingContext2D,
	stars: Star[],
	rect: Rect,
	opts: StarfieldOptions,
): void => {
	const { speed, phase } = opts;
	const spread = opts.spread ?? 0.8;
	const widthScale = opts.widthScale ?? 1;
	const stretch = opts.stretch ?? 1;
	const paletteMix = opts.paletteMix ?? 0;
	const cx = rect.x + rect.w / 2;
	const cy = rect.y + rect.h / 2;
	const hx = rect.w / 2;
	const hy = rect.h / 2;

	ctx.save();
	if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
	ctx.lineCap = 'round';
	if (phase === 'lightspeed') ctx.setLineDash([5, 4]);

	stars.forEach((star, index) => {
		const ppx = cx + (star.x / star.z) * hx * spread;
		const ppy = cy + (star.y / star.z) * hy * spread;

		star.z -= speed * 0.007;
		if (star.z <= 0.01) {
			resetStar(star);
			return;
		}

		const sx = cx + (star.x / star.z) * hx * spread;
		const sy = cy + (star.y / star.z) * hy * spread;

		if (sx < rect.x - 40 || sx > rect.x + rect.w + 40 || sy < rect.y - 40 || sy > rect.y + rect.h + 40) {
			resetStar(star);
			return;
		}

		ctx.beginPath();
		ctx.moveTo(sx + (ppx - sx) * stretch, sy + (ppy - sy) * stretch);
		ctx.lineTo(sx, sy);
		ctx.strokeStyle = starColor(star.z, phase, index, paletteMix);
		ctx.lineWidth = Math.max(1.4, ((1 - star.z) * 9 + speed * 0.22) * widthScale);
		ctx.stroke();
	});
	ctx.restore();
};

export interface SettStripe {
	color: string;
	w: number;
}

export interface Sett {
	ground: string;
	stripes: SettStripe[];
	weftAlpha: number;
}

const settWidth = (sett: Sett): number => sett.stripes.reduce((sum, s) => sum + s.w, 0);

const squarePoint = (cx: number, cy: number, s: number, q: number): [number, number] => {
	const wall = ((q % 4) + 4) % 4;
	const u = (wall % 1) * 2 - 1;
	if (wall < 1) return [cx + u * s, cy - s];
	if (wall < 2) return [cx + s, cy + u * s];
	if (wall < 3) return [cx - u * s, cy + s];
	return [cx - s, cy - u * s];
};

export interface TunnelOptions {
	travel: number;
	repeatsAround: number;
	wedgeAlpha?: number;
	ringAlpha?: number;
	flareAlpha?: number;
	paintGround?: boolean;
	ringAperture?: number;
	voidRadius?: number;
	depthScale: number;
}

export const paintTartanTunnel = (
	ctx: CanvasRenderingContext2D,
	rect: Rect,
	sett: Sett,
	{ travel, repeatsAround, depthScale, wedgeAlpha = 1, ringAlpha = 1, flareAlpha = 1, paintGround = true, ringAperture = Infinity, voidRadius = 0 }: TunnelOptions,
): void => {
	const cx = rect.x + rect.w / 2;
	const cy = rect.y + rect.h / 2;
	const reach = Math.hypot(rect.w, rect.h) * 1.4;
	const period = settWidth(sett);

	ctx.save();
	ctx.beginPath();
	ctx.rect(rect.x, rect.y, rect.w, rect.h);
	ctx.clip();

	if (paintGround) {
		ctx.fillStyle = sett.ground;
		ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
	}

	const dq = 4 / (repeatsAround * period);
	ctx.globalAlpha = wedgeAlpha;
	let q = 0;
	for (let r = 0; r < repeatsAround; r += 1) {
		for (const stripe of sett.stripes) {
			const span = stripe.w * dq;
			if (stripe.color !== sett.ground) {
				const [x1, y1] = squarePoint(cx, cy, reach, q);
				const [x2, y2] = squarePoint(cx, cy, reach, q + span);
				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.lineTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.closePath();
				ctx.fillStyle = stripe.color;
				ctx.fill();
			}
			q += span;
		}
	}

	const focal = rect.w * 0.5;
	const near = 0.3;
	const far = 26;
	const depthPeriod = period * depthScale;
	ctx.globalAlpha = sett.weftAlpha * ringAlpha;
	const firstRepeat = Math.floor((travel + near) / depthPeriod);
	const bands: { depth: number; w: number; color: string }[] = [];
	for (let r = firstRepeat; r < firstRepeat + Math.ceil(far / depthPeriod) + 2; r += 1) {
		let pos = r * depthPeriod;
		for (const stripe of sett.stripes) {
			const w = stripe.w * depthScale;
			if (stripe.color !== sett.ground) bands.push({ depth: pos - travel, w, color: stripe.color });
			pos += w;
		}
	}
	bands.sort((a, b) => b.depth - a.depth);
	for (const band of bands) {
		if (band.depth < near || band.depth > far) continue;
		const outer = focal / band.depth;
		const inner = focal / (band.depth + band.w);
		const half = (outer + inner) / 2;
		const thickness = outer - inner;
		if (thickness < 0.28 || half > reach || half > ringAperture) continue;
		ctx.strokeStyle = band.color;
		ctx.lineWidth = thickness;
		ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);
	}
	ctx.globalAlpha = 1;

	if (voidRadius > 0) {
		ctx.globalAlpha = 1;
		const evac = ctx.createRadialGradient(cx, cy, 0, cx, cy, voidRadius);
		evac.addColorStop(0, '#000');
		evac.addColorStop(0.62, 'rgba(0,0,0,0.92)');
		evac.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = evac;
		ctx.fillRect(cx - voidRadius, cy - voidRadius, voidRadius * 2, voidRadius * 2);
	}

	if (flareAlpha <= 0) {
		ctx.restore();
		return;
	}

	ctx.globalAlpha = flareAlpha;
	const flare = ctx.createRadialGradient(cx, cy, 0, cx, cy, rect.w * 0.2);
	flare.addColorStop(0, 'rgba(255,252,232,0.95)');
	flare.addColorStop(0.22, 'rgba(255,226,140,0.55)');
	flare.addColorStop(1, 'rgba(255,190,60,0)');
	ctx.fillStyle = flare;
	ctx.fillRect(cx - rect.w * 0.2, cy - rect.w * 0.2, rect.w * 0.4, rect.w * 0.4);

	ctx.strokeStyle = 'rgba(255,248,214,0.7)';
	ctx.lineWidth = 1.4;
	for (let i = 0; i < 4; i += 1) {
		const a = (Math.PI / 2) * i + Math.PI / 4;
		const len = rect.w * (0.1 + 0.05 * Math.sin(travel * 3 + i));
		ctx.beginPath();
		ctx.moveTo(cx - Math.cos(a) * len, cy - Math.sin(a) * len);
		ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
		ctx.stroke();
	}

	ctx.restore();
};

export interface FlyingLogo {
	img: HTMLImageElement;
	x: number;
	y: number;
	z: number;
	spin: number;
	spinRate: number;
	sx: number | null;
	sy: number | null;
}

export const makeFlyingLogo = (img: HTMLImageElement, z: number): FlyingLogo => {
	const angle = Math.random() * Math.PI * 2;
	const radius = 0.16 + Math.random() * 0.34;
	return {
		img,
		x: Math.cos(angle) * radius,
		y: Math.sin(angle) * radius,
		z,
		spin: Math.random() * Math.PI * 2,
		spinRate: (Math.random() - 0.5) * 0.12,
		sx: null,
		sy: null,
	};
};

export const paintLogoStream = (
	ctx: CanvasRenderingContext2D,
	logos: FlyingLogo[],
	rect: Rect,
): void => {
	const cx = rect.x + rect.w / 2;
	const cy = rect.y + rect.h / 2;
	const hx = rect.w / 2;
	const hy = rect.h / 2;

	ctx.save();
	ctx.beginPath();
	ctx.rect(rect.x, rect.y, rect.w, rect.h);
	ctx.clip();

	for (const logo of logos) {
		if (logo.z <= 0) continue;
		const prevX = logo.sx;
		const prevY = logo.sy;

		logo.z -= 0.021;
		logo.spin += logo.spinRate;
		if (logo.z <= 0.05) {
			logo.z = 0;
			continue;
		}

		const sx = cx + (logo.x / logo.z) * hx;
		const sy = cy + (logo.y / logo.z) * hy;
		const size = Math.min(rect.w * 0.72, 0.115 * rect.w / logo.z);
		logo.sx = sx;
		logo.sy = sy;

		if (!logo.img.complete || logo.img.naturalWidth === 0) continue;

		const ghosts = prevX === null || prevY === null ? 1 : 3;
		const dx = prevX === null ? 0 : (prevX - sx) / ghosts;
		const dy = prevY === null ? 0 : (prevY - sy) / ghosts;

		const edge = Math.min(1, logo.z * 2.6) * Math.min(1, (1.25 - logo.z) * 6);
		ctx.save();
		ctx.globalAlpha = edge * 0.8;
		const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 0.78);
		halo.addColorStop(0, 'rgba(0,0,0,0.86)');
		halo.addColorStop(0.6, 'rgba(0,0,0,0.6)');
		halo.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = halo;
		ctx.fillRect(sx - size * 0.78, sy - size * 0.78, size * 1.56, size * 1.56);
		ctx.restore();

		for (let g = ghosts - 1; g >= 0; g -= 1) {
			const fade = g === 0 ? 1 : 0.22 * (1 - g / ghosts);
			ctx.save();
			ctx.globalAlpha = fade * edge;
			ctx.translate(sx + dx * g, sy + dy * g);
			ctx.rotate(logo.spin);
			ctx.drawImage(logo.img, -size / 2, -size / 2, size, size);
			ctx.restore();
		}
	}

	ctx.restore();
};

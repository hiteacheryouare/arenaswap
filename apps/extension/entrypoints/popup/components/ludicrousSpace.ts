import {
	makeFlyingLogo,
	paintLogoStream,
	paintStarfield,
	paintTartanTunnel,
	type FlyingLogo,
	type Rect,
	type Star,
} from './ludicrousPainters';
import { ludicrousTunnelSett } from './ludicrousTartanSetts';
import type { Phase } from './ludicrousScript';

export interface World {
	stars: Star[];
	logos: FlyingLogo[];
	logoCursor: number;
	travel: number;
	entry: number;
}

export interface SpaceFrame {
	speed: number;
	phase: Phase;
	frame: number;
	logosOn: boolean;
	logoImages: HTMLImageElement[];
}

export interface SpaceOptions {
	spread?: number;
	widthScale?: number;
}

const smoothstep = (edge0: number, edge1: number, x: number): number => {
	const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
};

export const isTunnelPhase = (phase: Phase): boolean => (
	phase === 'plaidentry' || phase === 'plaid' || phase === 'panic'
);

const tunnelShape = { repeatsAround: 11, depthScale: 0.085 };

// One logo roughly every fifth of a second. Slow enough that each one is a readable glimpse and
// frequent enough that you cannot count them, which is the whole joke.
const logoSpawnFrames = 12;

export const paintSpace = (
	ctx: CanvasRenderingContext2D,
	rect: Rect,
	world: World,
	{ speed, phase, frame, logosOn, logoImages }: SpaceFrame,
	{ spread = 0.8, widthScale = 1 }: SpaceOptions = {},
): void => {
	const entry = world.entry;

	if (phase === 'plaid' || phase === 'panic') {
		paintTartanTunnel(ctx, rect, ludicrousTunnelSett, { travel: world.travel, ...tunnelShape });
	} else if (phase === 'plaidentry') {
		/* Measured off the transition frames: nothing cross-fades, since lit coverage stays flat
		   throughout. The order is colour, then the flare igniting out of a blacked-out centre, then
		   the weave opening outward as an aperture. Trumbull built the 2001 Star Gate the same way,
		   out of the stars rather than cut to (Cinefex #85, p.112). */
		ctx.fillStyle = 'rgba(0,0,0,0.11)';
		ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
		paintStarfield(ctx, world.stars, rect, {
			speed,
			phase,
			spread,
			widthScale: widthScale * (1 + entry * 1.1),
			// 3.3x, which is what the streaks actually measure, not the 9x that reads as a smear.
			stretch: 1 + entry * 2.3,
			paletteMix: smoothstep(0, 0.5, entry),
			alpha: 1 - smoothstep(0.86, 1, entry),
		});
		const reach = Math.hypot(rect.w, rect.h) * 0.75;
		paintTartanTunnel(ctx, rect, ludicrousTunnelSett, {
			travel: world.travel,
			...tunnelShape,
			paintGround: false,
			wedgeAlpha: smoothstep(0.08, 0.58, entry),
			ringAlpha: smoothstep(0.32, 0.62, entry),
			ringAperture: smoothstep(0.34, 1, entry) * reach,
			voidRadius: (1 - smoothstep(0.4, 0.5, entry)) * smoothstep(0, 0.3, entry) * rect.w * 0.17,
			flareAlpha: entry < 0.45 ? 0 : 1,
		});
	} else {
		ctx.fillStyle = phase === 'prelaunch' ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.11)';
		ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
		paintStarfield(ctx, world.stars, rect, { speed, phase, spread, widthScale });
	}

	if (logosOn && logoImages.length > 0 && frame % logoSpawnFrames === 0) {
		world.logos.push(makeFlyingLogo(logoImages[world.logoCursor % logoImages.length]!, 1.25));
		world.logoCursor += 1;
	}
	if (world.logos.length > 0) {
		paintLogoStream(ctx, world.logos, rect);
		world.logos = world.logos.filter(l => l.z > 0);
	}
};

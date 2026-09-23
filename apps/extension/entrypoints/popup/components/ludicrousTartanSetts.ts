import type { Sett } from './ludicrousPainters';

/* Transcribed from the two film frames carrying the full-screen plaid. It is not a clan tartan and
   not Royal Stewart: Cinefex #31 (Aug 1987, p.15) has Apogee's Clint Colver naming the reference as
   the Burlington TV commercials, which is why the ground is black and gold leads rather than red.
   Widths are measured run-lengths in units of the colour-bar width. */
export const ludicrousTunnelSett: Sett = {
	ground: '#020102',
	stripes: [
		{ color: '#8f0006', w: 1 },
		{ color: '#020102', w: 0.6 },
		{ color: '#7d0008', w: 1 },
		{ color: '#020102', w: 0.6 },
		{ color: '#b76708', w: 1 },
		{ color: '#020102', w: 0.6 },
		{ color: '#f39f0b', w: 1 },
		{ color: '#020102', w: 2.6 },
		{ color: '#20005a', w: 0.35 },
		{ color: '#020102', w: 0.5 },
		{ color: '#f0f0f0', w: 0.18 },
		{ color: '#020102', w: 0.5 },
		{ color: '#20005a', w: 0.35 },
		{ color: '#020102', w: 2.6 },
	],
	weftAlpha: 0.5,
};

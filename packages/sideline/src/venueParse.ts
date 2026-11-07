import type { SportType } from '@arenaswap/core';

export interface VenueDetails {
	// Football sends a second photo from inside the stadium. Every other sport's one photo is `main`.
	photos: { main?: string; interior?: string };
	surface?: 'grass' | 'turf';
}

interface VenueImage {
	href?: string;
	rel?: string[];
}

const imageHost = 'https://a.espncdn.com';
// Twice the 320px popup, so the photo stays sharp on a 2x screen at a fraction of the 2000px original.
const photoWidth = 640;

const resized = (href: string | undefined): string | undefined => {
	if (!href?.startsWith(`${imageHost}/`)) return undefined;
	return `${imageHost}/combiner/i?img=${href.slice(imageHost.length)}&w=${photoWidth}`;
};

export const parseVenueDetails = (data: unknown, sportType: SportType | undefined): VenueDetails | null => {
	const venue = (data as { gameInfo?: { venue?: { images?: unknown; grass?: unknown } } })?.gameInfo?.venue;
	const images = Array.isArray(venue?.images) ? venue.images as VenueImage[] : [];
	const interior = resized(images.find(image => image.rel?.includes('interior'))?.href);
	const main = resized(images.find(image => !image.rel?.includes('interior'))?.href);
	const surface = sportType === 'football' && typeof venue?.grass === 'boolean'
		? (venue.grass ? 'grass' : 'turf')
		: undefined;
	if (!interior && !main && !surface) return null;
	return {
		photos: { ...(main ? { main } : {}), ...(interior ? { interior } : {}) },
		...(surface ? { surface } : {}),
	};
};

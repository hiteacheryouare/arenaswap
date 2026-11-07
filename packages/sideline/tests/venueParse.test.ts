import { parseVenueDetails } from '../src/venueParse';

// Trimmed from the 2026-11-06 summaries: Jaguars at Ravens (football, both photos) and Magic at
// Suns (basketball, one).
const stadium = {
	gameInfo: {
		venue: {
			grass: true,
			images: [
				{ href: 'https://a.espncdn.com/i/venues/nfl/day/3814.jpg', rel: ['full', 'day'] },
				{ href: 'https://a.espncdn.com/i/venues/nfl/day/interior/3814.jpg', rel: ['full', 'day', 'interior'] },
			],
		},
	},
};

const arena = {
	gameInfo: { venue: { grass: false, images: [{ href: 'https://a.espncdn.com/i/venues/nba/day/1949.jpg', rel: ['full', 'day'] }] } },
};

describe('parseVenueDetails', () => {
	it('keeps both football photos, resized for the popup', () => {
		expect(parseVenueDetails(stadium, 'football')).toEqual({
			photos: {
				main: 'https://a.espncdn.com/combiner/i?img=/i/venues/nfl/day/3814.jpg&w=640',
				interior: 'https://a.espncdn.com/combiner/i?img=/i/venues/nfl/day/interior/3814.jpg&w=640',
			},
			surface: 'grass',
		});
	});

	it('names the surface for football only', () => {
		expect(parseVenueDetails(arena, 'basketball')).toEqual({
			photos: { main: 'https://a.espncdn.com/combiner/i?img=/i/venues/nba/day/1949.jpg&w=640' },
		});
		expect(parseVenueDetails({ gameInfo: { venue: { grass: false } } }, 'football')).toEqual({ photos: {}, surface: 'turf' });
	});

	it('has nothing for a venue with no photo', () => {
		expect(parseVenueDetails({ gameInfo: { venue: { images: [] } } }, 'soccer')).toBeNull();
		expect(parseVenueDetails(undefined, 'soccer')).toBeNull();
	});

	it('ignores a photo hosted anywhere else', () => {
		expect(parseVenueDetails({ gameInfo: { venue: { images: [{ href: 'https://example.com/a.jpg', rel: ['full'] }] } } }, 'hockey')).toBeNull();
	});
});

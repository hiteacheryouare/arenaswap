import { conditionIcon, formatTemperature } from '../src/components/weatherUtils';

describe('conditionIcon', () => {
	test('maps a known condition to its icon', () => {
		expect(conditionIcon('Sunny')).toBe('bi-sun');
		expect(conditionIcon('Heavy Rain')).toBe('bi-cloud-rain-heavy');
	});

	test('is case- and whitespace-insensitive', () => {
		expect(conditionIcon('  CLOUDY  ')).toBe('bi-clouds');
	});

	test('uses the primary condition from a compound label', () => {
		expect(conditionIcon('Partly Cloudy/Windy')).toBe('bi-cloud-sun');
		expect(conditionIcon('Thunderstorms/Wind')).toBe('bi-cloud-lightning-rain');
	});

	// Our sources' "w/" phrasing contains a slash, so splitting on it alone left "mostly cloudy w".
	test('reads the precipitation out of a "w/" label', () => {
		expect(conditionIcon('Mostly cloudy w/ t-storms')).toBe('bi-cloud-lightning-rain');
		expect(conditionIcon('Mostly cloudy w/ showers')).toBe('bi-cloud-drizzle');
		expect(conditionIcon('Partly sunny w/ flurries')).toBe('bi-cloud-snow');
	});

	test('falls back to a generic cloud for anything unrecognized', () => {
		expect(conditionIcon('Volcanic Ash')).toBe('bi-cloud');
		expect(conditionIcon('')).toBe('bi-cloud');
	});

	test('prefers the AccuWeather code over the label', () => {
		expect(conditionIcon('Thunderstorms', 15)).toBe('bi-cloud-lightning-rain');
		expect(conditionIcon('Some new phrasing', 26)).toBe('bi-cloud-sleet');
	});

	test('draws a moon for the night codes', () => {
		expect(conditionIcon('Clear', 33)).toBe('bi-moon-stars');
		expect(conditionIcon('Intermittent clouds', 36)).toBe('bi-cloud-moon');
		expect(conditionIcon('Intermittent clouds', 4)).toBe('bi-cloud-sun');
	});

	test('falls back to the label for a code AccuWeather never assigns', () => {
		expect(conditionIcon('Rain', 9)).toBe('bi-cloud-rain');
	});
});

describe('formatTemperature', () => {
	test('renders Fahrenheit unchanged', () => {
		expect(formatTemperature(62, 'F')).toBe('62°F');
	});

	test('converts to Celsius, rounded', () => {
		expect(formatTemperature(32, 'C')).toBe('0°C');
		expect(formatTemperature(212, 'C')).toBe('100°C');
		expect(formatTemperature(62, 'C')).toBe('17°C');
	});

	test('handles sub-freezing temperatures in both units', () => {
		expect(formatTemperature(-4, 'F')).toBe('-4°F');
		expect(formatTemperature(-4, 'C')).toBe('-20°C');
	});

	test('converts to Rømer against the scale\'s own reference points', () => {
		expect(formatTemperature(32, 'Ro')).toBe('7.5°Rø');
		expect(formatTemperature(212, 'Ro')).toBe('60°Rø');
	});

	test('keeps one decimal of Rømer but never a trailing zero', () => {
		expect(formatTemperature(62, 'Ro')).toBe('16.3°Rø');
		expect(formatTemperature(85, 'Ro')).toBe('23°Rø');
	});

	test('handles sub-brine temperatures, which Rømer takes negative', () => {
		expect(formatTemperature(-4, 'Ro')).toBe('-3°Rø');
	});
});

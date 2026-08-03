import { conditionIcon, formatTemperature } from '../src/components/weatherUtils';

describe('conditionIcon', () => {
	test('maps a known condition to its icon', () => {
		expect(conditionIcon('Sunny')).toBe('bi-sun');
		expect(conditionIcon('Heavy Rain')).toBe('bi-cloud-rain-heavy');
	});

	test('is case- and whitespace-insensitive', () => {
		expect(conditionIcon('  CLOUDY  ')).toBe('bi-clouds');
	});

	// ESPN returns compound labels like "Partly Cloudy/Windy"; the leading condition is the
	// one worth showing.
	test('uses the primary condition from a compound label', () => {
		expect(conditionIcon('Partly Cloudy/Windy')).toBe('bi-cloud-sun');
		expect(conditionIcon('Thunderstorms/Wind')).toBe('bi-cloud-lightning-rain');
	});

	test('falls back to a generic cloud for anything unrecognized', () => {
		expect(conditionIcon('Volcanic Ash')).toBe('bi-cloud');
		expect(conditionIcon('')).toBe('bi-cloud');
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
});

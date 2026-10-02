import { resolveDisplayLocale } from '../utils/displayLocale';

describe('resolveDisplayLocale', () => {
	test.each([
		['en-US', 'en-US'],
		['en-GB', 'en-GB'],
		['de-AT', 'de-AT'],
		['pt-BR', 'pt-BR'],
		['zh-TW', 'zh-TW'],
		['fil', 'fil'],
	])('keeps %s, which the browser has strings for', (ui, expected) => {
		expect(resolveDisplayLocale(ui)).toBe(expected);
	});

	// No folder for the language, so the strings are English and the dates should be too.
	test.each([
		['nl-NL'],
		['sv'],
		['pt-AO'],
		['zh-HK'],
	])('falls back to English for %s, as the strings do', ui => {
		expect(resolveDisplayLocale(ui)).toBe('en');
	});
});

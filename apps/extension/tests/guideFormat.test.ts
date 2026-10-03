import { formatBandRange } from '../entrypoints/guide/guideFormat';

// Jest runs on UTC, so these are wall-clock times as written.
const at = (time: string) => Date.parse(`2026-10-02T${time}:00Z`);

describe('formatBandRange', () => {
	// The start is clamped to now once the window is under way, so it used to tick every minute.
	test('holds its start still for five minutes at a time', () => {
		expect(formatBandRange(at('15:46'), at('16:17'), 'en-US')).toBe(formatBandRange(at('15:49'), at('16:17'), 'en-US'));
	});

	test('says the meridiem once', () => {
		expect(formatBandRange(at('15:47'), at('16:17'), 'en-US')).toMatch(/^3:45\s*–\s*4:20\sPM$/);
	});

	test('follows the locale it is given', () => {
		expect(formatBandRange(at('15:47'), at('16:17'), 'de-DE')).toMatch(/^15:45\s*–\s*16:20( Uhr)?$/);
	});
});

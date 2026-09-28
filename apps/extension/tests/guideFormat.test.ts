import { bandLabel, formatGuideRange } from '../entrypoints/guide/guideFormat';

const at = (iso: string) => new Date(iso).getTime();
const band = { fromMs: at('2026-09-13T19:25:00Z'), toMs: at('2026-09-13T19:40:00Z'), peakMs: at('2026-09-13T19:30:00Z'), gameCount: 5, favoriteCount: 0 };

// The summary finishes the sentence the switch's label starts, so it reads as one line of plain copy.
describe('the best-time summary', () => {
	test('is the window and its game count, joined by a comma', () => {
		expect(bandLabel(band)).toBe(`${formatGuideRange(band.fromMs, band.toMs)}, 5 games`);
	});

	test('counts the reader\'s own teams only when one is playing', () => {
		expect(bandLabel({ ...band, favoriteCount: 2 })).toBe(`${formatGuideRange(band.fromMs, band.toMs)}, 5 games, 2 of yours`);
		expect(bandLabel(band)).not.toContain('of yours');
	});

	test('uses the singular for one game', () => {
		expect(bandLabel({ ...band, gameCount: 1 })).toMatch(/, 1 game$/);
	});

	test('never joins its parts with a middle dot', () => {
		expect(bandLabel({ ...band, favoriteCount: 1 })).not.toContain('·');
	});

	test('prints the range as one span rather than two times side by side', () => {
		const range = formatGuideRange(band.fromMs, band.toMs);
		expect(range).toMatch(/[–~～-]/);
		expect(range).not.toBe(`${new Date(band.fromMs).toLocaleTimeString()} ${new Date(band.toMs).toLocaleTimeString()}`);
	});
});

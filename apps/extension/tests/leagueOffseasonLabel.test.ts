import leagueOffseasonLabel from '../entrypoints/popup/components/leagueOffseasonLabel';

const returnsAt = Date.UTC(2026, 2, 15);
const now = Date.UTC(2026, 0, 10);

const withUiLanguage = (language: string) => {
	(globalThis as any).browser = { i18n: { getUILanguage: () => language } };
};

afterEach(() => {
	delete (globalThis as any).browser;
});

describe('leagueOffseasonLabel', () => {
	// No Dutch strings ship, so the label reads in English and the month has to as well.
	it('writes the return date in English when the browser is Dutch', () => {
		withUiLanguage('nl');
		expect(leagueOffseasonLabel({ startsAt: returnsAt, endsAt: returnsAt + 1 }, now)).toMatch(/Mar.15/);
	});

	it('writes the return date in German when the browser is German', () => {
		withUiLanguage('de');
		expect(leagueOffseasonLabel({ startsAt: returnsAt, endsAt: returnsAt + 1 }, now)).toContain('März');
	});
});

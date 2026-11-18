import leagueOffseasonLabel, { offseasonReturnLine } from '../entrypoints/popup/components/leagueOffseasonLabel';

const returnsAt = Date.UTC(2026, 2, 15);
const now = Date.UTC(2026, 0, 10);

const withUiLanguage = (language: string) => {
	(globalThis as any).browser = { i18n: { getUILanguage: () => language } };
};

afterEach(() => {
	delete (globalThis as any).browser;
});

describe('leagueOffseasonLabel', () => {
	it('writes the return date in English when the browser is Dutch', () => {
		withUiLanguage('nl');
		expect(leagueOffseasonLabel({ startsAt: returnsAt, endsAt: returnsAt + 1 }, now)).toMatch(/Mar.15/);
	});

	it('writes the return date in German when the browser is German', () => {
		withUiLanguage('de');
		expect(leagueOffseasonLabel({ startsAt: returnsAt, endsAt: returnsAt + 1 }, now)).toContain('März');
	});
});

const season = (startsAt: number) => ({ startsAt, endsAt: startsAt + (200 * 24 * 60 * 60 * 1000) });

describe('offseasonReturnLine', () => {
	const nfl = Date.UTC(2026, 8, 9);
	const nba = Date.UTC(2026, 9, 20);
	const nhl = Date.UTC(2026, 9, 7);

	it('lists every league coming back, soonest first', () => {
		withUiLanguage('en');
		const line = offseasonReturnLine(['nba', 'nfl', 'nhl'], { nba: season(nba), nfl: season(nfl), nhl: season(nhl) }, now)!;
		expect(line.replace(/\u00a0/g, ' ')).toBe('Back soon: NFL Sep 9 · NHL Oct 7 · NBA Oct 20');
	});

	it('says nothing while any of your leagues is still in season', () => {
		withUiLanguage('en');
		expect(offseasonReturnLine(['nba', 'nfl'], { nba: season(now - 1000), nfl: season(nfl) }, now)).toBeNull();
	});

	it('says nothing when no league has a date to come back on', () => {
		withUiLanguage('en');
		expect(offseasonReturnLine(['nba'], { nba: {} }, now)).toBeNull();
		expect(offseasonReturnLine([], {}, now)).toBeNull();
	});
});

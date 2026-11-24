import { allLeagueIds } from '@arenaswap/core/constants';
import {
	isLeagueLogoCacheFresh,
	leagueLogoCacheTtlMs,
	seededLeagueLogos,
} from '../utils/leagueLogoCache';

describe('what the league pickers can draw without asking ESPN', () => {
	it('has a URL for every league the product ships', () => {
		const seeded = seededLeagueLogos();
		expect(Object.keys(seeded)).toHaveLength(allLeagueIds.length);
		const withoutOne = allLeagueIds.filter(leagueId => !(seeded[leagueId] ?? '').startsWith('https://'));
		expect(withoutOne).toEqual([]);
	});
});

describe('how long a fetched set of league logos is kept', () => {
	const fresh = { fetchedAt: 1_000_000, logos: { nba: 'https://example/nba.png' }, schedules: {} };

	it('keeps it for the week after it was written', () => {
		expect(isLeagueLogoCacheFresh(fresh, fresh.fetchedAt)).toBe(true);
		expect(isLeagueLogoCacheFresh(fresh, fresh.fetchedAt + leagueLogoCacheTtlMs - 1)).toBe(true);
	});

	it('lets it go once the week is up', () => {
		expect(isLeagueLogoCacheFresh(fresh, fresh.fetchedAt + leagueLogoCacheTtlMs)).toBe(false);
	});

	it('treats a stamp from the future as stale rather than as fresh forever', () => {
		expect(isLeagueLogoCacheFresh(fresh, fresh.fetchedAt - 1)).toBe(false);
	});

	it('rejects anything that is not the shape it wrote', () => {
		expect(isLeagueLogoCacheFresh(undefined, 1_000_000)).toBe(false);
		expect(isLeagueLogoCacheFresh(null, 1_000_000)).toBe(false);
		expect(isLeagueLogoCacheFresh('nope', 1_000_000)).toBe(false);
		expect(isLeagueLogoCacheFresh({ logos: {} }, 1_000_000)).toBe(false);
		expect(isLeagueLogoCacheFresh({ fetchedAt: 1_000_000 }, 1_000_000)).toBe(false);
		expect(isLeagueLogoCacheFresh({ fetchedAt: Number.NaN, logos: {} }, 1_000_000)).toBe(false);
	});

	it('refetches a copy written before it carried schedules', () => {
		expect(isLeagueLogoCacheFresh({ fetchedAt: 1_000_000, logos: {} }, 1_000_000)).toBe(false);
	});
});

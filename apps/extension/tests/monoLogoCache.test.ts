import type { TeamMonoLogoMap } from '@arenaswap/core/types';
import {
	isMonoLogoCacheFresh,
	missingMonoLogoLeagues,
	monoLogoCacheTtlMs,
} from '../utils/monoLogoCache';

const marks = { dark: 'dark.png', scoreboard: 'scoreboard.png' };
const oneLeague = (): TeamMonoLogoMap => ({ nba: { '1': marks } }) as TeamMonoLogoMap;

describe('what the guide can draw without asking ESPN for team marks again', () => {
	const now = 1_700_000_000_000;

	it('accepts a stamp inside the window', () => {
		expect(isMonoLogoCacheFresh({ fetchedAt: now - 1_000, logos: oneLeague() }, now)).toBe(true);
	});

	it('rejects a stamp past the window', () => {
		expect(isMonoLogoCacheFresh({ fetchedAt: now - monoLogoCacheTtlMs - 1, logos: oneLeague() }, now)).toBe(false);
	});

	it('treats a stamp in the future as stale rather than as fresh forever', () => {
		expect(isMonoLogoCacheFresh({ fetchedAt: now + 60_000, logos: oneLeague() }, now)).toBe(false);
	});

	it('rejects anything that is not the shape it wrote', () => {
		for (const stored of [null, undefined, 'nope', 42, {}, { fetchedAt: now }, { logos: oneLeague() },
			{ fetchedAt: 'soon', logos: oneLeague() }, { fetchedAt: now, logos: null },
			{ fetchedAt: Number.NaN, logos: oneLeague() }]) {
			expect(isMonoLogoCacheFresh(stored, now)).toBe(false);
		}
	});
});

describe('which leagues still have to be asked for', () => {
	it('asks for nothing when every league is held', () => {
		expect(missingMonoLogoLeagues(oneLeague(), ['nba'])).toEqual([]);
	});

	it('asks only for the leagues that are not held', () => {
		expect(missingMonoLogoLeagues(oneLeague(), ['nba', 'nhl', 'mlb'])).toEqual(['nhl', 'mlb']);
	});

	it('counts a league that answered with nothing as held', () => {
		expect(missingMonoLogoLeagues({ nhl: {} } as TeamMonoLogoMap, ['nhl'])).toEqual([]);
	});
});

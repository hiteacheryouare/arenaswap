import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import type { UserPreferences } from '@arenaswap/core/types';
import {
	canUseFantasy,
	changedFantasyRuleCount,
	fantasyRulePoints,
	modeSignalNames,
	toggleModeSignal,
	withFantasyRule,
	withLeagueMode,
	withoutFantasySport,
} from '../utils/scoringPrefs';

const prefs = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({ ...createDefaultUserPreferences(), ...overrides });

describe('toggleModeSignal', () => {
	it('writes Classic switches to the list they have always lived in', () => {
		const next = toggleModeSignal(prefs(), 'classic', 'momentum');
		expect(next.disabledSignals).toEqual(['momentum']);
		expect(next.modeDisabledSignals).toEqual({});
	});

	it('writes another mode\'s switches under that mode, and nothing else', () => {
		const next = toggleModeSignal(prefs(), 'blowouts', 'pileOn');
		expect(next.modeDisabledSignals).toEqual({ blowouts: ['pileOn'] });
		expect(next.disabledSignals).toEqual([]);
	});

	it('turns a switched-off signal back on and drops the empty list', () => {
		const next = toggleModeSignal(prefs({ modeDisabledSignals: { fantasy: ['exposure'] } }), 'fantasy', 'exposure');
		expect(next.modeDisabledSignals).toEqual({});
	});

	it('keeps the last signal of every mode on', () => {
		for (const mode of ['classic', 'blowouts', 'fantasy'] as const) {
			const all = modeSignalNames(mode);
			let current = prefs();
			for (const signal of all) current = toggleModeSignal(current, mode, signal);
			const off = mode === 'classic' ? current.disabledSignals : current.modeDisabledSignals[mode];
			expect(off).toHaveLength(all.length - 1);
		}
	});

	it('ignores a signal the mode does not have', () => {
		const start = prefs();
		expect(toggleModeSignal(start, 'blowouts', 'closeness')).toBe(start);
	});
});

describe('withLeagueMode', () => {
	it('stores Classic as no entry, since a missing league already scores as Classic', () => {
		expect(withLeagueMode({ nba: 'blowouts' }, 'nba', 'classic')).toEqual({});
	});

	it('stores the other modes', () => {
		expect(withLeagueMode({}, 'nfl', 'fantasy')).toEqual({ nfl: 'fantasy' });
		expect(withLeagueMode({}, 'epl', 'blowouts')).toEqual({ epl: 'blowouts' });
	});

	it('refuses Fantasy for a league no roster can hold players from', () => {
		expect(canUseFantasy('epl')).toBe(false);
		expect(withLeagueMode({ epl: 'blowouts' }, 'epl', 'fantasy')).toEqual({});
	});
});

describe('fantasy scoring overrides', () => {
	it('keeps only values that differ from the default', () => {
		const changed = withFantasyRule({}, 'football', 'receptions', 0.5);
		expect(changed).toEqual({ football: { receptions: 0.5 } });
		expect(withFantasyRule(changed, 'football', 'receptions', 1)).toEqual({});
	});

	it('holds a value to the rule\'s bounds', () => {
		expect(withFantasyRule({}, 'basketball', 'steals', 99)).toEqual({ basketball: { steals: 6 } });
		expect(withFantasyRule({}, 'hockey', 'goalsAgainst', -40)).toEqual({ hockey: { goalsAgainst: -5 } });
	});

	it('ignores a rule the sport does not have', () => {
		expect(withFantasyRule({}, 'basketball', 'sacks', 2)).toEqual({});
	});

	it('resets one sport and leaves the others', () => {
		const scoring = { football: { receptions: 0.5 }, hockey: { goals: 4 } };
		expect(withoutFantasySport(scoring, 'football')).toEqual({ hockey: { goals: 4 } });
		expect(changedFantasyRuleCount(scoring)).toBe(2);
	});

	it('reads an override, or the default without one', () => {
		expect(fantasyRulePoints({ football: { receptions: 0.5 } }, 'football', 'receptions')).toBe(0.5);
		expect(fantasyRulePoints({}, 'football', 'passingYards')).toBe(0.04);
	});
});

import { resolveTeamColorPair } from '../src/components/colorUtils';

describe('resolveTeamColorPair', () => {
	const away = { color: '#1D428A', alternateColor: '#FFC72C' };
	const home = { color: '#552583', alternateColor: '#FDB927' };

	test('keeps both primaries when they are already far apart', () => {
		expect(resolveTeamColorPair({ color: '#FF0000' }, { color: '#00FF00' })).toEqual(['#FF0000', '#00FF00']);
	});

	test('falls back to the supplied defaults when a team has no colour', () => {
		expect(resolveTeamColorPair({}, {}, '#111111', '#EEEEEE')).toEqual(['#111111', '#EEEEEE']);
	});

	// An unparseable colour has no channels to measure, so it can never be judged usable.
	test('never emits a malformed colour string', () => {
		const [a, h] = resolveTeamColorPair({ color: 'not-a-color' }, { color: '#00FF00' }, '#123456', '#f87171');
		expect(a).toBe('#123456');
		expect(a).toMatch(/^#[\da-fA-F]{6}$/);
		expect(h).toMatch(/^#[\da-fA-F]{6}$/);
	});

	test('swaps in an alternate when both primaries clash', () => {
		const clashAway = { color: '#0A1F44', alternateColor: '#FFC72C' };
		const clashHome = { color: '#0C2340', alternateColor: '#C8102E' };
		const [a, h] = resolveTeamColorPair(clashAway, clashHome);
		expect([a, h]).not.toEqual(['#0A1F44', '#0C2340']);
	});

	test('returns well-separated primaries unchanged when lighten is off', () => {
		const separatedAway = { color: '#1D428A', alternateColor: '#FFC72C' };
		const separatedHome = { color: '#F1C40F', alternateColor: '#C8102E' };
		expect(resolveTeamColorPair(separatedAway, separatedHome, '#60a5fa', '#f87171', false))
			.toEqual(['#1D428A', '#F1C40F']);
	});

	// Warriors navy against Lakers purple sits ~63 apart in RGB, just inside the clash threshold.
	test('breaks up navy-against-purple rather than drawing both', () => {
		expect(resolveTeamColorPair(away, home)).not.toEqual(['#1D428A', '#552583']);
	});

	// Chart lines sit on a dark surface, so a very dark team colour is mixed toward white.
	test('lightens a near-black colour when lighten is on', () => {
		const [a] = resolveTeamColorPair({ color: '#000000' }, { color: '#00FF00' }, '#60a5fa', '#f87171', true);
		expect(a).not.toBe('#000000');
		expect(a).toMatch(/^#[0-9a-f]{6}$/);
	});

	test('leaves an already-bright colour alone when lighten is on', () => {
		const [, h] = resolveTeamColorPair({ color: '#000000' }, { color: '#00FF00' }, '#60a5fa', '#f87171', true);
		expect(h).toBe('#00FF00');
	});

	// The 3:1 boundary against the #0d1117 chart background sits at luminance 0.1164. Bemidji
	// State's #00694E is 0.1065, or 2.82:1, so it has to be lightened. The threshold read 0.10
	// for a while, and this colour falls in exactly that window.
	test('lightens a colour that clears the old 0.10 threshold but not 3:1', () => {
		const [a] = resolveTeamColorPair({ color: '#00694E' }, { color: '#FFC72C' }, '#60a5fa', '#f87171', true);
		expect(a).toBe('#7ab1a3');
	});

	// #C8102E is luminance 0.1285, or 3.22:1. It already clears the bar, so lightening it would
	// only wash it out.
	test('leaves a colour just above the 3:1 boundary alone', () => {
		const [a] = resolveTeamColorPair({ color: '#C8102E' }, { color: '#FFC72C' }, '#60a5fa', '#f87171', true);
		expect(a).toBe('#C8102E');
	});

	test('is deterministic for the same input', () => {
		expect(resolveTeamColorPair(away, home)).toEqual(resolveTeamColorPair(away, home));
	});
});

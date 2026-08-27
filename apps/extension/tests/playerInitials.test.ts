import { playerInitials } from '../entrypoints/popup/components/pregameLabels';

// The placeholder is the common case in soccer, where ESPN sends a headshot for roughly one leader
// in ten, so these are the names it actually has to render rather than an edge case.
describe('playerInitials', () => {
	test('takes the initial and the surname initial from an already-initialled name', () => {
		expect(playerInitials('D. Peterson')).toBe('DP');
		expect(playerInitials('C. Ellis')).toBe('CE');
		expect(playerInitials('S. Montembeault')).toBe('SM');
	});

	test('stops at two letters however many parts the name has', () => {
		expect(playerInitials('S. Bennett IV')).toBe('SB');
		expect(playerInitials('P. Crow-Armstrong')).toBe('PC');
	});

	test('handles a full name, which is what ESPN falls back to without a shortName', () => {
		expect(playerInitials('David Peterson')).toBe('DP');
	});

	test('handles a single-word name', () => {
		expect(playerInitials('Vinicius')).toBe('V');
	});

	test('uppercases a lowercased name', () => {
		expect(playerInitials('d. peterson')).toBe('DP');
	});

	test('returns empty for an empty name rather than throwing', () => {
		expect(playerInitials('')).toBe('');
		expect(playerInitials('   ')).toBe('');
	});
});

import fullScreenShortcut, { fullScreenKeys } from '../utils/fullScreenShortcut';

describe('fullScreenShortcut', () => {
	test('reads Control-Command-F on a Mac', () => {
		expect(fullScreenKeys('MacIntel')).toEqual(['⌃', '⌘', 'F']);
		expect(fullScreenShortcut('MacIntel')).toBe('⌃⌘F');
	});

	test('reads F11 everywhere else', () => {
		expect(fullScreenShortcut('Win32')).toBe('F11');
		expect(fullScreenShortcut('Linux x86_64')).toBe('F11');
		expect(fullScreenShortcut('')).toBe('F11');
	});
});

import { resolveCrestState } from '../src/components/crest';

describe('resolveCrestState', () => {
	test('is missing when there is no logo to load at all', () => {
		expect(resolveCrestState(undefined, null)).toBe('missing');
		expect(resolveCrestState('', null)).toBe('missing');
		expect(resolveCrestState(undefined, { src: 'a.png', status: 'loaded' })).toBe('missing');
	});

	test('is pending until the logo settles', () => {
		expect(resolveCrestState('a.png', null)).toBe('pending');
	});

	test('reports the outcome once the logo has settled', () => {
		expect(resolveCrestState('a.png', { src: 'a.png', status: 'loaded' })).toBe('loaded');
		expect(resolveCrestState('a.png', { src: 'a.png', status: 'failed' })).toBe('failed');
	});

	// The whole reason the outcome is keyed on the URL. A league mark starts on a hardcoded URL and
	// switches to ESPN's once the live list arrives; a boolean would keep the second one hidden.
	test('retries a new URL rather than carrying the old failure over', () => {
		expect(resolveCrestState('b.png', { src: 'a.png', status: 'failed' })).toBe('pending');
		expect(resolveCrestState('b.png', { src: 'a.png', status: 'loaded' })).toBe('pending');
	});
});

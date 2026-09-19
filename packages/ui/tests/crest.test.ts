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

	// `TeamCrest` measures the artwork it may then replace, and the placeholder stays up over
	// artwork that has loaded and not yet been judged — otherwise a crest bound for a monochrome
	// mark shows the colours it is about to give up.
	test('stays pending while the caller is still judging artwork that has loaded', () => {
		expect(resolveCrestState('a.png', { src: 'a.png', status: 'loaded' }, 'pending')).toBe('pending');
		expect(resolveCrestState('a.png', { src: 'a.png', status: 'loaded' }, 'settled')).toBe('loaded');
	});

	// A failure needs no verdict: there are no pixels to judge and nothing will be swapped in, and
	// calling it pending would lose the one state a stylesheet can tell apart.
	test('reports a failure whether or not a verdict is still out', () => {
		expect(resolveCrestState('a.png', { src: 'a.png', status: 'failed' }, 'pending')).toBe('failed');
	});
});

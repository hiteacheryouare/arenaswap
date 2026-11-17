import { crestFill, resolveCrestState } from '../src/components/crest';

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

	test('retries a new URL rather than carrying the old failure over', () => {
		expect(resolveCrestState('b.png', { src: 'a.png', status: 'failed' })).toBe('pending');
		expect(resolveCrestState('b.png', { src: 'a.png', status: 'loaded' })).toBe('pending');
	});

	test('stays pending while the caller is still judging artwork that has loaded', () => {
		expect(resolveCrestState('a.png', { src: 'a.png', status: 'loaded' }, 'pending')).toBe('pending');
		expect(resolveCrestState('a.png', { src: 'a.png', status: 'loaded' }, 'settled')).toBe('loaded');
	});

	test('reports a failure whether or not a verdict is still out', () => {
		expect(resolveCrestState('a.png', { src: 'a.png', status: 'failed' }, 'pending')).toBe('failed');
	});
});

describe('crestFill', () => {
	test('fills the placeholder with a team colour, in the ink that reads on it', () => {
		expect(crestFill('#0C2340')).toEqual({ '--as-avatar-bg': '#0C2340', '--as-avatar-color': '#ffffff' });
		expect(crestFill('#FFB81C')).toEqual({ '--as-avatar-bg': '#FFB81C', '--as-avatar-color': '#111827' });
	});

	// ESPN sends a colour as something unparseable often enough that the neutral disc has to be
	// what an unusable one falls back to, rather than an empty fill.
	test('leaves the neutral disc alone without a usable colour', () => {
		expect(crestFill(undefined)).toBeUndefined();
		expect(crestFill('')).toBeUndefined();
		expect(crestFill('navy')).toBeUndefined();
	});

	test('paints no disc at all when the crest has no placeholder, team colour or not', () => {
		expect(crestFill('#0C2340', 'none')).toEqual({ '--as-avatar-bg': 'transparent' });
		expect(crestFill(undefined, 'none')).toEqual({ '--as-avatar-bg': 'transparent' });
	});
});

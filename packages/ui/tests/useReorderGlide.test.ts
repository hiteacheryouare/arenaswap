import { keepsRelativeOrder } from '../src/components/useReorderGlide';

describe('keepsRelativeOrder', () => {
	it('notices two cards trading places', () => {
		expect(keepsRelativeOrder(['a', 'b', 'c'], ['b', 'a', 'c'])).toBe(false);
	});

	it('notices one card climbing past several', () => {
		expect(keepsRelativeOrder(['a', 'b', 'c', 'd'], ['d', 'a', 'b', 'c'])).toBe(false);
	});

	it('ignores a card arriving anywhere in the list', () => {
		expect(keepsRelativeOrder(['a', 'b'], ['new', 'a', 'b'])).toBe(true);
		expect(keepsRelativeOrder(['a', 'b'], ['a', 'new', 'b'])).toBe(true);
	});

	it('ignores a card leaving', () => {
		expect(keepsRelativeOrder(['a', 'gone', 'b'], ['a', 'b'])).toBe(true);
	});

	it('still notices a swap when the slate changes in the same push', () => {
		expect(keepsRelativeOrder(['a', 'gone', 'b'], ['b', 'new', 'a'])).toBe(false);
	});

	it('treats the first render as nothing to compare', () => {
		expect(keepsRelativeOrder([], ['a', 'b'])).toBe(true);
	});
});

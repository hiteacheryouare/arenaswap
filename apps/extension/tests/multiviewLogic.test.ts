import { chooseFeatured, isFrameableUrl, planMultiview } from '../utils/multiviewLogic';
import type { multiviewPlanInput } from '../utils/multiviewLogic';

const candidate = (gameId: string, tabId: number, url = `https://stream.example/${gameId}`) => ({ gameId, tabId, url });

const base: multiviewPlanInput = {
	candidates: [candidate('a', 1), candidate('b', 2), candidate('c', 3)],
	scores: [{ gameId: 'a', total: 80 }, { gameId: 'b', total: 70 }, { gameId: 'c', total: 30 }],
	boxedGameIds: [],
	threshold: 65,
	games: 'hot',
	maxBoxes: 4,
	// Sensitivity 4 is an 11-point margin.
	sensitivity: 4,
};

describe('planMultiview', () => {
	test('opens for two hot games and boxes only those, best first', () => {
		expect(planMultiview(base)).toMatchObject({ open: true, gameIds: ['a', 'b'] });
	});

	test('stays shut with one hot game', () => {
		const plan = planMultiview({ ...base, scores: [{ gameId: 'a', total: 90 }, { gameId: 'b', total: 64 }, { gameId: 'c', total: 30 }] });
		expect(plan).toMatchObject({ open: false, gameIds: [] });
	});

	test('keeps a boxed game until it sinks a Sensitivity margin under the threshold', () => {
		const sagging = { ...base, boxedGameIds: ['a', 'b'], scores: [{ gameId: 'a', total: 80 }, { gameId: 'b', total: 55 }] };
		expect(planMultiview(sagging).gameIds).toEqual(['a', 'b']);
		const gone = { ...sagging, scores: [{ gameId: 'a', total: 80 }, { gameId: 'b', total: 53 }] };
		expect(planMultiview(gone).open).toBe(false);
	});

	test('does not give a newcomer the margin a boxed game gets', () => {
		const plan = planMultiview({ ...base, boxedGameIds: ['a', 'b'], scores: [...base.scores.slice(0, 2), { gameId: 'c', total: 60 }] });
		expect(plan.gameIds).toEqual(['a', 'b']);
	});

	test('keeps boxed games in place and puts newcomers behind them', () => {
		const plan = planMultiview({ ...base, boxedGameIds: ['b', 'a'], scores: [...base.scores.slice(0, 2), { gameId: 'c', total: 95 }] });
		expect(plan.gameIds).toEqual(['b', 'a', 'c']);
	});

	test('boxes every registered live game in "every game" mode, but only opens for two hot ones', () => {
		expect(planMultiview({ ...base, games: 'all' }).gameIds).toEqual(['a', 'b', 'c']);
		const oneHot = { ...base, games: 'all' as const, scores: [{ gameId: 'a', total: 90 }, { gameId: 'b', total: 20 }, { gameId: 'c', total: 30 }] };
		expect(planMultiview(oneHot).open).toBe(false);
	});

	test('caps the boxes at the best games', () => {
		const plan = planMultiview({ ...base, games: 'all', maxBoxes: 2 });
		expect(plan.gameIds).toEqual(['a', 'b']);
	});

	test('takes the first tab of a game registered twice, and skips a tab that cannot go in a box', () => {
		const plan = planMultiview({
			...base,
			candidates: [candidate('a', 1, 'chrome://newtab/'), candidate('a', 9), candidate('b', 2), candidate('b', 8)],
		});
		expect(plan.gameIds).toEqual(['a', 'b']);
		expect(plan.tabIdByGameId.get('a')).toBe(9);
		expect(plan.tabIdByGameId.get('b')).toBe(2);
	});

	test('leaves out a registered game with no live score', () => {
		const plan = planMultiview({ ...base, candidates: [...base.candidates, candidate('final', 4)] });
		expect(plan.tabIdByGameId.has('final')).toBe(false);
	});
});

describe('isFrameableUrl', () => {
	test.each([
		['https://www.xfinity.com/stream/live/abc', true],
		['http://localhost:3000/', true],
		['chrome-extension://abc/popup.html', false],
		['chrome://newtab/', false],
		['file:///Users/me/video.mp4', false],
		['not a url', false],
		[undefined, false],
	])('%s → %s', (url, expected) => {
		expect(isFrameableUrl(url)).toBe(expected);
	});
});

describe('chooseFeatured', () => {
	const scores = [{ gameId: 'a', total: 70 }, { gameId: 'b', total: 79 }];
	const input = { gameIds: ['a', 'b'], scores, current: 'a', sensitivity: 4 as const, canChange: true };

	test('starts on the best game', () => {
		expect(chooseFeatured({ ...input, current: null })).toBe('b');
	});

	test('holds the big box until a rival leads by the Sensitivity margin', () => {
		expect(chooseFeatured(input)).toBe('a');
		expect(chooseFeatured({ ...input, scores: [{ gameId: 'a', total: 70 }, { gameId: 'b', total: 81 }] })).toBe('b');
	});

	test('holds through the cooldown even when the margin is met', () => {
		expect(chooseFeatured({ ...input, scores: [{ gameId: 'a', total: 40 }, { gameId: 'b', total: 90 }], canChange: false })).toBe('a');
	});

	test('moves off a game that lost its box', () => {
		expect(chooseFeatured({ ...input, gameIds: ['b'], canChange: false })).toBe('b');
	});

	test('has nothing to feature without a box', () => {
		expect(chooseFeatured({ ...input, gameIds: [] })).toBeNull();
	});
});

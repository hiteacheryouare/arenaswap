import { boxQueueWaitMs, startBoxes } from '../entrypoints/multiview/boxQueue';

const xfinity = (gameId: string) => ({ gameId, url: `https://www.xfinity.com/stream/live/${gameId}/WFXTD` });
const youtube = (gameId: string) => ({ gameId, url: `https://tv.youtube.com/watch/${gameId}` });

const noneReady = new Set<string>();

describe('multiview box queue', () => {
	test('boxes on one site start one at a time, in box order', () => {
		const boxes = [xfinity('phi'), xfinity('mil'), xfinity('bos')];
		expect([...startBoxes(boxes, new Map(), noneReady, 0).keys()]).toEqual(['phi']);
	});

	test('a box on another site starts straight away', () => {
		const boxes = [xfinity('phi'), xfinity('mil'), youtube('bos')];
		expect([...startBoxes(boxes, new Map(), noneReady, 0).keys()]).toEqual(['phi', 'bos']);
	});

	test('the next box starts once the one ahead of it plays', () => {
		const boxes = [xfinity('phi'), xfinity('mil'), xfinity('bos')];
		const started = startBoxes(boxes, new Map([['phi', 0]]), new Set(['phi']), 4000);
		expect(started).toEqual(new Map([['phi', 0], ['mil', 4000]]));
	});

	test('a box that never plays holds up the next one for its wait and no longer', () => {
		const boxes = [xfinity('phi'), xfinity('mil')];
		expect(startBoxes(boxes, new Map([['phi', 0]]), noneReady, boxQueueWaitMs - 1).has('mil')).toBe(false);
		expect(startBoxes(boxes, new Map([['phi', 0]]), noneReady, boxQueueWaitMs).get('mil')).toBe(boxQueueWaitMs);
	});

	test('a box joining an open Multiview waits behind a still-loading newcomer on its site, wherever it sits', () => {
		const boxes = [xfinity('bos'), xfinity('phi'), xfinity('mil')];
		const started = startBoxes(boxes, new Map([['phi', 0], ['mil', 2000]]), new Set(['phi']), 3000);
		expect(started.has('bos')).toBe(false);
	});

	test('a box that has started keeps its start, and a box that left is forgotten', () => {
		const started = startBoxes([xfinity('mil')], new Map([['phi', 0], ['mil', 1000]]), noneReady, 2000);
		expect(started).toEqual(new Map([['mil', 1000]]));
	});

	test('pages without a site never wait', () => {
		const boxes = [{ gameId: 'a', url: 'data:text/html,a' }, { gameId: 'b', url: 'data:text/html,b' }];
		expect([...startBoxes(boxes, new Map(), noneReady, 0).keys()]).toEqual(['a', 'b']);
	});
});

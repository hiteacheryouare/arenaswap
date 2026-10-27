import { createMultiview, isMultiviewBuild, multiviewReadyTimeoutMs, multiviewRetryMs } from '../utils/multiview';
import type { multiviewDeps, multiviewPass } from '../utils/multiview';

const multiviewTabId = 50;

const createDeps = () => {
	const timers: (() => void)[] = [];
	const deps = {
		createTab: jest.fn().mockResolvedValue(multiviewTabId),
		removeTab: jest.fn().mockResolvedValue(undefined),
		allowFrames: jest.fn().mockResolvedValue(undefined),
		forbidFrames: jest.fn().mockResolvedValue(undefined),
		broadcast: jest.fn(),
		reveal: jest.fn().mockResolvedValue(true),
		leaveTo: jest.fn().mockResolvedValue(true),
		save: jest.fn().mockResolvedValue(undefined),
		setTimer: jest.fn((run: () => void) => timers.push(run)),
		clearTimer: jest.fn(),
	} satisfies multiviewDeps;
	return { deps, runTimers: () => timers.splice(0).forEach(run => run()) };
};

const hot = [{ gameId: 'a', total: 80 }, { gameId: 'b', total: 72 }, { gameId: 'c', total: 20 }];
const cooled = [{ gameId: 'a', total: 80 }, { gameId: 'b', total: 30 }, { gameId: 'c', total: 20 }];

const pass = (overrides: Partial<multiviewPass> = {}): multiviewPass => ({
	candidates: [
		{ gameId: 'a', tabId: 1, url: 'https://stream.example/a' },
		{ gameId: 'b', tabId: 2, url: 'https://stream.example/b' },
		{ gameId: 'c', tabId: 3, url: 'https://stream.example/c' },
	],
	scores: hot,
	games: [],
	prefs: { multiviewThreshold: 65, multiviewGames: 'hot', multiviewMaxBoxes: 4, sensitivity: 4, cooldownSeconds: 45, switchDelaySeconds: 0 },
	activeTabId: 1,
	besideTab: { windowId: 7, index: 2 },
	lastSwitchTime: 0,
	now: 100_000,
	...overrides,
});

describe('multiview', () => {
	test('gets ready beside the watched tab without switching, and takes over once two streams play', async () => {
		const { deps } = createDeps();
		const multiview = createMultiview(deps);

		expect(await multiview.update(pass())).toEqual({ active: true, settled: false });
		expect(deps.createTab).toHaveBeenCalledWith({ url: '/multiview.html', windowId: 7, index: 3 });
		expect(deps.allowFrames).toHaveBeenCalledWith(multiviewTabId);
		expect(multiview.lineupFor(multiviewTabId)).toMatchObject({ boxes: [{ gameId: 'a' }, { gameId: 'b' }], featuredGameId: 'a' });
		expect(multiview.lineupFor(99)).toBeNull();

		await multiview.markReady(multiviewTabId, ['a'], 101_000);
		expect(deps.reveal).not.toHaveBeenCalled();
		await multiview.markReady(multiviewTabId, ['a', 'b'], 102_000);
		expect(deps.reveal).toHaveBeenCalledWith(multiviewTabId, expect.objectContaining({ featuredGameId: 'a' }));
		expect(multiview.isShowing()).toBe(true);
	});

	test('does not open inside the cooldown of the last switch', async () => {
		const { deps } = createDeps();
		const multiview = createMultiview(deps);
		expect(await multiview.update(pass({ lastSwitchTime: 90_000 }))).toEqual({ active: false, settled: false });
		expect(deps.createTab).not.toHaveBeenCalled();
	});

	test('waits out the Switch Delay before taking over', async () => {
		const { deps, runTimers } = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass({ prefs: { ...pass().prefs, switchDelaySeconds: 20 } }));
		await multiview.markReady(multiviewTabId, ['a', 'b'], 105_000);
		expect(deps.reveal).not.toHaveBeenCalled();
		runTimers();
		await Promise.resolve();
		expect(deps.reveal).toHaveBeenCalledTimes(1);
	});

	test('calls the takeover off when two streams never start, and leaves that set alone for a while', async () => {
		const { deps } = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass());
		await multiview.markReady(multiviewTabId, ['a'], 101_000);

		const late = 100_000 + multiviewReadyTimeoutMs + 1;
		expect(await multiview.update(pass({ now: late }))).toEqual({ active: false, settled: false });
		expect(deps.reveal).not.toHaveBeenCalled();
		expect(deps.removeTab).toHaveBeenCalledWith(multiviewTabId);
		expect(deps.forbidFrames).toHaveBeenCalledWith(multiviewTabId);

		await multiview.update(pass({ now: late + 1000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(1);
		await multiview.update(pass({ now: late + multiviewRetryMs + 1 }));
		expect(deps.createTab).toHaveBeenCalledTimes(2);
	});

	test('hands the user to the best game and closes when only one is still hot', async () => {
		const { deps } = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass());
		await multiview.markReady(multiviewTabId, ['a', 'b'], 101_000);

		const outcome = await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 200_000 }));
		expect(outcome).toEqual({ active: false, settled: true });
		expect(deps.leaveTo).toHaveBeenCalledWith(1, 'a');
		expect(deps.removeTab).toHaveBeenCalledWith(multiviewTabId);
		expect(deps.leaveTo.mock.invocationCallOrder[0]).toBeLessThan(deps.removeTab.mock.invocationCallOrder[0]);
		expect(multiview.tabId()).toBeNull();
	});

	test('quietly closes a Multiview that was still getting ready when the games cooled', async () => {
		const { deps } = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass());
		expect(await multiview.update(pass({ scores: cooled, now: 110_000 }))).toEqual({ active: false, settled: false });
		expect(deps.leaveTo).not.toHaveBeenCalled();
		expect(deps.removeTab).toHaveBeenCalledWith(multiviewTabId);
	});

	test('reopens after the cooldown once the user closes it themselves', async () => {
		const { deps } = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass());
		expect(await multiview.forget(multiviewTabId, 120_000)).toBe(true);
		expect(deps.removeTab).not.toHaveBeenCalled();

		await multiview.update(pass({ now: 150_000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(1);
		await multiview.update(pass({ now: 166_000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(2);
	});

	test('takes the user back to Multiview after they wander off, once the cooldown runs out', async () => {
		const { deps } = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass());
		await multiview.markReady(multiviewTabId, ['a', 'b'], 101_000);
		deps.reveal.mockClear();

		await multiview.update(pass({ activeTabId: 2, lastSwitchTime: 130_000, now: 140_000 }));
		expect(deps.reveal).not.toHaveBeenCalled();
		await multiview.update(pass({ activeTabId: 2, lastSwitchTime: 130_000, now: 180_000 }));
		expect(deps.reveal).toHaveBeenCalledWith(multiviewTabId, expect.anything());
	});

	test('moves the big box to a game that pulls clear, once its cooldown is over', async () => {
		const { deps } = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass());
		const surging = [{ gameId: 'a', total: 70 }, { gameId: 'b', total: 90 }];
		await multiview.update(pass({ scores: surging, now: 120_000 }));
		expect(multiview.lineupFor(multiviewTabId)?.featuredGameId).toBe('a');
		await multiview.update(pass({ scores: surging, now: 150_000 }));
		expect(multiview.lineupFor(multiviewTabId)?.featuredGameId).toBe('b');
	});

	test('keeps a box on the address it opened with', async () => {
		const { deps } = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass());
		const moved = pass().candidates.map(entry => (entry.gameId === 'a' ? { ...entry, url: 'https://stream.example/elsewhere' } : entry));
		await multiview.update(pass({ candidates: moved, now: 101_000 }));
		expect(multiview.lineupFor(multiviewTabId)?.boxes[0]).toEqual({ gameId: 'a', url: 'https://stream.example/a' });
	});

	test('comes back from a worker restart still knowing its tab', async () => {
		const { deps } = createDeps();
		const first = createMultiview(deps);
		await first.update(pass());
		const saved = deps.save.mock.calls.at(-1)?.[0];

		const restarted = createMultiview(createDeps().deps);
		restarted.restore(saved);
		expect(restarted.tabId()).toBe(multiviewTabId);
		expect(restarted.lineupFor(multiviewTabId)?.boxes.map(box => box.gameId)).toEqual(['a', 'b']);
		restarted.restore({ phase: 'mystery', tabId: 'nope' });
		expect(restarted.tabId()).toBeNull();
	});
});

describe('isMultiviewBuild', () => {
	test('reads the manifest', () => {
		expect(isMultiviewBuild({ permissions: ['tabs', 'declarativeNetRequestWithHostAccess'] })).toBe(true);
		expect(isMultiviewBuild({ permissions: ['tabs'] })).toBe(false);
		expect(isMultiviewBuild({})).toBe(false);
	});
});

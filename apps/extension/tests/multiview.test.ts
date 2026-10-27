import { createMultiview, isMultiviewBuild, multiviewReadyTimeoutMs, multiviewRetryMs } from '../utils/multiview';
import type { multiviewDeps, multiviewPass } from '../utils/multiview';

const multiviewTabId = 50;

const createDeps = () => ({
	createTab: jest.fn().mockResolvedValue(multiviewTabId),
	removeTab: jest.fn().mockResolvedValue(undefined),
	allowFrames: jest.fn().mockResolvedValue(undefined),
	forbidFrames: jest.fn().mockResolvedValue(undefined),
	broadcast: jest.fn(),
	reveal: jest.fn().mockResolvedValue(true),
	leaveTo: jest.fn().mockResolvedValue(true),
	save: jest.fn().mockResolvedValue(undefined),
} satisfies multiviewDeps);

const exciting = [{ gameId: 'a', total: 80 }, { gameId: 'b', total: 72 }, { gameId: 'c', total: 20 }];
const cooled = [{ gameId: 'a', total: 80 }, { gameId: 'b', total: 30 }, { gameId: 'c', total: 20 }];

const pass = (overrides: Partial<multiviewPass> = {}): multiviewPass => ({
	candidates: [
		{ gameId: 'a', tabId: 1, url: 'https://stream.example/a' },
		{ gameId: 'b', tabId: 2, url: 'https://stream.example/b' },
		{ gameId: 'c', tabId: 3, url: 'https://stream.example/c' },
	],
	scores: exciting,
	games: [],
	prefs: { multiviewThreshold: 65, multiviewGames: 'hot', multiviewMaxBoxes: 4, sensitivity: 4, cooldownSeconds: 45, switchDelaySeconds: 0 },
	activeTabId: 1,
	besideTab: { windowId: 7, index: 2 },
	lastSwitchTime: 0,
	now: 100_000,
	...overrides,
});

// Opened and switched to, so the user is on it.
const openMultiview = async (deps: ReturnType<typeof createDeps>) => {
	const multiview = createMultiview(deps);
	await multiview.update(pass());
	return multiview;
};

describe('multiview', () => {
	test('opens beside the watched tab and switches to it straight away', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);

		expect(await multiview.update(pass())).toEqual({ active: true, settled: true });
		expect(deps.createTab).toHaveBeenCalledWith({ url: '/multiview.html', windowId: 7, index: 3 });
		expect(deps.allowFrames).toHaveBeenCalledWith(multiviewTabId);
		expect(deps.allowFrames.mock.invocationCallOrder[0]).toBeLessThan(deps.reveal.mock.invocationCallOrder[0]);
		expect(deps.reveal).toHaveBeenCalledWith(multiviewTabId, expect.objectContaining({ featuredGameId: 'a' }));
		expect(multiview.lineupFor(multiviewTabId)).toMatchObject({ boxes: [{ gameId: 'a' }, { gameId: 'b' }], featuredGameId: 'a' });
		expect(multiview.lineupFor(99)).toBeNull();
	});

	test('does not open inside the cooldown of the last switch', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		expect(await multiview.update(pass({ lastSwitchTime: 90_000 }))).toEqual({ active: false, settled: false });
		expect(deps.createTab).not.toHaveBeenCalled();
	});

	test('waits out the Switch Delay from when the games first qualified', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		const delayed = { ...pass().prefs, switchDelaySeconds: 20 };
		await multiview.update(pass({ prefs: delayed }));
		await multiview.update(pass({ prefs: delayed, now: 110_000 }));
		expect(deps.createTab).not.toHaveBeenCalled();
		await multiview.update(pass({ prefs: delayed, now: 120_000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(1);
	});

	test('starts the Switch Delay over when the games cool off in the middle of it', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		const delayed = { ...pass().prefs, switchDelaySeconds: 20 };
		await multiview.update(pass({ prefs: delayed }));
		await multiview.update(pass({ prefs: delayed, scores: cooled, now: 110_000 }));
		await multiview.update(pass({ prefs: delayed, now: 120_000 }));
		expect(deps.createTab).not.toHaveBeenCalled();
	});

	test('hands the user back when not one stream starts, and leaves those games alone for a while', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);

		const late = 100_000 + multiviewReadyTimeoutMs + 1;
		expect(await multiview.update(pass({ activeTabId: multiviewTabId, now: late }))).toEqual({ active: false, settled: true });
		expect(deps.leaveTo).toHaveBeenCalledWith(1, 'a');
		expect(deps.removeTab).toHaveBeenCalledWith(multiviewTabId);
		expect(deps.forbidFrames).toHaveBeenCalledWith(multiviewTabId);

		await multiview.update(pass({ now: late + 1000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(1);
		await multiview.update(pass({ now: late + multiviewRetryMs + 1 }));
		expect(deps.createTab).toHaveBeenCalledTimes(2);
	});

	test('stays open past the wait once a single stream plays', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.markReady(multiviewTabId, ['b']);
		await multiview.update(pass({ activeTabId: multiviewTabId, now: 100_000 + multiviewReadyTimeoutMs + 1 }));
		expect(deps.removeTab).not.toHaveBeenCalled();
		expect(multiview.tabId()).toBe(multiviewTabId);
	});

	test('hands the user to the best game and closes when only one is still exciting', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.markReady(multiviewTabId, ['a', 'b']);

		const outcome = await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 200_000 }));
		expect(outcome).toEqual({ active: false, settled: true });
		expect(deps.leaveTo).toHaveBeenCalledWith(1, 'a');
		expect(deps.removeTab).toHaveBeenCalledWith(multiviewTabId);
		expect(deps.leaveTo.mock.invocationCallOrder[0]).toBeLessThan(deps.removeTab.mock.invocationCallOrder[0]);
		expect(multiview.tabId()).toBeNull();
	});

	test('closes without moving a user who is on another tab', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		expect(await multiview.update(pass({ scores: cooled, activeTabId: 3, now: 110_000 }))).toEqual({ active: false, settled: false });
		expect(deps.leaveTo).not.toHaveBeenCalled();
		expect(deps.removeTab).toHaveBeenCalledWith(multiviewTabId);
	});

	test('reopens after the cooldown once the user closes it themselves', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		expect(await multiview.forget(multiviewTabId, 120_000)).toBe(true);
		expect(deps.removeTab).not.toHaveBeenCalled();

		await multiview.update(pass({ now: 150_000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(1);
		await multiview.update(pass({ now: 166_000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(2);
	});

	test('takes the user back to Multiview after they wander off, once the cooldown runs out', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.markReady(multiviewTabId, ['a', 'b']);
		deps.reveal.mockClear();

		await multiview.update(pass({ activeTabId: 2, lastSwitchTime: 130_000, now: 140_000 }));
		expect(deps.reveal).not.toHaveBeenCalled();
		await multiview.update(pass({ activeTabId: 2, lastSwitchTime: 130_000, now: 180_000 }));
		expect(deps.reveal).toHaveBeenCalledWith(multiviewTabId, expect.anything());
	});

	test('moves the big box to a game that pulls clear, once its cooldown is over', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		const surging = [{ gameId: 'a', total: 70 }, { gameId: 'b', total: 90 }];
		await multiview.update(pass({ scores: surging, activeTabId: multiviewTabId, now: 120_000 }));
		expect(multiview.lineupFor(multiviewTabId)?.featuredGameId).toBe('a');
		await multiview.update(pass({ scores: surging, activeTabId: multiviewTabId, now: 150_000 }));
		expect(multiview.lineupFor(multiviewTabId)?.featuredGameId).toBe('b');
	});

	test('keeps a box on the address it opened with', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		const moved = pass().candidates.map(entry => (entry.gameId === 'a' ? { ...entry, url: 'https://stream.example/elsewhere' } : entry));
		await multiview.update(pass({ candidates: moved, activeTabId: multiviewTabId, now: 101_000 }));
		expect(multiview.lineupFor(multiviewTabId)?.boxes[0]).toEqual({ gameId: 'a', url: 'https://stream.example/a' });
	});

	test('comes back from a worker restart still knowing its tab', async () => {
		const deps = createDeps();
		await openMultiview(deps);
		const saved = deps.save.mock.calls.at(-1)?.[0];

		const restarted = createMultiview(createDeps());
		restarted.restore(saved);
		expect(restarted.tabId()).toBe(multiviewTabId);
		expect(restarted.lineupFor(multiviewTabId)?.boxes.map(box => box.gameId)).toEqual(['a', 'b']);
		restarted.restore({ tabId: 'nope' });
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

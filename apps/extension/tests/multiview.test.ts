import { createMultiview, isMultiviewBuild, leftMultiviewPage, multiviewReadyTimeoutMs, multiviewRetryMs, multiviewSoloGraceMs, multiviewWarmupGraceMs } from '../utils/multiview';
import type { multiviewDeps, multiviewPass } from '../utils/multiview';

const multiviewTabId = 50;

const createDeps = () => ({
	createTab: jest.fn().mockResolvedValue(multiviewTabId),
	moveTab: jest.fn().mockResolvedValue(undefined),
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
// One game over the line, and another within 10 points of it.
const closing = [{ gameId: 'a', total: 80 }, { gameId: 'b', total: 60 }, { gameId: 'c', total: 20 }];

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

	test('closes the tab it opened when its frames cannot be allowed, and holds off retrying', async () => {
		const deps = createDeps();
		deps.allowFrames.mockRejectedValueOnce(new Error('denied'));
		const multiview = createMultiview(deps);

		expect(await multiview.update(pass())).toEqual({ active: false, settled: false });
		expect(deps.removeTab).toHaveBeenCalledWith(multiviewTabId);
		expect(multiview.tabId()).toBeNull();
		expect(deps.reveal).not.toHaveBeenCalled();

		await multiview.update(pass({ now: 105_000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(1);
	});

	test('warms up out of sight inside the cooldown of the last switch, then shows that same tab', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		expect(await multiview.update(pass({ lastSwitchTime: 90_000 }))).toEqual({ active: false, settled: false });
		expect(deps.createTab).toHaveBeenCalledWith({ url: '/multiview.html', windowId: 7 });
		expect(deps.reveal).not.toHaveBeenCalled();

		expect(await multiview.update(pass({ lastSwitchTime: 90_000, now: 140_000 }))).toEqual({ active: true, settled: true });
		expect(deps.createTab).toHaveBeenCalledTimes(1);
		expect(deps.moveTab).toHaveBeenCalledWith(multiviewTabId, { windowId: 7, index: 3 });
		expect(deps.moveTab.mock.invocationCallOrder[0]).toBeLessThan(deps.reveal.mock.invocationCallOrder[0]);
	});

	test('warms up at the end of the strip while a second game closes in, without switching', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);

		expect(await multiview.update(pass({ scores: closing }))).toEqual({ active: false, settled: false });
		expect(deps.createTab).toHaveBeenCalledWith({ url: '/multiview.html', windowId: 7 });
		expect(deps.allowFrames).toHaveBeenCalledWith(multiviewTabId);
		expect(deps.reveal).not.toHaveBeenCalled();
		expect(multiview.lineupFor(multiviewTabId)).toMatchObject({ boxes: [{ gameId: 'a' }, { gameId: 'b' }], featuredGameId: 'a' });

		expect(await multiview.update(pass({ now: 110_000 }))).toEqual({ active: true, settled: true });
		expect(deps.createTab).toHaveBeenCalledTimes(1);
		expect(deps.reveal).toHaveBeenCalledWith(multiviewTabId, expect.objectContaining({ boxes: [{ gameId: 'a', url: 'https://stream.example/a' }, { gameId: 'b', url: 'https://stream.example/b' }] }));
	});

	test('keeps a warm tab through its grace when the games drift apart, then closes it', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass({ scores: closing }));

		await multiview.update(pass({ scores: cooled, now: 110_000 }));
		await multiview.update(pass({ scores: cooled, now: 110_000 + multiviewWarmupGraceMs - 1 }));
		expect(deps.removeTab).not.toHaveBeenCalled();
		expect(multiview.tabId()).toBe(multiviewTabId);

		await multiview.update(pass({ scores: cooled, now: 110_000 + multiviewWarmupGraceMs }));
		expect(deps.removeTab).toHaveBeenCalledWith(multiviewTabId);
		expect(deps.forbidFrames).toHaveBeenCalledWith(multiviewTabId);
		expect(multiview.tabId()).toBeNull();
	});

	test('starts the grace over when the games close in again', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass({ scores: closing }));
		await multiview.update(pass({ scores: cooled, now: 110_000 }));
		await multiview.update(pass({ scores: closing, now: 150_000 }));
		await multiview.update(pass({ scores: cooled, now: 160_000 }));
		await multiview.update(pass({ scores: cooled, now: 110_000 + multiviewWarmupGraceMs + 1 }));
		expect(deps.removeTab).not.toHaveBeenCalled();
	});

	test('counts the wait for a first stream from when the tab is shown, not from the warm-up', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass({ scores: closing }));
		const shownAt = 100_000 + multiviewReadyTimeoutMs;
		await multiview.update(pass({ now: shownAt }));

		expect(await multiview.update(pass({ activeTabId: multiviewTabId, now: shownAt + 1000 }))).toEqual({ active: true, settled: false });
		expect(deps.leaveTo).not.toHaveBeenCalled();
	});

	test('does not warm up again inside the cooldown after the user closes a warm tab', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		await multiview.update(pass({ scores: closing }));
		await multiview.forget(multiviewTabId, 110_000);

		await multiview.update(pass({ scores: closing, now: 150_000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(1);
		await multiview.update(pass({ scores: closing, now: 160_000 }));
		expect(deps.createTab).toHaveBeenCalledTimes(2);
	});

	test('waits out the Switch Delay from when the games first qualified', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		const delayed = { ...pass().prefs, switchDelaySeconds: 20 };
		await multiview.update(pass({ prefs: delayed }));
		await multiview.update(pass({ prefs: delayed, now: 110_000 }));
		expect(deps.reveal).not.toHaveBeenCalled();
		await multiview.update(pass({ prefs: delayed, now: 120_000 }));
		expect(deps.reveal).toHaveBeenCalledTimes(1);
		expect(deps.createTab).toHaveBeenCalledTimes(1);
	});

	test('starts the Switch Delay over when the games cool off in the middle of it', async () => {
		const deps = createDeps();
		const multiview = createMultiview(deps);
		const delayed = { ...pass().prefs, switchDelaySeconds: 20 };
		await multiview.update(pass({ prefs: delayed }));
		await multiview.update(pass({ prefs: delayed, scores: cooled, now: 110_000 }));
		await multiview.update(pass({ prefs: delayed, now: 120_000 }));
		expect(deps.reveal).not.toHaveBeenCalled();
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

	test('holds through the cooldown when the second game cools off before the streams load', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);

		expect(await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 110_000 }))).toEqual({ active: true, settled: false });
		expect(multiview.lineupFor(multiviewTabId)).toMatchObject({ boxes: [{ gameId: 'a' }, { gameId: 'b' }], solo: false });
		expect(deps.leaveTo).not.toHaveBeenCalled();
		expect(deps.removeTab).not.toHaveBeenCalled();
	});

	test('does not go solo past the cooldown until a stream has played', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);

		await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 150_000 }));
		expect(multiview.lineupFor(multiviewTabId)?.solo).toBe(false);
		await multiview.markReady(multiviewTabId, ['b']);
		await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 151_000 }));
		expect(multiview.lineupFor(multiviewTabId)?.solo).toBe(true);
	});

	test('shows the one exciting game alone and keeps the others loaded behind it', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.markReady(multiviewTabId, ['a', 'b']);

		expect(await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 200_000 }))).toEqual({ active: true, settled: false });
		expect(multiview.lineupFor(multiviewTabId)).toMatchObject({ boxes: [{ gameId: 'a' }, { gameId: 'b' }], featuredGameId: 'a', solo: true });
		expect(deps.leaveTo).not.toHaveBeenCalled();
	});

	test('hands the user to the best game and closes once the solo grace runs out', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.markReady(multiviewTabId, ['a', 'b']);
		await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 200_000 }));

		await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 200_000 + multiviewSoloGraceMs - 1 }));
		expect(deps.leaveTo).not.toHaveBeenCalled();

		const outcome = await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 200_000 + multiviewSoloGraceMs }));
		expect(outcome).toEqual({ active: false, settled: true });
		expect(deps.leaveTo).toHaveBeenCalledWith(1, 'a');
		expect(deps.removeTab).toHaveBeenCalledWith(multiviewTabId);
		expect(deps.leaveTo.mock.invocationCallOrder[0]).toBeLessThan(deps.removeTab.mock.invocationCallOrder[0]);
		expect(multiview.tabId()).toBeNull();
	});

	test('brings every box back when a second game heats up during the solo grace', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.markReady(multiviewTabId, ['a', 'b']);
		await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 200_000 }));

		await multiview.update(pass({ activeTabId: multiviewTabId, now: 230_000 }));
		expect(multiview.lineupFor(multiviewTabId)).toMatchObject({ boxes: [{ gameId: 'a' }, { gameId: 'b' }], solo: false });

		await multiview.update(pass({ scores: cooled, activeTabId: multiviewTabId, now: 200_000 + multiviewSoloGraceMs }));
		expect(deps.leaveTo).not.toHaveBeenCalled();
		expect(deps.createTab).toHaveBeenCalledTimes(1);
	});

	test('hands off at once instead of going solo when the other game has ended', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.markReady(multiviewTabId, ['a', 'b']);
		const ended = [{ gameId: 'a', total: 80 }, { gameId: 'c', total: 20 }];

		expect(await multiview.update(pass({ scores: ended, activeTabId: multiviewTabId, now: 120_000 }))).toEqual({ active: true, settled: false });
		expect(await multiview.update(pass({ scores: ended, activeTabId: multiviewTabId, now: 150_000 }))).toEqual({ active: false, settled: true });
		expect(deps.leaveTo).toHaveBeenCalledWith(1, 'a');
	});

	test('ends the solo grace early for a game outside Multiview that pulls clear', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.markReady(multiviewTabId, ['a', 'b']);
		const fading = [{ gameId: 'a', total: 60 }, { gameId: 'b', total: 30 }, { gameId: 'c', total: 40 }];
		await multiview.update(pass({ scores: fading, activeTabId: multiviewTabId, lastSwitchTime: 100_000, now: 200_000 }));
		expect(deps.leaveTo).not.toHaveBeenCalled();

		const surging = [{ gameId: 'a', total: 50 }, { gameId: 'b', total: 30 }, { gameId: 'c', total: 61 }];
		expect(await multiview.update(pass({ scores: surging, activeTabId: multiviewTabId, lastSwitchTime: 100_000, now: 210_000 }))).toEqual({ active: false, settled: true });
		expect(deps.leaveTo).toHaveBeenCalledWith(3, 'c');
	});

	test('closes without moving a user who is on another tab', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.markReady(multiviewTabId, ['a', 'b']);
		await multiview.update(pass({ scores: cooled, activeTabId: 3, lastSwitchTime: 190_000, now: 200_000 }));

		expect(await multiview.update(pass({ scores: cooled, activeTabId: 3, lastSwitchTime: 200_000 + multiviewSoloGraceMs - 10_000, now: 200_000 + multiviewSoloGraceMs }))).toEqual({ active: false, settled: false });
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

	test('comes back from a worker restart still warming up, and shows the tab once it qualifies', async () => {
		const deps = createDeps();
		await createMultiview(deps).update(pass({ scores: closing }));
		const saved = deps.save.mock.calls.at(-1)?.[0];

		const restartedDeps = createDeps();
		const restarted = createMultiview(restartedDeps);
		restarted.restore(saved);
		expect(await restarted.update(pass({ now: 110_000 }))).toEqual({ active: true, settled: true });
		expect(restartedDeps.createTab).not.toHaveBeenCalled();
		expect(restartedDeps.moveTab).toHaveBeenCalledWith(multiviewTabId, { windowId: 7, index: 3 });
	});

	test('treats a session saved before warm-ups existed as already on show', async () => {
		const deps = createDeps();
		const restarted = createMultiview(deps);
		restarted.restore({ session: { tabId: multiviewTabId, boxes: [{ gameId: 'a', url: 'https://stream.example/a' }, { gameId: 'b', url: 'https://stream.example/b' }], featuredGameId: 'a', readyGameIds: ['a'], startedAt: 100_000, featuredAt: 100_000 } });
		expect(await restarted.update(pass({ activeTabId: multiviewTabId, now: 110_000 }))).toEqual({ active: true, settled: false });
		expect(deps.moveTab).not.toHaveBeenCalled();
	});
});

describe('isMultiviewBuild', () => {
	test('reads the manifest', () => {
		expect(isMultiviewBuild({ permissions: ['tabs', 'declarativeNetRequestWithHostAccess'] })).toBe(true);
		expect(isMultiviewBuild({ permissions: ['tabs'] })).toBe(false);
		expect(isMultiviewBuild({})).toBe(false);
	});
});

describe('leftMultiviewPage', () => {
	const page = 'chrome-extension://x/multiview.html';

	test('stays quiet on the page itself, with or without a hash or query', () => {
		expect(leftMultiviewPage(page, page)).toBe(false);
		expect(leftMultiviewPage(`${page}#top`, page)).toBe(false);
		expect(leftMultiviewPage(`${page}?a=1`, page)).toBe(false);
	});

	test('notices any other address, including a lookalike path', () => {
		expect(leftMultiviewPage('https://stream.example/', page)).toBe(true);
		expect(leftMultiviewPage(`${page}.evil`, page)).toBe(true);
	});
});

describe('multiview hijacked', () => {
	test('lets go of the tab without closing it and holds off the same games', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		deps.createTab.mockClear();

		expect(await multiview.hijacked(multiviewTabId, 120_000)).toBe(true);
		expect(deps.removeTab).not.toHaveBeenCalled();
		expect(deps.forbidFrames).toHaveBeenCalledWith(multiviewTabId);
		expect(multiview.tabId()).toBeNull();

		await multiview.update(pass({ now: 120_000 + 60_000 }));
		expect(deps.createTab).not.toHaveBeenCalled();
	});

	test('keeps the hold through a worker restart', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.hijacked(multiviewTabId, 120_000);
		const saved = deps.save.mock.calls.at(-1)?.[0];

		const restartedDeps = createDeps();
		const restarted = createMultiview(restartedDeps);
		restarted.restore(saved);
		await restarted.update(pass({ now: 120_000 + 60_000 }));
		expect(restartedDeps.createTab).not.toHaveBeenCalled();

		await restarted.update(pass({ now: 120_000 + multiviewRetryMs + 1 }));
		expect(restartedDeps.createTab).toHaveBeenCalledTimes(1);
	});

	test('holds a set that shares a game with the hijacked one', async () => {
		const deps = createDeps();
		const multiview = await openMultiview(deps);
		await multiview.hijacked(multiviewTabId, 120_000);
		deps.createTab.mockClear();

		const withThird = [{ gameId: 'a', total: 80 }, { gameId: 'b', total: 72 }, { gameId: 'c', total: 70 }];
		await multiview.update(pass({ scores: withThird, now: 120_000 + 60_000 }));
		expect(deps.createTab).not.toHaveBeenCalled();
	});

	test('ignores a tab that is not the session', async () => {
		const multiview = await openMultiview(createDeps());
		expect(await multiview.hijacked(99, 120_000)).toBe(false);
		expect(multiview.tabId()).toBe(multiviewTabId);
	});
});

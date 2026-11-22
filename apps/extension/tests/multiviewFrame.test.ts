type listener = (event?: unknown) => void;

const extensionOrigin = 'https://extension.test';

interface fakeVideo {
	volume: number;
	muted: boolean;
	paused: boolean;
	readyState: number;
	videoWidth: number;
	videoHeight: number;
	currentTime: number;
	play: jest.Mock;
	getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
}

class fakeVideoElement {
	getBoundingClientRect() {
		return { left: 0, top: 0, width: 640, height: 360 };
	}
}

class fakeMouseEvent {
	constructor(public type: string, public init: { clientX: number; clientY: number }) {}
}

const mkVideo = (): fakeVideo => Object.assign(Object.create(fakeVideoElement.prototype), {
	volume: 1,
	muted: false,
	paused: true,
	readyState: 4,
	videoWidth: 1920,
	videoHeight: 1080,
	currentTime: 0,
	play: jest.fn().mockResolvedValue(undefined),
});

const drain = async () => {
	for (let i = 0; i < 8; i++) await Promise.resolve();
};

const setup = (options: { ancestorOrigins: string[]; reply?: { muted?: boolean }; replies?: ({ muted?: boolean } | undefined)[] }) => {
	const listeners = new Map<string, listener>();
	const video = mkVideo();
	const controls = { dispatchEvent: jest.fn() };
	const topWindow = {};
	Object.assign(globalThis, { HTMLVideoElement: fakeVideoElement, MouseEvent: fakeMouseEvent, PointerEvent: fakeMouseEvent });
	(globalThis as Record<string, unknown>).defineUnlistedScript = (definition: unknown) => definition;
	(globalThis as Record<string, unknown>).window = { top: topWindow, parent: topWindow, name: 'frame' };
	(globalThis as Record<string, unknown>).location = { ancestorOrigins: options.ancestorOrigins, href: 'https://player.test/' };
	(globalThis as Record<string, unknown>).document = {
		addEventListener: (type: string, handler: listener) => { listeners.set(type, handler); },
		removeEventListener: (type: string) => { listeners.delete(type); },
		querySelectorAll: () => [video],
		elementFromPoint: () => controls,
	};
	const sendMessage = jest.fn().mockResolvedValue(options.reply);
	for (const reply of options.replies ?? []) sendMessage.mockResolvedValueOnce(reply);
	(globalThis as Record<string, unknown>).browser = {
		runtime: {
			getURL: () => `${extensionOrigin}/`,
			sendMessage,
			onMessage: { addListener: jest.fn() },
		},
	};
	return { listeners, video, controls, sendMessage };
};

const run = async () => {
	const { default: script } = await import('../entrypoints/multiviewFrame');
	(script as unknown as { main: () => void }).main();
};

beforeEach(() => {
	jest.resetModules();
	jest.useFakeTimers();
});

afterEach(() => {
	jest.clearAllTimers();
	jest.useRealTimers();
	for (const key of ['defineUnlistedScript', 'window', 'location', 'document', 'browser', 'HTMLVideoElement', 'MouseEvent', 'PointerEvent']) {
		delete (globalThis as Record<string, unknown>)[key];
	}
});

describe('a frame whose top origin is hidden', () => {
	test('never touches its video when Multiview does not answer', async () => {
		const { listeners, video, sendMessage } = setup({ ancestorOrigins: [] });
		await run();
		jest.advanceTimersByTime(1000);
		await drain();

		expect(sendMessage).toHaveBeenCalledTimes(1);
		expect(listeners.size).toBe(0);
		expect(jest.getTimerCount()).toBe(0);
		expect(video.volume).toBe(1);
	});

	test('asks the moment it loads, before any timer runs', async () => {
		const { sendMessage } = setup({ ancestorOrigins: [] });
		await run();

		expect(sendMessage).toHaveBeenCalledTimes(1);
	});

	test('keeps asking when Multiview has not placed it yet, then silences it once told to', async () => {
		const { listeners, video, sendMessage } = setup({ ancestorOrigins: [], replies: [{}, { muted: true }] });
		await run();
		await drain();
		expect(listeners.size).toBe(0);
		expect(video.volume).toBe(1);

		jest.advanceTimersByTime(1000);
		await drain();

		expect(sendMessage).toHaveBeenCalledTimes(2);
		expect(jest.getTimerCount()).toBe(1);
		expect(listeners.has('play')).toBe(true);
		expect(video.volume).toBe(0);
	});
});

describe('a frame inside the Multiview page', () => {
	test('reports the moment its clock starts moving, then goes back to once a second', async () => {
		const { listeners, video, sendMessage } = setup({ ancestorOrigins: [extensionOrigin], reply: { muted: true } });
		await run();
		await drain();
		expect(sendMessage).toHaveBeenCalledTimes(1);

		video.paused = false;
		video.currentTime = 0.25;
		listeners.get('timeupdate')?.();
		await drain();
		expect(sendMessage).toHaveBeenCalledTimes(2);
		expect(sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({ playing: true, time: 0.25 }));

		video.currentTime = 0.5;
		listeners.get('timeupdate')?.();
		await drain();
		expect(sendMessage).toHaveBeenCalledTimes(2);
	});

	test('silences its video on play, and gives it back when told to unmute', async () => {
		const { listeners, video } = setup({ ancestorOrigins: [extensionOrigin], replies: [{ muted: true }], reply: { muted: false } });
		await run();
		await drain();
		listeners.get('play')?.();
		expect(video.volume).toBe(0);

		jest.advanceTimersByTime(1000);
		await drain();

		expect(video.volume).toBe(1);
		expect(video.play).toHaveBeenCalledTimes(1);
	});
	test('moves the mouse over the player a second after its stream plays, so the controls tuck away', async () => {
		const { listeners, video, controls } = setup({ ancestorOrigins: [extensionOrigin], reply: { muted: true } });
		await run();
		await drain();

		listeners.get('playing')?.({ target: video });
		jest.advanceTimersByTime(500);
		listeners.get('playing')?.({ target: video });
		jest.advanceTimersByTime(999);
		expect(controls.dispatchEvent).not.toHaveBeenCalled();

		jest.advanceTimersByTime(1);
		const moves = controls.dispatchEvent.mock.calls.map(([event]) => [event.type, event.init.clientX, event.init.clientY]);
		expect(moves).toEqual([
			['pointermove', 320, 180],
			['mousemove', 320, 180],
			['pointermove', 321, 181],
			['mousemove', 321, 181],
		]);
	});
});

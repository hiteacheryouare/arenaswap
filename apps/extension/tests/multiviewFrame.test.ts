type listener = () => void;

// Node reports a null origin for chrome-extension:// URLs, so the fake extension lives on an https origin.
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
}

const mkVideo = (): fakeVideo => ({
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
	const topWindow = {};
	(globalThis as Record<string, unknown>).defineUnlistedScript = (definition: unknown) => definition;
	(globalThis as Record<string, unknown>).window = { top: topWindow, parent: topWindow, name: 'frame' };
	(globalThis as Record<string, unknown>).location = { ancestorOrigins: options.ancestorOrigins, href: 'https://player.test/' };
	(globalThis as Record<string, unknown>).document = {
		addEventListener: (type: string, handler: listener) => { listeners.set(type, handler); },
		removeEventListener: (type: string) => { listeners.delete(type); },
		querySelectorAll: () => [video],
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
	return { listeners, video, sendMessage };
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
	for (const key of ['defineUnlistedScript', 'window', 'location', 'document', 'browser']) {
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
});

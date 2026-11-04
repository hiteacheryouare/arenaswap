import { leagueConfigMap } from '@arenaswap/core/constants';
import type { ExtensionMessage, LeagueId } from '@arenaswap/core/types';

// The built background worker, running for real, with every page it talks to. The fake in
// fakeBrowser.ts answers the popup on the background's behalf; this one runs background.js itself
// and fakes only the browser underneath it: tabs, windows, storage, messaging and notifications.
// So a switch, a standby park or a boss press here is the shipped worker's own decision, made off
// scoreboards served at the network edge.

export interface liveTab {
	id: number;
	windowId: number;
	index: number;
	url: string;
	title: string;
	active: boolean;
	mutedInfo: { muted: boolean };
	status: 'complete';
}

export interface liveNotification {
	id: string;
	title: string;
	message: string;
}

export interface liveExtensionOptions {
	tabs: { id: number; url: string; title: string; active?: boolean }[];
	local?: Record<string, unknown>;
	session?: Record<string, unknown>;
	sync?: Record<string, unknown>;
	// Whether the user has granted the optional host permission Multiview asks for.
	permissionsGranted?: boolean;
	// Scoreboard events per league, as the scoreboard endpoint sends them.
	events?: Partial<Record<LeagueId, unknown[]>>;
}

type listener = (...args: any[]) => unknown;

interface listenerSet {
	message: Set<listener>;
	storage: Record<'local' | 'session' | 'sync' | 'any', Set<listener>>;
	tabsActivated: Set<listener>;
	tabsRemoved: Set<listener>;
	command: Set<listener>;
}

interface context {
	name: string;
	tabId?: number;
	listeners: listenerSet;
}

export interface liveWorld {
	tabs: () => liveTab[];
	tab: (id: number) => liveTab | undefined;
	activeTabId: () => number | undefined;
	// Every tab the background (or a page) brought forward, oldest first.
	activations: number[];
	created: { id: number; url: string }[];
	notifications: liveNotification[];
	frameMutes: { tabId: number; frameId: number; muted: boolean }[];
	storage: Record<'local' | 'session' | 'sync', Map<string, unknown>>;
	errors: string[];
	// What the background last broadcast, as an open popup would have heard it.
	state: { scores: { gameId: string; total: number; reason?: string }[]; onStandbyStream: boolean } | null;
	broadcasts: number;
	// The scoreboard each league answers with right now. Edit it and the next poll reads the change.
	events: Partial<Record<LeagueId, unknown[]>>;
	// Moves the background's clock forward and fires every timer that came due, as a stretch of play would.
	advanceClock: (ms: number) => void;
	// A message from outside any page, as when the browser itself hands the background something.
	send: (message: ExtensionMessage) => Promise<unknown>;
	// The user clicks a tab in the tab strip.
	userActivates: (tabId: number) => void;
	// The user closes a tab.
	userCloses: (tabId: number) => void;
	// The user presses a keyboard shortcut registered under `name`.
	pressCommand: (name: string) => void;
	// What the Multiview frame script sends from a box: the frame's game, where it is, and its player's clock.
	frameReport: (tabId: number, frameId: number, status: { name: string; href: string; playing: boolean; paused: boolean; time: number }) => Promise<unknown>;
	attach: (win: Window, tabId?: number) => void;
}

export const runtimeId = 'arenaswap-e2e';
const extensionOrigin = `chrome-extension://${runtimeId}`;
export const extensionUrl = (path: string) => `${extensionOrigin}/${path.replace(/^\//, '')}`;

const clone = <T>(value: T): T => (value === undefined ? value : JSON.parse(JSON.stringify(value)) as T);
// Events and messages cross between contexts a task later, as they do between extension processes.
let inFlight = 0;
const later = (run: () => void) => {
	inFlight++;
	setTimeout(() => {
		inFlight--;
		run();
	}, 0);
};

const readStorage = (store: Map<string, unknown>, query: unknown): Record<string, unknown> => {
	if (query === null || query === undefined) return clone(Object.fromEntries(store));
	if (typeof query === 'string') return store.has(query) ? { [query]: clone(store.get(query)) } : {};
	if (Array.isArray(query)) return Object.fromEntries(query.filter(key => store.has(String(key))).map(key => [key, clone(store.get(String(key)))]));
	return Object.fromEntries(
		Object.entries(query as Record<string, unknown>)
			.map(([key, fallback]) => [key, store.has(key) ? clone(store.get(key)) : fallback]),
	);
};

const emptyListeners = (): listenerSet => ({
	message: new Set(),
	storage: { local: new Set(), session: new Set(), sync: new Set(), any: new Set() },
	tabsActivated: new Set(),
	tabsRemoved: new Set(),
	command: new Set(),
});

const event = (set: Set<listener>) => ({
	addListener: (fn: listener) => { set.add(fn); },
	removeListener: (fn: listener) => { set.delete(fn); },
	hasListener: (fn: listener) => set.has(fn),
});

const inert = { addListener: () => {}, removeListener: () => {}, hasListener: () => false };

const createWorld = (options: liveExtensionOptions, manifest: unknown, messages: Record<string, { message: string }>) => {
	const contexts = new Set<context>();
	let clockOffset = 0;
	let nextTabId = 900;
	let granted = options.permissionsGranted ?? false;
	const registeredScripts: { id: string }[] = [];

	const tabs: liveTab[] = options.tabs.map((tab, index) => ({
		id: tab.id,
		windowId: 1,
		index,
		url: tab.url,
		title: tab.title,
		active: tab.active ?? index === 0,
		mutedInfo: { muted: false },
		status: 'complete',
	}));

	const storage = {
		local: new Map(Object.entries(clone(options.local ?? {}))),
		session: new Map(Object.entries(clone(options.session ?? {}))),
		sync: new Map(Object.entries(clone(options.sync ?? {}))),
	};

	const every = (pick: (listeners: listenerSet) => Set<listener>, ...args: unknown[]) => {
		for (const ctx of contexts) for (const fn of pick(ctx.listeners)) later(() => { fn(...clone(args)); });
	};

	const reindex = () => tabs.forEach((tab, index) => { tab.index = index; });

	const activate = (tabId: number) => {
		const target = tabs.find(tab => tab.id === tabId);
		if (!target) return;
		if (!target.active) {
			for (const tab of tabs) tab.active = tab.id === tabId;
			every(listeners => listeners.tabsActivated, { tabId, windowId: 1 });
		}
		world.activations.push(tabId);
	};

	const removeTab = (tabId: number) => {
		const index = tabs.findIndex(tab => tab.id === tabId);
		if (index === -1) return;
		const [gone] = tabs.splice(index, 1);
		reindex();
		every(listeners => listeners.tabsRemoved, tabId, { windowId: 1, isWindowClosing: false });
		// Chrome hands focus to the tab that slid into the closed one's place, or the one before it.
		if (gone!.active && tabs.length > 0) {
			const next = tabs[Math.min(index, tabs.length - 1)]!;
			next.active = true;
			every(listeners => listeners.tabsActivated, { tabId: next.id, windowId: 1 });
		}
	};

	const writeStorage = (area: 'local' | 'session' | 'sync', apply: (store: Map<string, unknown>) => Record<string, { oldValue?: unknown; newValue?: unknown }>) => {
		const changes = apply(storage[area]);
		if (Object.keys(changes).length === 0) return Promise.resolve();
		every(listeners => listeners.storage[area], changes);
		every(listeners => listeners.storage.any, changes, area);
		return Promise.resolve();
	};

	const storageArea = (ctx: context, area: 'local' | 'session' | 'sync') => ({
		get: (query?: unknown) => Promise.resolve(readStorage(storage[area], query ?? null)),
		set: (values: Record<string, unknown>) => writeStorage(area, store => {
			const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
			for (const [key, value] of Object.entries(clone(values))) {
				if (value === undefined) continue;
				changes[key] = { oldValue: store.get(key), newValue: value };
				store.set(key, value);
			}
			return changes;
		}),
		remove: (keys: string | string[]) => writeStorage(area, store => {
			const changes: Record<string, { oldValue?: unknown }> = {};
			for (const key of ([] as string[]).concat(keys)) {
				if (!store.has(key)) continue;
				changes[key] = { oldValue: store.get(key) };
				store.delete(key);
			}
			return changes;
		}),
		clear: () => writeStorage(area, store => {
			const changes = Object.fromEntries([...store].map(([key, oldValue]) => [key, { oldValue }]));
			store.clear();
			return changes;
		}),
		getBytesInUse: () => Promise.resolve(JSON.stringify(Object.fromEntries(storage[area])).length),
		onChanged: event(ctx.listeners.storage[area]),
	});

	const senderOf = (ctx: context) => {
		const tab = ctx.tabId === undefined ? undefined : tabs.find(candidate => candidate.id === ctx.tabId);
		return { id: runtimeId, ...(tab ? { tab: clone(tab), url: tab.url } : {}) };
	};

	// Chrome delivers to every extension context but the sender's, and the first listener to answer
	// is the reply. A listener answers by returning a promise, or through sendResponse.
	const deliver = (message: unknown, sender: object, from: context | null): Promise<unknown> => {
		const receivers = [...contexts].filter(ctx => ctx !== from);
		if (receivers.length === 0) return Promise.reject(new Error('Could not establish connection. Receiving end does not exist.'));
		const payload = clone(message);
		return new Promise(resolve => later(() => {
			const answers: Promise<unknown>[] = [];
			for (const ctx of receivers) {
				for (const fn of ctx.listeners.message) {
					let respond: ((value: unknown) => void) | undefined;
					const replied = new Promise(settle => { respond = settle; });
					const result = fn(clone(payload), clone(sender), (value: unknown) => respond!(value));
					if (result && typeof (result as Promise<unknown>).then === 'function') answers.push(result as Promise<unknown>);
					else if (result === true) answers.push(replied);
				}
			}
			if (answers.length === 0) {
				resolve(undefined);
				return;
			}
			Promise.any(answers).then(value => resolve(clone(value)), () => resolve(undefined));
		}));
	};

	const translate = (key: string, substitutions?: string | string[]) => {
		const entry = messages[key];
		if (!entry) return '';
		const subs = substitutions === undefined ? [] : ([] as string[]).concat(substitutions);
		return entry.message.replace(/\$(\d)/g, (_, index: string) => subs[Number(index) - 1] ?? '');
	};

	const browserFor = (ctx: context) => ({
		runtime: {
			id: runtimeId,
			getManifest: () => clone(manifest),
			getURL: (path: string) => extensionUrl(path),
			getPlatformInfo: () => Promise.resolve({ os: 'mac', arch: 'arm' }),
			sendMessage: (message: ExtensionMessage) => deliver(message, senderOf(ctx), ctx),
			onMessage: event(ctx.listeners.message),
			onInstalled: inert,
			onStartup: inert,
		},
		storage: {
			local: storageArea(ctx, 'local'),
			session: storageArea(ctx, 'session'),
			sync: storageArea(ctx, 'sync'),
			onChanged: event(ctx.listeners.storage.any),
		},
		tabs: {
			query: (query: { active?: boolean } = {}) => Promise.resolve(clone(tabs.filter(tab => query.active === undefined || tab.active === query.active))),
			get: (tabId: number) => {
				const tab = tabs.find(candidate => candidate.id === tabId);
				return tab ? Promise.resolve(clone(tab)) : Promise.reject(new Error(`No tab with id: ${tabId}.`));
			},
			getCurrent: () => Promise.resolve(clone(tabs.find(tab => tab.id === ctx.tabId))),
			update: (tabId: number, props: { active?: boolean; muted?: boolean; url?: string }) => {
				const tab = tabs.find(candidate => candidate.id === tabId);
				if (!tab) return Promise.reject(new Error(`No tab with id: ${tabId}.`));
				if (props.muted !== undefined) tab.mutedInfo = { muted: props.muted };
				if (props.url !== undefined) tab.url = props.url;
				if (props.active) activate(tabId);
				return Promise.resolve(clone(tab));
			},
			create: (props: { url?: string; active?: boolean; index?: number }) => {
				const tab: liveTab = {
					id: nextTabId++,
					windowId: 1,
					index: 0,
					url: props.url ?? 'chrome://newtab/',
					title: props.url ?? 'New Tab',
					active: false,
					mutedInfo: { muted: false },
					status: 'complete',
				};
				tabs.splice(Math.min(props.index ?? tabs.length, tabs.length), 0, tab);
				reindex();
				world.created.push({ id: tab.id, url: tab.url });
				if (props.active !== false) activate(tab.id);
				return Promise.resolve(clone(tab));
			},
			remove: (tabIds: number | number[]) => {
				for (const tabId of ([] as number[]).concat(tabIds)) removeTab(tabId);
				return Promise.resolve();
			},
			sendMessage: (tabId: number, message: { type: string; muted?: boolean }, opts: { frameId?: number } = {}) => {
				if (message.type === 'MULTIVIEW_MUTE') world.frameMutes.push({ tabId, frameId: opts.frameId ?? 0, muted: message.muted === true });
				return Promise.resolve(undefined);
			},
			onActivated: event(ctx.listeners.tabsActivated),
			onRemoved: event(ctx.listeners.tabsRemoved),
			onUpdated: inert,
		},
		windows: {
			get: () => Promise.resolve({ id: 1, focused: true, state: 'normal', type: 'normal' }),
			getLastFocused: () => Promise.resolve({ id: 1, focused: true, state: 'normal', type: 'normal' }),
			update: () => Promise.resolve({ id: 1, focused: true, state: 'normal', type: 'normal' }),
		},
		notifications: {
			create: (id: string, notification: { title: string; message: string }) => {
				world.notifications.push({ id, title: notification.title, message: notification.message });
				return Promise.resolve(id);
			},
			clear: () => Promise.resolve(true),
			onClicked: inert,
		},
		alarms: {
			create: () => Promise.resolve(),
			clear: () => Promise.resolve(true),
			get: () => Promise.resolve(undefined),
			onAlarm: inert,
		},
		commands: {
			getAll: () => Promise.resolve([{ name: 'boss-button', shortcut: '⌥⇧X', description: '' }]),
			onCommand: event(ctx.listeners.command),
		},
		permissions: {
			contains: () => Promise.resolve(granted),
			request: () => { granted = true; return Promise.resolve(true); },
			remove: () => { granted = false; return Promise.resolve(true); },
		},
		declarativeNetRequest: {
			updateSessionRules: () => Promise.resolve(),
			getSessionRules: () => Promise.resolve([]),
		},
		scripting: {
			getRegisteredContentScripts: ({ ids }: { ids?: string[] } = {}) => Promise.resolve(registeredScripts.filter(script => !ids || ids.includes(script.id))),
			registerContentScripts: (scripts: { id: string }[]) => { registeredScripts.push(...scripts); return Promise.resolve(); },
			unregisterContentScripts: ({ ids }: { ids?: string[] } = {}) => {
				for (const id of ids ?? []) registeredScripts.splice(registeredScripts.findIndex(script => script.id === id), 1);
				return Promise.resolve();
			},
		},
		webNavigation: { getFrame: () => Promise.resolve(null) },
		i18n: {
			getUILanguage: () => 'en-US',
			getMessage: translate,
		},
	});

	const world: liveWorld & { browserFor: typeof browserFor; contexts: Set<context>; clockOffset: () => number; fireDueTimers: () => void; scheduledDelays: () => number[] } = {
		tabs: () => clone(tabs),
		tab: tabId => clone(tabs.find(tab => tab.id === tabId)),
		activeTabId: () => tabs.find(tab => tab.active)?.id,
		activations: [],
		created: [],
		notifications: [],
		frameMutes: [],
		storage,
		errors: [],
		events: options.events ?? {},
		advanceClock: ms => {
			clockOffset += ms;
			world.fireDueTimers();
		},
		fireDueTimers: () => {},
		scheduledDelays: () => [],
		state: null,
		broadcasts: 0,
		send: message => deliver(message, { id: runtimeId }, listening),
		userActivates: tabId => activate(tabId),
		userCloses: tabId => removeTab(tabId),
		pressCommand: name => every(listeners => listeners.command, name),
		frameReport: (tabId, frameId, status) => {
			const tab = tabs.find(candidate => candidate.id === tabId);
			return deliver({ type: 'MULTIVIEW_FRAME_STATUS', firstLevel: true, ...status }, { id: runtimeId, tab: clone(tab), frameId }, listening);
		},
		attach: (win, tabId) => {
			const ctx: context = { name: tabId === undefined ? 'popup' : `tab ${tabId}`, tabId, listeners: emptyListeners() };
			contexts.add(ctx);
			win.addEventListener('pagehide', () => contexts.delete(ctx));
			const fake = browserFor(ctx);
			(win as unknown as { browser: unknown }).browser = fake;
			(win as unknown as { chrome: unknown }).chrome = fake;
		},
		browserFor,
		contexts,
		clockOffset: () => clockOffset,
	};

	const listening: context = { name: 'spec', listeners: emptyListeners() };
	listening.listeners.message.add((message: { type: string }) => {
		if (message.type !== 'SCORES_UPDATED') return;
		world.state = message as unknown as liveWorld['state'];
		world.broadcasts++;
	});
	contexts.add(listening);
	return world;
};

type internalWorld = ReturnType<typeof createWorld>;

const frameId = 'arenaswap-live-background';

let running: liveWorld | null = null;

const removeBackground = () => {
	document.getElementById(frameId)?.remove();
};

// The worker gets a document of its own, in the spec's window rather than the page's, so it keeps
// running while popups and tabs open and close around it, as a service worker does.
const startBackground = (world: internalWorld, source: string) => {
	removeBackground();
	const frame = document.createElement('iframe');
	frame.id = frameId;
	frame.style.display = 'none';
	document.body.appendChild(frame);
	const win = frame.contentWindow as Window & typeof globalThis;

	const ctx: context = { name: 'background', listeners: emptyListeners() };
	world.contexts.add(ctx);
	const fake = world.browserFor(ctx);
	(win as unknown as { browser: unknown }).browser = fake;
	(win as unknown as { chrome: unknown }).chrome = fake;

	const RealDate = win.Date;
	const offset = world.clockOffset;
	const now = () => RealDate.now() + offset();

	// Short waits (request spacing, a two-second situation wait, a zero-delay hop) run in real time.
	// Anything longer — the league polls, the keepalive, a held switch — waits for the spec to move
	// the clock, so a minute of play costs no minute of waiting.
	const realTimerMaxMs = 2000;
	const realSetTimeout = win.setTimeout.bind(win);
	const realClearTimeout = win.clearTimeout.bind(win);
	const realSetInterval = win.setInterval.bind(win);
	const realClearInterval = win.clearInterval.bind(win);
	const virtual = new Map<number, { due: number; delay: number; run: () => void; every?: number }>();
	let nextVirtualId = 1_000_000;
	const schedule = (fn: unknown, ms: number, args: unknown[], every?: number) => {
		const id = nextVirtualId++;
		virtual.set(id, { due: now() + ms, delay: ms, run: () => (fn as (...rest: unknown[]) => void)(...args), every });
		return id;
	};
	Object.assign(win, {
		setTimeout: (fn: unknown, ms = 0, ...args: unknown[]) => (ms <= realTimerMaxMs ? realSetTimeout(fn as () => void, ms, ...args) : schedule(fn, ms, args)),
		setInterval: (fn: unknown, ms = 0, ...args: unknown[]) => (ms <= realTimerMaxMs ? realSetInterval(fn as () => void, ms, ...args) : schedule(fn, ms, args, ms)),
		clearTimeout: (id?: number) => { if (id !== undefined && !virtual.delete(id)) realClearTimeout(id); },
		clearInterval: (id?: number) => { if (id !== undefined && !virtual.delete(id)) realClearInterval(id); },
	});
	world.scheduledDelays = () => [...virtual.values()].map(timer => timer.delay);
	// Every random range at its top, as the Jest suite has it, so each league's first poll lands on
	// a known delay instead of somewhere in its first fifteen seconds.
	win.Math.random = () => 0.999;
	world.fireDueTimers = () => {
		for (let fired = 0; fired < 1000; fired++) {
			const due = [...virtual].filter(([, timer]) => timer.due <= now()).toSorted(([, a], [, b]) => a.due - b.due)[0];
			if (!due) return;
			const [id, timer] = due;
			if (timer.every === undefined) virtual.delete(id);
			else timer.due += timer.every;
			timer.run();
		}
	};
	class WorkerDate extends RealDate {
		constructor(...args: unknown[]) {
			if (args.length === 0) super(RealDate.now() + offset());
			else super(...(args as [string]));
		}

		static override now() {
			return RealDate.now() + offset();
		}
	}
	(win as unknown as { Date: unknown }).Date = WorkerDate;

	win.addEventListener('error', error => { world.errors.push(String(error.error?.stack ?? error.message)); });
	win.addEventListener('unhandledrejection', rejection => { world.errors.push(String((rejection.reason as Error)?.stack ?? rejection.reason)); });

	// The spec document's CSP leaves a script element inert, so the source goes in through eval.
	(win as unknown as { eval: (code: string) => void }).eval(source);
};

// A 1x1 transparent PNG, as in e2e.ts: logos never reach the network.
const blankPng = Cypress.Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
);

const interceptSources = (world: internalWorld) => {
	cy.intercept({ hostname: 'a.espncdn.com' }, { statusCode: 200, headers: { 'content-type': 'image/png' }, body: blankPng });
	cy.intercept({ hostname: 'sports.core.api.espn.com' }, { statusCode: 200, body: {} });
	cy.intercept({ hostname: 'site.api.espn.com' }, { statusCode: 200, body: {} });
	cy.intercept({ hostname: 'site.api.espn.com', pathname: /\/scoreboard$/ }, request => {
		const league = (Object.keys(world.events) as LeagueId[])
			.find(id => request.url.includes(`/${leagueConfigMap[id].espnPath}/scoreboard`));
		request.reply({ statusCode: 200, body: { events: league ? world.events[league] : [] } });
	}).as('scoreboard');
	cy.intercept({ hostname: 'site.api.espn.com', pathname: /\/teams$/ }, { statusCode: 200, body: { sports: [{ leagues: [{ teams: [] }] }] } });
};

beforeEach(() => {
	removeBackground();
	running = null;
});
afterEach(removeBackground);

/** Boots the built background worker against a fake browser holding `options.tabs`. */
export const startExtension = (options: liveExtensionOptions) => {
	cy.request('/manifest.json').its('body').then(manifest => {
		cy.request('/_locales/en/messages.json').its('body').then((messages: Record<string, { message: string }>) => {
			cy.request({ url: '/background.js', encoding: 'utf8' }).its('body').then((source: string) => {
				const world = createWorld(options, manifest, messages);
				const followsLeagues = ((options.sync?.prefs as { enabledLeagues?: unknown[] } | undefined)?.enabledLeagues?.length ?? 0) > 0;
				interceptSources(world);
				cy.then(() => startBackground(world, source));
				// Booted once it has scored its first slate and queued each league's first poll.
				cy.wrap(world, { log: false, timeout: 15_000 }).should(live => {
					expect(live.state, 'first broadcast').to.not.equal(null);
					if (followsLeagues) expect(live.scheduledDelays().some(delay => delay >= 14_000 && delay <= 15_000), 'league polls queued').to.equal(true);
				});
				cy.then(() => { running = world; });
				cy.wrap(world as liveWorld, { log: false }).as('world');
			});
		});
	});
};

export const world = () => cy.get<liveWorld>('@world', { log: false });

/** Lets `ms` of play go by: the worker's clock moves on and every poll that came due runs. */
export const play = (ms: number) => {
	// Whatever the user just did reaches the worker before the clock moves past it.
	cy.wrap(null, { log: false }).should(() => expect(inFlight, 'events still in flight').to.equal(0));
	world().then(live => {
		const before = live.broadcasts;
		live.advanceClock(ms);
		// Every league the worker follows has polled, scored and acted on what it found.
		const leagues = Object.keys(live.events).length;
		if (leagues > 0) cy.wrap(live, { log: false, timeout: 10_000 }).should(settled => expect(settled.broadcasts - before, 'polls answered').to.be.at.least(leagues));
	});
	cy.wrap(null, { log: false }).should(() => expect(inFlight, 'events still in flight').to.equal(0));
};

/** The PowerScore the background last broadcast for `gameId`. */
export const broadcastTotal = (live: liveWorld, gameId: string) => live.state?.scores.find(score => score.gameId === gameId)?.total;

/** Opens an extension page as the tab `tabId`, or as the popup when there is no tab. */
export const openPage = (path: string, tabId?: number) => {
	if (tabId === undefined) cy.viewport(320, 560);
	else cy.viewport(1280, 720);
	world().then(live => {
		cy.visit(path, { onBeforeLoad: win => live.attach(win, tabId) });
	});
};

export const openPopup = () => openPage('/popup.html');

/** Fails the test on anything the worker threw that nothing caught. */
export const expectHealthyBackground = () => {
	if (running) expect(running.errors, 'background errors').to.deep.equal([]);
};

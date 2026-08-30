import type { BackgroundState, TabRegistration, UserPreferences } from '@arenaswap/core/types';

export interface fakeTab { id: number; title: string; url: string }

export interface fakeBrowserOptions {
	/** Flattened messages.json from the build, keyed the way `browser.i18n` keys it (dots → underscores). */
	messages: Record<string, { message: string }>;
	state?: Partial<BackgroundState>;
	local?: Record<string, unknown>;
	session?: Record<string, unknown>;
	sync?: Record<string, unknown>;
	tabs?: fakeTab[];
}

/** Everything a spec can reach into after the popup has booted. */
export interface fakeBackground {
	state: BackgroundState;
	prefs: UserPreferences | null;
	registry: TabRegistration[];
	demoMode: boolean;
	standbyStreamTabId: number | null;
	sent: { type: string; [key: string]: unknown }[];
	openedUrls: string[];
	storage: { local: Map<string, unknown>; session: Map<string, unknown>; sync: Map<string, unknown> };
	/** Fires SCORES_UPDATED at the popup the way the real background worker does. */
	pushScores: (patch?: Partial<BackgroundState>) => void;
}

const emptyState = (): BackgroundState => ({
	games: [],
	scores: [],
	leagueLogos: {},
	scoreHistory: {},
	powerScoreHistory: {},
	gameBoosts: {},
	onStandbyStream: false,
	standbyStreamTabId: null,
});

// browser.storage.*.get takes either null (everything) or a defaults object, and resolves the
// defaults for keys that were never written. Both shapes are on the popup's hot path.
const readStorage = (store: Map<string, unknown>, query: unknown): Record<string, unknown> => {
	if (query === null || query === undefined) return Object.fromEntries(store);
	if (typeof query === 'string') return { [query]: store.get(query) };
	if (Array.isArray(query)) return Object.fromEntries(query.map(key => [key, store.get(String(key))]));
	return Object.fromEntries(
		Object.entries(query as Record<string, unknown>)
			.map(([key, fallback]) => [key, store.has(key) ? store.get(key) : fallback]),
	);
};

// Chrome's i18n runtime substitutes positionally ($1, $2) and returns '' for a missing key, which
// is how a typo'd key shows up as a blank in the UI instead of throwing.
const translate = (
	messages: Record<string, { message: string }>,
	key: string,
	substitutions?: string | string[],
): string => {
	const entry = messages[key];
	if (!entry) return '';
	const subs = substitutions === undefined ? [] : ([] as string[]).concat(substitutions);
	return entry.message.replace(/\$(\d)/g, (_, index: string) => subs[Number(index) - 1] ?? '');
};

export const installFakeBrowser = (win: Window, options: fakeBrowserOptions): fakeBackground => {
	const listeners = new Set<(message: unknown) => void>();

	const background: fakeBackground = {
		state: { ...emptyState(), ...options.state },
		prefs: null,
		registry: [],
		demoMode: false,
		standbyStreamTabId: null,
		sent: [],
		openedUrls: [],
		storage: {
			local:   new Map(Object.entries(options.local ?? {})),
			session: new Map(Object.entries(options.session ?? {})),
			sync:    new Map(Object.entries(options.sync ?? {})),
		},
		pushScores: patch => {
			background.state = { ...background.state, ...patch };
			const message = { type: 'SCORES_UPDATED', ...background.state };
			for (const listener of listeners) listener(message);
		},
	};

	// Stands in for the background service worker. The popup only ever reaches the outside world by
	// radioing one of these seven message types, so this switchboard is the whole of its backend.
	//
	// It records rather than simulates: a message updates the matching `background` field and
	// nothing else. Specs assert on those fields and drive visible change with cy.pushScores(),
	// which keeps scoring logic in the real background where it belongs instead of drifting into a
	// second copy here.
	const handleMessage = (message: { type: string; [key: string]: unknown }): unknown => {
		switch (message.type) {
			// Answering with anything else leaves the popup permanently empty: the reply goes through
			// BackgroundStateSchema, which quietly falls back to an empty state.
			case 'GET_STATE':
				return background.state;

			case 'UPDATE_PREFS':
				background.prefs = message.prefs as UserPreferences;
				return undefined;

			case 'UPDATE_REGISTRY':
				background.registry = message.tabRegistry as TabRegistration[];
				return undefined;

			case 'SET_GAME_BOOST':
				background.state.gameBoosts[message.gameId as string] = message.boost as number;
				return undefined;

			case 'SET_DEMO_MODE':
				background.demoMode = message.enabled as boolean;
				return undefined;

			case 'SET_STANDBY_STREAM_TAB':
				background.standbyStreamTabId = message.tabId as number | null;
				return undefined;

			default:
				return undefined;
		}
	};

	const area = (store: Map<string, unknown>) => ({
		get: (query?: unknown) => Promise.resolve(readStorage(store, query ?? null)),
		set: (values: Record<string, unknown>) => {
			for (const [key, value] of Object.entries(values)) store.set(key, value);
			return Promise.resolve();
		},
		remove: (key: string) => { store.delete(key); return Promise.resolve(); },
		clear: () => { store.clear(); return Promise.resolve(); },
	});

	const fake = {
		runtime: {
			// WXT's shim picks globalThis.browser only when runtime.id is truthy, so this is load-bearing.
			id: 'arenaswap-e2e',
			getManifest: () => ({ version: '2.0.0', manifest_version: 3 }),
			sendMessage: (message: { type: string; [key: string]: unknown }) => {
				background.sent.push(message);
				return Promise.resolve(handleMessage(message));
			},
			onMessage: {
				addListener: (listener: (message: unknown) => void) => { listeners.add(listener); },
				removeListener: (listener: (message: unknown) => void) => { listeners.delete(listener); },
			},
		},
		storage: {
			local:   area(background.storage.local),
			session: area(background.storage.session),
			sync:    area(background.storage.sync),
		},
		tabs: {
			query: () => Promise.resolve(options.tabs ?? []),
			create: ({ url }: { url: string }) => {
				background.openedUrls.push(url);
				return Promise.resolve({ id: 9000 + background.openedUrls.length, url, title: url });
			},
		},
		i18n: {
			getMessage: (key: string, substitutions?: string | string[]) =>
				translate(options.messages, key, substitutions),
		},
	};

	(win as unknown as { browser: unknown }).browser = fake;
	(win as unknown as { chrome: unknown }).chrome = fake;
	return background;
};

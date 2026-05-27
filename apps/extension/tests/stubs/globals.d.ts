// Declares the WXT-injected `browser` global so unit-test compilations of
// modules that reference it succeed without pulling in WXT's full type bundle.
// Uses `any` for return types so background.ts can destructure responses freely.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const browser: {
	runtime: {
		sendMessage: (...args: unknown[]) => Promise<any>;
		onMessage: {
			addListener: (listener: (msg: any) => any) => void;
			removeListener: (listener: (msg: any) => any) => void;
		};
	};
	storage: {
		sync: {
			get: (keys: unknown) => Promise<any>;
			set: (items: unknown) => Promise<void>;
		};
		session: {
			get: (keys: unknown) => Promise<any>;
			set: (items: unknown) => Promise<void>;
		};
		local: {
			get: (keys: unknown) => Promise<any>;
			set: (items: unknown) => Promise<void>;
		};
	};
	tabs: {
		query: (queryInfo: unknown) => Promise<{ id?: number; title?: string; url?: string }[]>;
		update: (tabId: number, updateProperties: unknown) => Promise<any>;
		onActivated: {
			addListener: (listener: (...args: unknown[]) => unknown) => void;
		};
	};
	notifications: {
		create: (options: unknown) => Promise<string>;
	};
};

// WXT-injected global that wraps the background service worker entry point.
declare const defineBackground: (fn: () => unknown) => unknown;

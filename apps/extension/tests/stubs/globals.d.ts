// Declares the WXT-injected `browser` global so unit-test compilations of
// modules that reference it succeed without pulling in WXT's full type bundle.
declare const browser: {
	runtime: {
		sendMessage: (...args: unknown[]) => Promise<unknown>;
	};
};

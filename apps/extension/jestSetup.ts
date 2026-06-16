process.env.TZ = 'UTC';

// Stub the WXT-injected browser global so non-browser unit tests can load
// modules that reference `browser` without actually calling it.
(globalThis as { browser?: unknown }).browser = {};

// Stub HTMLElement so `instanceof HTMLElement` guards can evaluate in a Node
// test environment without throwing. The class is intentionally empty — the
// guards only check identity, not behavior. DOM-specific tests should run
// under jsdom; these unit tests cover the non-DOM branches.
if (typeof (globalThis as { HTMLElement?: unknown }).HTMLElement === 'undefined') {
	(globalThis as { HTMLElement: unknown }).HTMLElement = class HTMLElementStub { readonly nodeType = 1; };
}

afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

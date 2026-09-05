// Stubs the WXT-injected global so unit tests can load modules that reference `browser`.
(globalThis as { browser?: unknown }).browser = {};

// Empty on purpose: `instanceof HTMLElement` guards only check identity, and DOM-specific
// behaviour is covered by the jsdom specs.
if (typeof (globalThis as { HTMLElement?: unknown }).HTMLElement === 'undefined') {
	(globalThis as { HTMLElement: unknown }).HTMLElement = class HTMLElementStub { readonly nodeType = 1; };
}

afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

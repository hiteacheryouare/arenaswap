(globalThis as { browser?: unknown }).browser = {};

if (typeof (globalThis as { HTMLElement?: unknown }).HTMLElement === 'undefined') {
	(globalThis as { HTMLElement: unknown }).HTMLElement = class HTMLElementStub { readonly nodeType = 1; };
}

afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

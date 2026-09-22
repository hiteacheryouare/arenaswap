// Stands in for `wxt/browser` in both test runners, so a module can reference its `Browser`
// namespace or its `browser` value without pulling in WXT.
export namespace Browser {
	export namespace tabs {
		export interface Tab {
			id?: number;
			title?: string;
			url?: string;
		}
	}
}

// The runtime value WXT injects as a global. Only the guide's app shell imports it rather than
// reading the global directly, and both the Jest and Cypress runners need something real behind
// that import. A proxy rather than a snapshot, so a spec that installs its fake after this module
// is evaluated still gets it.
export const browser = new Proxy({} as Record<string, unknown>, {
	get: (_target, property) => (globalThis as Record<string, any>).browser?.[property],
}) as any;

// Minimal type-only stub for `wxt/browser` so unit tests can import
// modules that reference its `Browser` namespace without pulling in WXT.
export namespace Browser {
	export namespace tabs {
		export interface Tab {
			id?: number;
			title?: string;
			url?: string;
		}
	}
}

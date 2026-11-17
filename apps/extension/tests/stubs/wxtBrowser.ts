export namespace Browser {
	export namespace tabs {
		export interface Tab {
			id?: number;
			title?: string;
			url?: string;
			favIconUrl?: string;
		}
	}
}

export const browser = new Proxy({} as Record<string, unknown>, {
	get: (_target, property) => (globalThis as Record<string, any>).browser?.[property],
}) as any;

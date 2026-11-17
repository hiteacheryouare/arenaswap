export const bossCommandName = 'boss-button';
export const bossHushedKey = 'bossHushed';

const schemePattern = /^[a-z][a-z\d+.-]*:\/\//i;

export const normalizeDecoyUrl = (raw: string): string | null => {
	const text = raw.trim();
	if (!text) return null;
	let url: URL;
	try {
		url = new URL(schemePattern.test(text) ? text : `https://${text}`);
	} catch {
		return null;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	if (url.username || url.password) return null;
	const { hostname } = url;
	if (!hostname.includes('.') && !hostname.includes(':') && hostname !== 'localhost') return null;
	return url.href;
};

const pageKey = (raw: string | undefined): string | null => {
	if (!raw) return null;
	try {
		const url = new URL(raw);
		return `${url.origin}${url.pathname.replace(/\/+$/, '')}${url.search}`;
	} catch {
		return null;
	}
};

export const isDecoyTab = (tabUrl: string | undefined, decoyUrl: string): boolean => {
	const wanted = pageKey(decoyUrl);
	return wanted !== null && wanted === pageKey(tabUrl);
};

interface bossTab {
	id?: number;
	windowId?: number;
	url?: string;
}

export interface bossModeDeps {
	tabs: {
		query: (queryInfo: object) => Promise<bossTab[]>;
		update: (tabId: number, props: { active: true }) => Promise<unknown>;
		create: (props: { url?: string }) => Promise<unknown>;
	};
	windows: { update: (windowId: number, info: { focused: true }) => Promise<unknown> };
	getDecoyUrl: () => string;
	pause: () => Promise<void>;
	muteManagedTabs: () => Promise<void>;
	saveHushed: (hushed: boolean) => Promise<void>;
}

export const createBossMode = (deps: bossModeDeps) => {
	let hushed = false;

	const openDecoy = async () => {
		const decoyUrl = normalizeDecoyUrl(deps.getDecoyUrl());
		if (decoyUrl === null) {
			await deps.tabs.create({});
			return;
		}
		const openTabs = await deps.tabs.query({});
		const existing = openTabs.find(tab => tab.id !== undefined && isDecoyTab(tab.url, decoyUrl));
		if (existing?.id === undefined) {
			await deps.tabs.create({ url: decoyUrl });
			return;
		}
		await deps.tabs.update(existing.id, { active: true });
		if (existing.windowId !== undefined) await deps.windows.update(existing.windowId, { focused: true });
	};

	const press = async () => {
		hushed = true;
		const settled = await Promise.allSettled([
			deps.saveHushed(true),
			openDecoy(),
			deps.pause().then(() => deps.muteManagedTabs()),
		]);
		const failure = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected');
		if (failure) throw failure.reason;
	};

	const release = async () => {
		if (!hushed) return;
		hushed = false;
		await deps.saveHushed(false);
	};

	return {
		press,
		release,
		isHushed: () => hushed,
		restore: (stored: unknown) => {
			hushed = stored === true;
		},
	};
};

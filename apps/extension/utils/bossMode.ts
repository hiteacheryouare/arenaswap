export const bossCommandName = 'boss-button';
export const bossHushedKey = 'bossHushed';

const schemePattern = /^[a-z][a-z\d+.-]*:\/\//i;

// Empty and unusable both come back null; the settings field tells them apart by looking at the
// text. A bare host like `docs.google.com` is read as https, which is what people type.
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
	// `mailto:a@b.co` would otherwise parse as a host with a login.
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

// The fragment is left out on purpose: a spreadsheet rewrites `#gid=` every time you change sheet,
// and that tab is still the one the user meant.
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
	// Turns auto-switching off and keeps it off; has to take effect before it first awaits.
	pause: () => Promise<void>;
	// Re-reads which tabs are muted. It has to honour `isHushed`, which is how the tabs go quiet.
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

	// The mute has to outlive every poll and tab switch after it, and the ordinary rule is that a
	// paused extension hands its tabs back unmuted. Hushed is the exception, kept until resume.
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

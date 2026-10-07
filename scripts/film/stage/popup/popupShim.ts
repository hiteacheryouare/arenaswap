// Loaded into every popup and guide the stage puts on screen, ahead of the app's own scripts, by
// the film server. It runs in the popup's realm so everything the app touches is the app's own kind
// of object; the stage only hands it plain data.
import { installFakeBrowser } from '../../../../apps/extension/cypress/support/fakeBrowser';
import type { PopupBoot, FilmHost } from './hostTypes';

const host = (window.parent as unknown as { filmHost: FilmHost }).filmHost;
const id = (window.frameElement as HTMLElement | null)?.dataset.popupId ?? '';
const boot: PopupBoot = structuredClone(host.boot(id));

for (const [key, value] of Object.entries(boot.localStorage)) {
	if (value === null) localStorage.removeItem(key);
	else localStorage.setItem(key, value);
}

const background = installFakeBrowser(window, {
	messages: boot.messages,
	state: boot.state,
	tabs: boot.tabs,
	local: boot.local,
	session: boot.session,
	sync: boot.sync,
	guideSlate: boot.guideSlate,
});

// The popup opens the guide in a new tab; on camera nothing should happen at all.
const fake = (window as unknown as { browser: { runtime: Record<string, unknown>; tabs: Record<string, unknown> } }).browser;
fake.runtime.getURL = (path: string) => path;

// The night, not the render: every `new Date()` and `Date.now()` the popup makes reads the moment
// of Saturday the stage says this popup is showing. Animation timing stays on performance.now().
const RealDate = Date;
const slateNow = () => host.slateNow(id);
// A `function`, because the constructor has to tell `new Date()` from a bare `Date()` call.
const FilmDate = function (this: unknown, ...args: unknown[]) {
	if (!new.target) return new RealDate(slateNow()).toString();
	return args.length === 0 ? new RealDate(slateNow()) : new (RealDate as unknown as new (...values: unknown[]) => Date)(...args);
};
FilmDate.prototype = RealDate.prototype;
Object.assign(FilmDate, { now: slateNow, parse: RealDate.parse, UTC: RealDate.UTC });
(window as unknown as { Date: unknown }).Date = FilmDate;

// Box scores and win probability come from the recording, as of the moment on screen. Standings are
// refused rather than fetched live, so a render never depends on the table on render day.
const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
	if (url.includes('/standings')) return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
	const summary = /\/summary\?event=(\d+)/.exec(url);
	if (summary) {
		const recorded = host.summaryAt(summary[1]!, slateNow());
		if (recorded) return new Response(JSON.stringify(recorded), { status: 200, headers: { 'Content-Type': 'application/json' } });
	}
	return realFetch(input, init);
};

(window as unknown as { filmPopup: unknown }).filmPopup = {
	push: (state: unknown) => background.pushScores(structuredClone(state) as never),
	sent: background.sent,
	registry: () => background.registry,
};

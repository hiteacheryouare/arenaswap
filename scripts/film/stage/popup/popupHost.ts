import { allLeagueIds } from '../../../../packages/powerscore/src/constants';
import { createDefaultUserPreferences, resolveLeagueLogoUrl } from '../../../../packages/core/src/constants';
import type { BackgroundState, UserPreferences } from '../../../../packages/core/src/types';
import type { ClockKey, Cut, PopupAction, PopupPlan } from '../cuts/cutTypes';
import type { Profile, Slate } from '../data/slate';
import { browserTabs, filmTabs, standbyTab } from '../data/tabs';
import { lerp, progress, easeInOut } from '../timing';
import type { FilmHost, PopupBoot, PopupHandle } from './hostTypes';

// The viewer's leagues. College hockey is left out: its teams carry no colours, and a grey card at
// the top of the list reads as a broken one.
const viewerLeagues = ['ncaaf', 'mlb', 'nhl', 'nwsl', 'nba'] as const;
const kentuckyKey = 'ncaaf:96';

export const viewerPrefs = (profile: Profile): UserPreferences => ({
	...createDefaultUserPreferences(),
	enabledLeagues: [...viewerLeagues],
	favoriteTeamIds: profile === 'fan' ? [kentuckyKey] : [],
	collegeFilters: { ncaaf: { divisions: ['80', '81'], conferences: [], ranked: false, titleRounds: true } },
	groupByLeague: false,
	proTipsEnabled: false,
	holidayDecorationsEnabled: false,
	bettingEnabled: false,
	theme: 'dark',
});

// Outside its keys a clock runs at real speed rather than stopping: a popup whose night is held
// still would also freeze every animation in it that is timed off Date, which is how ECharts draws
// a line in.
export const slateTimeAt = (clock: ClockKey[], t: number): number => {
	const keys = clock.map(key => ({ at: key.at, slate: Date.parse(key.slate) }));
	if (t <= keys[0]!.at) return keys[0]!.slate - (keys[0]!.at - t) * 1000;
	for (let index = 1; index < keys.length; index++) {
		const previous = keys[index - 1]!;
		const next = keys[index]!;
		if (t < next.at) {
			// A key repeated at the same film time is a cut: the night jumps.
			return next.at === previous.at ? next.slate : lerp(previous.slate, next.slate, (t - previous.at) / (next.at - previous.at));
		}
	}
	const last = keys[keys.length - 1]!;
	return last.slate + (t - last.at) * 1000;
};

// The film time at which a clock reaches a moment of the night, searched between `from` and `to`.
export const filmTimeOf = (clock: ClockKey[], slate: string, from: number, to: number): number => {
	const target = Date.parse(slate);
	let low = from;
	let high = to;
	for (let step = 0; step < 40; step++) {
		const middle = (low + high) / 2;
		if (slateTimeAt(clock, middle) < target) low = middle;
		else high = middle;
	}
	return high;
};

const dayStamp = (ts: number) => {
	const date = new Date(ts);
	return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

export interface PopupRuntime {
	plan: PopupPlan;
	loaded: boolean;
	frame: HTMLIFrameElement | null;
	profile: Profile;
	lastPushedSlate: number;
	lastPushedAt: number;
	done: Set<PopupAction>;
}

const pushEverySeconds = 0.1;

const handleOf = (runtime: PopupRuntime) => (runtime.frame?.contentWindow as unknown as { filmPopup?: PopupHandle } | null)?.filmPopup;

const documentOf = (runtime: PopupRuntime) => runtime.frame?.contentDocument ?? null;

const nativeValueSetter = (element: HTMLInputElement) => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;

const createPopupHost = (cut: Cut, slate: Slate, messages: Record<string, { message: string }>) => {
	const runtimes = new Map<string, PopupRuntime>(cut.popups.map(plan => [plan.id, {
		plan,
		loaded: false,
		frame: null,
		profile: plan.profile,
		lastPushedSlate: Number.NaN,
		lastPushedAt: -1,
		done: new Set(),
	}]));
	let filmTime = 0;

	const slateNow = (popupId: string) => {
		const runtime = runtimes.get(popupId);
		return runtime ? Math.round(slateTimeAt(runtime.plan.clock, filmTime)) : Date.now();
	};

	// What the background would hand this popup: only the viewer's leagues, and from `standbyAt` on,
	// parked on the Standby Stream.
	const stateFor = (runtime: PopupRuntime, now: number): BackgroundState => {
		const { plan } = runtime;
		if (plan.source === 'pregame') return slate.pregameState();
		const state = slate.stateAt(runtime.profile, now);
		const games = state.games.filter(game => (viewerLeagues as readonly string[]).includes(game.league));
		const shown = new Set(games.map(game => game.id));
		const standby = plan.standbyAt !== undefined && filmTime >= plan.standbyAt;
		return {
			...state,
			games,
			scores: state.scores.filter(score => shown.has(score.gameId)),
			onStandbyStream: standby,
			standbyStreamTabId: standby ? standbyTab.id : null,
		};
	};

	const boot = (popupId: string): PopupBoot => {
		const runtime = runtimes.get(popupId)!;
		const { plan } = runtime;
		const now = slateNow(popupId);
		const viewer = viewerPrefs(runtime.profile);
		const prefs = {
			...viewer,
			enabledLeagues: plan.source === 'pregame' ? [...viewer.enabledLeagues, 'nfl' as const] : viewer.enabledLeagues,
			openRevealEnabled: plan.reveal !== 'off',
			...plan.prefs,
		};
		return {
			messages,
			state: stateFor(runtime, now),
			tabs: browserTabs.map(({ id, title, url }) => ({ id, title, url })),
			local: {
				onboardingCompleted: true,
				standbyOnboardingDone: true,
				prefs,
				prefsUpdatedAt: now - 3_600_000,
				'arenaswap.allLeagueLogos': {
					fetchedAt: now - 3_600_000,
					logos: Object.fromEntries(allLeagueIds.map(league => [league, resolveLeagueLogoUrl(league, slate.raw.leagueLogos[league])])),
					schedules: {},
				},
			},
			session: {
				tabRegistry: plan.registered ? filmTabs.map(tab => ({ tabId: tab.id, gameId: tab.gameId })) : [],
				standbyStreamTabId: standbyTab.id,
			},
			sync: { prefs, prefsUpdatedAt: now - 3_600_000 },
			guideSlate: slate.guideAt(now),
			localStorage: {
				'arenaswap.theme': 'dark',
				'arenaswap.openRevealEnabled': plan.reveal === 'off' ? 'off' : 'on',
				'arenaswap.lastOpenReveal': plan.reveal === 'quick' ? dayStamp(now) : null,
			},
		};
	};

	const host: FilmHost = { boot, slateNow, summaryAt: slate.summaryAt };
	(window as unknown as { filmHost: FilmHost }).filmHost = host;

	const runAction = (runtime: PopupRuntime, action: PopupAction, t: number) => {
		const doc = documentOf(runtime);
		if (action.kind === 'profile') {
			runtime.profile = action.profile;
			runtime.lastPushedSlate = Number.NaN;
			return true;
		}
		if (!doc) return false;
		if (action.kind === 'click') {
			const target = doc.querySelector<HTMLElement>(action.selector);
			if (!target) return false;
			target.click();
			return true;
		}
		if (action.kind === 'hide') {
			const target = doc.querySelector<HTMLElement>(action.selector);
			if (!target) return false;
			target.style.visibility = 'hidden';
			return true;
		}
		if (action.kind === 'value') {
			const input = doc.querySelector<HTMLInputElement>(action.selector);
			if (!input) return false;
			nativeValueSetter(input)?.call(input, action.value);
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
			return true;
		}
		const scroller = doc.querySelector<HTMLElement>(action.selector);
		if (!scroller) return false;
		const amount = easeInOut(progress(t, action.at, action.at + action.over));
		const key = 'filmScrollFrom';
		const record = scroller as unknown as Record<string, number>;
		if (record[key] === undefined) record[key] = scroller.scrollTop;
		let destination = 0;
		if (action.kind === 'scroll') {
			destination = action.to;
		} else {
			const target = doc.querySelector<HTMLElement>(action.target);
			if (!target) return false;
			destination = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - (action.offset ?? 0);
		}
		scroller.scrollTop = lerp(record[key]!, destination, amount);
		if (amount >= 1) {
			delete record[key];
			return true;
		}
		return false;
	};

	// Called once per frame, before the stage renders.
	const tick = (t: number) => {
		filmTime = t;
		for (const runtime of runtimes.values()) {
			if (!runtime.loaded) continue;
			const handle = handleOf(runtime);
			if (!handle) continue;

			for (const action of runtime.plan.actions) {
				if (runtime.done.has(action) || t < action.at) continue;
				if (runAction(runtime, action, t)) runtime.done.add(action);
			}

			const now = slateNow(runtime.plan.id);
			const due = t - runtime.lastPushedAt >= pushEverySeconds - 1e-6;
			if (now !== runtime.lastPushedSlate && due) {
				handle.push(stateFor(runtime, now));
				runtime.lastPushedSlate = now;
				runtime.lastPushedAt = t;
			}
		}
	};

	return { runtimes, tick, slateNow };
};

export type PopupHostApi = ReturnType<typeof createPopupHost>;

export default createPopupHost;

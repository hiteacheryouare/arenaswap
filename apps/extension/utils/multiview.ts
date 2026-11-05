import type { Game, MultiviewBox, MultiviewLineup, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import { chooseFeatured, isOvertaken, planMultiview } from './multiviewLogic';
import type { multiviewCandidate, multiviewPlan } from './multiviewLogic';

export const multiviewPagePath = '/multiview.html';
export const multiviewFrameScriptPath = '/multiviewFrame.js';
export const multiviewFrameScriptId = 'multiview-frames';
export const multiviewStateKey = 'multiviewState';
// How long Multiview waits for its first stream to start before handing the user back.
export const multiviewReadyTimeoutMs = 60_000;
// A set of games that never got a stream going is left alone for this long.
export const multiviewRetryMs = 10 * 60_000;
// A warm-up whose games drift apart keeps its tab this long, in case they come back.
export const multiviewWarmupGraceMs = 2 * 60_000;
// Down to one exciting game, Multiview shows it alone this long before handing off to its tab.
export const multiviewSoloGraceMs = 2 * 60_000;

// One prompt for every site, because the players inside a box usually live on other domains than
// the page the user registered.
export const multiviewPermissions: Browser.permissions.Permissions = { origins: ['<all_urls>'], permissions: ['webNavigation'] };

// A framed stream's script can send the whole tab elsewhere. The page's own address, with or
// without a hash or query, is the only place the tab is meant to be.
export const leftMultiviewPage = (tabUrl: string, pageUrl: string): boolean => (
	tabUrl !== pageUrl && !tabUrl.startsWith(`${pageUrl}#`) && !tabUrl.startsWith(`${pageUrl}?`)
);

// Only the Chrome and Edge builds carry the permission that lets a box show a site that refuses to
// be framed, so the manifest is what says whether this build has Multiview at all.
export const isMultiviewBuild = (manifest: { permissions?: string[] }): boolean => (
	(manifest.permissions ?? []).includes('declarativeNetRequestWithHostAccess')
);

interface multiviewSession {
	tabId: number;
	boxes: MultiviewBox[];
	featuredGameId: string | null;
	readyGameIds: string[];
	startedAt: number;
	// Null while it warms up out of sight.
	revealedAt: number | null;
	featuredAt: number;
	// Set while only the featured box is on screen.
	soloSince: number | null;
}

export interface multiviewPass {
	candidates: multiviewCandidate[];
	scores: { gameId: string; total: number; onBreak?: boolean }[];
	games: Game[];
	prefs: Pick<UserPreferences, 'multiviewThreshold' | 'multiviewGames' | 'multiviewMaxBoxes' | 'sensitivity' | 'cooldownSeconds' | 'switchDelaySeconds'>;
	activeTabId: number | undefined;
	// The tab being watched, so a new Multiview tab opens beside it.
	besideTab?: { windowId?: number; index?: number };
	lastSwitchTime: number;
	now: number;
}

export interface multiviewOutcome {
	// While Multiview is open, ordinary switching stands down.
	active: boolean;
	// The mute state is already settled for this pass, by a switch or by the caller's own sync.
	settled: boolean;
}

interface tabPlace {
	windowId?: number;
	index?: number;
}

export interface multiviewDeps {
	// Without an index, the tab goes at the end of the strip.
	createTab: (props: { url: string } & tabPlace) => Promise<number | undefined>;
	moveTab: (tabId: number, place: tabPlace) => Promise<void>;
	removeTab: (tabId: number) => Promise<void>;
	// Lets the boxes in that tab show sites that refuse to be framed, and puts the frame script in them.
	allowFrames: (tabId: number) => Promise<void>;
	forbidFrames: (tabId: number) => Promise<void>;
	broadcast: (lineup: MultiviewLineup) => void;
	// Switches to Multiview, and says so.
	reveal: (tabId: number, lineup: MultiviewLineup) => Promise<boolean>;
	// Switches to a game's own tab on the way out.
	leaveTo: (tabId: number, gameId: string) => Promise<boolean>;
	save: (stored: unknown) => Promise<void>;
}

const idle: multiviewOutcome = { active: false, settled: false };

const failedSetKey = (gameIds: readonly string[]): string => gameIds.toSorted().join(',');

const readHolds = (stored: unknown): Record<string, number> => {
	const holds = (stored as { holds?: unknown } | null)?.holds;
	if (!holds || typeof holds !== 'object') return {};
	return Object.fromEntries(Object.entries(holds).filter(([, at]) => typeof at === 'number'));
};

const readSession = (stored: unknown): multiviewSession | null => {
	const wrapped = stored as { session?: unknown } | null;
	const session = (wrapped && 'session' in wrapped ? wrapped.session : stored) as Partial<multiviewSession> | null;
	if (!session || typeof session.tabId !== 'number') return null;
	return {
		tabId: session.tabId,
		boxes: Array.isArray(session.boxes) ? session.boxes.filter(box => typeof box?.gameId === 'string' && typeof box.url === 'string') : [],
		featuredGameId: typeof session.featuredGameId === 'string' ? session.featuredGameId : null,
		readyGameIds: Array.isArray(session.readyGameIds) ? session.readyGameIds.filter(id => typeof id === 'string') : [],
		startedAt: typeof session.startedAt === 'number' ? session.startedAt : 0,
		// A session saved before warm-ups existed was always on show.
		revealedAt: session.revealedAt === null ? null : typeof session.revealedAt === 'number' ? session.revealedAt : session.startedAt ?? 0,
		featuredAt: typeof session.featuredAt === 'number' ? session.featuredAt : 0,
		soloSince: typeof session.soloSince === 'number' ? session.soloSince : null,
	};
};

// A boxed game keeps the address its box opened with, so a tab that moved on does not reload it.
const fillBoxes = (current: multiviewSession, plan: multiviewPlan) => {
	const urlFor = (gameId: string) => current.boxes.find(box => box.gameId === gameId)?.url ?? plan.urlByGameId.get(gameId)!;
	current.boxes = plan.gameIds.map(gameId => ({ gameId, url: urlFor(gameId) }));
	current.readyGameIds = current.readyGameIds.filter(gameId => plan.gameIds.includes(gameId));
};

// Chrome holds back video in a tab that has never been on screen, so Multiview warms up out of
// sight while a second game closes in: each box gets its site, sign-in and player loaded, and only
// the video is left to start once the tab is shown. Each box appears as its stream plays.
export const createMultiview = (deps: multiviewDeps) => {
	let session: multiviewSession | null = null;
	let games: Game[] = [];
	// The last time the user closed Multiview themselves. It reopens once the cooldown has passed.
	let closedAt = 0;
	let failed: { key: string; at: number } | null = null;
	// Games that were boxed when a framed site took the tab, by when it happened.
	let hijackHolds: Record<string, number> = {};
	// When the games first qualified, so the Switch Delay is counted from there.
	let qualifiedAt: number | null = null;
	// When a warm-up stopped being wanted, for its grace.
	let warmLapsedAt: number | null = null;

	const lineup = (): MultiviewLineup => {
		const boxedIds = new Set(session?.boxes.map(box => box.gameId));
		return {
			boxes: session?.boxes ?? [],
			featuredGameId: session?.featuredGameId ?? null,
			solo: session?.soloSince != null,
			games: games.filter(game => boxedIds.has(game.id)),
		};
	};

	const persist = () => deps.save({ session, holds: hijackHolds }).catch(() => {});

	const end = async () => {
		if (!session) return;
		const { tabId } = session;
		session = null;
		await persist();
		await deps.forbidFrames(tabId).catch(() => {});
		await deps.removeTab(tabId).catch(() => {});
	};

	const openTab = async (pass: multiviewPass, gameIds: string[], place: tabPlace): Promise<multiviewSession | null> => {
		const tabId = await deps.createTab({ url: multiviewPagePath, ...place });
		if (tabId === undefined) return null;
		try {
			await deps.allowFrames(tabId);
		} catch {
			await deps.removeTab(tabId).catch(() => {});
			failed = { key: failedSetKey(gameIds), at: pass.now };
			return null;
		}
		session = { tabId, boxes: [], featuredGameId: null, readyGameIds: [], startedAt: pass.now, revealedAt: null, featuredAt: pass.now, soloSince: null };
		return session;
	};

	// At the end of the strip, out of the way, with nothing switched.
	const warmUp = async (pass: multiviewPass, plan: multiviewPlan) => {
		warmLapsedAt = null;
		const current = session ?? await openTab(pass, plan.gameIds, { windowId: pass.besideTab?.windowId });
		if (!current) return;
		fillBoxes(current, plan);
		current.featuredGameId = chooseFeatured({ gameIds: plan.gameIds, scores: pass.scores, current: current.featuredGameId, sensitivity: pass.prefs.sensitivity, canChange: true });
		await persist();
		deps.broadcast(lineup());
	};

	// Moves a warm tab beside the watched one, or opens a cold one there, and switches to it.
	const show = async (pass: multiviewPass, plan: multiviewPlan): Promise<boolean> => {
		warmLapsedAt = null;
		const beside: tabPlace = {
			windowId: pass.besideTab?.windowId,
			index: pass.besideTab?.index === undefined ? undefined : pass.besideTab.index + 1,
		};
		const warm = session;
		if (warm) await deps.moveTab(warm.tabId, beside).catch(() => {});
		const current = warm ?? await openTab(pass, plan.gameIds, beside);
		if (!current) return false;
		fillBoxes(current, plan);
		current.featuredGameId = chooseFeatured({ gameIds: plan.gameIds, scores: pass.scores, current: null, sensitivity: pass.prefs.sensitivity, canChange: true });
		current.revealedAt = pass.now;
		current.featuredAt = pass.now;
		await persist();
		deps.broadcast(lineup());
		return deps.reveal(current.tabId, lineup());
	};

	// The best registered game, frameable or not, is where the user lands when Multiview closes.
	const leave = async (pass: multiviewPass): Promise<boolean> => {
		const totals = new Map(pass.scores.map(score => [score.gameId, score.total]));
		const best = pass.candidates
			.filter(candidate => totals.has(candidate.gameId))
			.toSorted((a, b) => (totals.get(b.gameId) ?? 0) - (totals.get(a.gameId) ?? 0))[0];
		const switched = best && session && pass.activeTabId === session.tabId
			? await deps.leaveTo(best.tabId, best.gameId)
			: false;
		await end();
		return switched;
	};

	const updateShown = async (pass: multiviewPass, plan: multiviewPlan, shown: multiviewSession, cooldownMs: number): Promise<multiviewOutcome> => {
		const onShowFor = pass.now - (shown.revealedAt ?? shown.startedAt);
		const boxedIds = () => shown.boxes.map(box => box.gameId);

		// Not one stream started, which is a box of sign-in pages or a service out of streams. The
		// user goes back to their game, and these games are left alone for a while.
		if (shown.readyGameIds.length === 0 && onShowFor > multiviewReadyTimeoutMs) {
			failed = { key: failedSetKey(boxedIds()), at: pass.now };
			return { active: false, settled: await leave(pass) };
		}

		if (plan.open) {
			shown.soloSince = null;
			fillBoxes(shown, plan);
		} else {
			// The boxes that dropped out stay loaded behind the one left, so a game that heats back up
			// returns without starting its stream over.
			shown.boxes = shown.boxes.filter(box => plan.tabIdByGameId.has(box.gameId));
			if (shown.boxes.length === 0) return { active: false, settled: await leave(pass) };
			// Like any switch it holds for the cooldown, and never before one stream has had the chance to play.
			if (shown.readyGameIds.length > 0 && onShowFor > cooldownMs) {
				// The others ended or lost their tab, so there is no game to wait for.
				if (shown.boxes.length < 2) return { active: false, settled: await leave(pass) };
				shown.soloSince ??= pass.now;
			}
		}

		const featured = chooseFeatured({
			gameIds: boxedIds(),
			scores: pass.scores,
			current: shown.featuredGameId,
			sensitivity: pass.prefs.sensitivity,
			canChange: pass.now - shown.featuredAt > cooldownMs,
		});
		if (featured !== shown.featuredGameId) {
			shown.featuredGameId = featured;
			shown.featuredAt = pass.now;
		}

		if (shown.soloSince !== null) {
			const graceOver = pass.now - shown.soloSince >= multiviewSoloGraceMs;
			const overtaken = pass.now - pass.lastSwitchTime > cooldownMs && isOvertaken({
				soloGameId: shown.featuredGameId,
				boxedGameIds: boxedIds(),
				candidateGameIds: pass.candidates.map(candidate => candidate.gameId),
				scores: pass.scores,
				sensitivity: pass.prefs.sensitivity,
			});
			if (graceOver || overtaken) return { active: false, settled: await leave(pass) };
		}

		await persist();
		deps.broadcast(lineup());

		// The user wandered off to another tab. Like any switch, they get the cooldown to do it in.
		const away = pass.activeTabId !== shown.tabId && pass.now - pass.lastSwitchTime > cooldownMs;
		return { active: true, settled: away ? await deps.reveal(shown.tabId, lineup()) : false };
	};

	const update = async (pass: multiviewPass): Promise<multiviewOutcome> => {
		games = pass.games;
		const cooldownMs = pass.prefs.cooldownSeconds * 1000;
		const plan = planMultiview({
			candidates: pass.candidates,
			scores: pass.scores,
			boxedGameIds: session?.boxes.map(box => box.gameId) ?? [],
			shown: session?.revealedAt != null,
			threshold: pass.prefs.multiviewThreshold,
			games: pass.prefs.multiviewGames,
			maxBoxes: pass.prefs.multiviewMaxBoxes,
			sensitivity: pass.prefs.sensitivity,
		});
		if (session && session.revealedAt !== null) return updateShown(pass, plan, session, cooldownMs);

		const held = (failed !== null && failed.key === failedSetKey(plan.gameIds) && pass.now - failed.at < multiviewRetryMs)
			|| plan.gameIds.some(gameId => pass.now - (hijackHolds[gameId] ?? -Infinity) < multiviewRetryMs);
		if (plan.open) {
			qualifiedAt ??= pass.now;
			const cooledDown = pass.now - Math.max(pass.lastSwitchTime, closedAt) > cooldownMs;
			const delayServed = pass.now - qualifiedAt >= pass.prefs.switchDelaySeconds * 1000;
			if (cooledDown && delayServed && !held) {
				qualifiedAt = null;
				const revealed = await show(pass, plan);
				return { active: session !== null, settled: revealed };
			}
		} else {
			qualifiedAt = null;
		}

		// A switch's cooldown is time to warm up in. Closing Multiview yourself holds it off as long
		// as it holds off opening.
		if ((plan.open || plan.warm) && !held && pass.now - closedAt > cooldownMs) {
			await warmUp(pass, plan);
			return idle;
		}
		if (session) {
			warmLapsedAt ??= pass.now;
			if (pass.now - warmLapsedAt >= multiviewWarmupGraceMs) await end();
		}
		return idle;
	};

	// The user closed it, or it closed while the worker was asleep.
	const forget = async (tabId: number, now: number) => {
		if (session?.tabId !== tabId) return false;
		session = null;
		closedAt = now;
		await persist();
		await deps.forbidFrames(tabId).catch(() => {});
		return true;
	};

	return {
		update,
		markReady: async (tabId: number, gameIds: string[]) => {
			if (session?.tabId !== tabId) return;
			const boxed = new Set(session.boxes.map(box => box.gameId));
			session.readyGameIds = gameIds.filter(gameId => boxed.has(gameId));
			await persist();
		},
		lineupFor: (tabId: number | undefined): MultiviewLineup | null => (session && session.tabId === tabId ? lineup() : null),
		forget,
		// The tab is still open, but a framed site took it somewhere else. It is left alone, and any
		// set with one of the games that were boxed is not tried again for a while.
		hijacked: async (tabId: number, now: number) => {
			if (session?.tabId !== tabId) return false;
			hijackHolds = Object.fromEntries(session.boxes.map(box => [box.gameId, now]));
			return forget(tabId, now);
		},
		stop: end,
		tabId: (): number | null => session?.tabId ?? null,
		restore: (stored: unknown) => {
			session = readSession(stored);
			hijackHolds = readHolds(stored);
		},
	};
};

export type multiview = ReturnType<typeof createMultiview>;

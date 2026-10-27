import type { Game, MultiviewBox, MultiviewLineup, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import { chooseFeatured, planMultiview } from './multiviewLogic';
import type { multiviewCandidate } from './multiviewLogic';

export const multiviewPagePath = '/multiview.html';
export const multiviewFrameScriptPath = '/multiviewFrame.js';
export const multiviewFrameScriptId = 'multiview-frames';
export const multiviewStateKey = 'multiviewState';
// How long Multiview waits for its first stream to start before handing the user back.
export const multiviewReadyTimeoutMs = 60_000;
// A set of games that never got a stream going is left alone for this long.
export const multiviewRetryMs = 10 * 60_000;

// One prompt for every site, because the players inside a box usually live on other domains than
// the page the user registered.
export const multiviewPermissions: Browser.permissions.Permissions = { origins: ['<all_urls>'], permissions: ['webNavigation'] };

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
	featuredAt: number;
}

export interface multiviewPass {
	candidates: multiviewCandidate[];
	scores: { gameId: string; total: number }[];
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

export interface multiviewDeps {
	createTab: (props: { url: string; windowId?: number; index?: number }) => Promise<number | undefined>;
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

const readSession = (stored: unknown): multiviewSession | null => {
	const session = stored as Partial<multiviewSession> | null;
	if (!session || typeof session.tabId !== 'number') return null;
	return {
		tabId: session.tabId,
		boxes: Array.isArray(session.boxes) ? session.boxes.filter(box => typeof box?.gameId === 'string' && typeof box.url === 'string') : [],
		featuredGameId: typeof session.featuredGameId === 'string' ? session.featuredGameId : null,
		readyGameIds: Array.isArray(session.readyGameIds) ? session.readyGameIds.filter(id => typeof id === 'string') : [],
		startedAt: typeof session.startedAt === 'number' ? session.startedAt : 0,
		featuredAt: typeof session.featuredAt === 'number' ? session.featuredAt : 0,
	};
};

// Multiview switches the moment it opens, and each box appears as its stream starts. Chrome holds
// back video in a tab that has never been on screen, so streams cannot be got going out of sight.
export const createMultiview = (deps: multiviewDeps) => {
	let session: multiviewSession | null = null;
	let games: Game[] = [];
	// The last time the user closed Multiview themselves. It reopens once the cooldown has passed.
	let closedAt = 0;
	let failed: { key: string; at: number } | null = null;
	// When the games first qualified, so the Switch Delay is counted from there.
	let qualifiedAt: number | null = null;

	const lineup = (): MultiviewLineup => {
		const boxedIds = new Set(session?.boxes.map(box => box.gameId));
		return {
			boxes: session?.boxes ?? [],
			featuredGameId: session?.featuredGameId ?? null,
			games: games.filter(game => boxedIds.has(game.id)),
		};
	};

	const persist = () => deps.save(session).catch(() => {});

	const end = async () => {
		if (!session) return;
		const { tabId } = session;
		session = null;
		await persist();
		await deps.forbidFrames(tabId).catch(() => {});
		await deps.removeTab(tabId).catch(() => {});
	};

	const start = async (pass: multiviewPass, gameIds: string[], urlByGameId: Map<string, string>): Promise<boolean> => {
		const tabId = await deps.createTab({
			url: multiviewPagePath,
			windowId: pass.besideTab?.windowId,
			index: pass.besideTab?.index === undefined ? undefined : pass.besideTab.index + 1,
		});
		if (tabId === undefined) return false;
		await deps.allowFrames(tabId);
		session = {
			tabId,
			boxes: gameIds.map(gameId => ({ gameId, url: urlByGameId.get(gameId)! })),
			featuredGameId: chooseFeatured({ gameIds, scores: pass.scores, current: null, sensitivity: pass.prefs.sensitivity, canChange: true }),
			readyGameIds: [],
			startedAt: pass.now,
			featuredAt: pass.now,
		};
		await persist();
		deps.broadcast(lineup());
		return deps.reveal(tabId, lineup());
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

	const update = async (pass: multiviewPass): Promise<multiviewOutcome> => {
		games = pass.games;
		const cooldownMs = pass.prefs.cooldownSeconds * 1000;
		const plan = planMultiview({
			candidates: pass.candidates,
			scores: pass.scores,
			boxedGameIds: session?.boxes.map(box => box.gameId) ?? [],
			threshold: pass.prefs.multiviewThreshold,
			games: pass.prefs.multiviewGames,
			maxBoxes: pass.prefs.multiviewMaxBoxes,
			sensitivity: pass.prefs.sensitivity,
		});

		if (!session) {
			if (!plan.open) {
				qualifiedAt = null;
				return idle;
			}
			qualifiedAt ??= pass.now;
			const cooledDown = pass.now - Math.max(pass.lastSwitchTime, closedAt) > cooldownMs;
			const delayServed = pass.now - qualifiedAt >= pass.prefs.switchDelaySeconds * 1000;
			const retryHeld = failed !== null && failed.key === failedSetKey(plan.gameIds) && pass.now - failed.at < multiviewRetryMs;
			if (!cooledDown || !delayServed || retryHeld) return idle;
			qualifiedAt = null;
			const revealed = await start(pass, plan.gameIds, plan.urlByGameId);
			return { active: session !== null, settled: revealed };
		}

		if (!plan.open) return { active: false, settled: await leave(pass) };

		// Not one stream started, which is a box of sign-in pages or a service out of streams. The
		// user goes back to their game, and these games are left alone for a while.
		if (session.readyGameIds.length === 0 && pass.now - session.startedAt > multiviewReadyTimeoutMs) {
			failed = { key: failedSetKey(plan.gameIds), at: pass.now };
			return { active: false, settled: await leave(pass) };
		}

		const urlFor = (gameId: string) => session?.boxes.find(box => box.gameId === gameId)?.url ?? plan.urlByGameId.get(gameId)!;
		session.boxes = plan.gameIds.map(gameId => ({ gameId, url: urlFor(gameId) }));
		session.readyGameIds = session.readyGameIds.filter(gameId => plan.gameIds.includes(gameId));
		const featured = chooseFeatured({
			gameIds: plan.gameIds,
			scores: pass.scores,
			current: session.featuredGameId,
			sensitivity: pass.prefs.sensitivity,
			canChange: pass.now - session.featuredAt > cooldownMs,
		});
		if (featured !== session.featuredGameId) {
			session.featuredGameId = featured;
			session.featuredAt = pass.now;
		}
		await persist();
		deps.broadcast(lineup());

		// The user wandered off to another tab. Like any switch, they get the cooldown to do it in.
		const away = pass.activeTabId !== session.tabId && pass.now - pass.lastSwitchTime > cooldownMs;
		return { active: true, settled: away ? await deps.reveal(session.tabId, lineup()) : false };
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
		// The user closed it, or it closed while the worker was asleep.
		forget: async (tabId: number, now: number) => {
			if (session?.tabId !== tabId) return false;
			session = null;
			closedAt = now;
			await persist();
			await deps.forbidFrames(tabId).catch(() => {});
			return true;
		},
		stop: end,
		tabId: (): number | null => session?.tabId ?? null,
		restore: (stored: unknown) => {
			session = readSession(stored);
		},
	};
};

export type multiview = ReturnType<typeof createMultiview>;

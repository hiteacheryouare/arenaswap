import type { Game, MultiviewBox, MultiviewLineup, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import { chooseFeatured, planMultiview } from './multiviewLogic';
import type { multiviewCandidate } from './multiviewLogic';

export const multiviewPagePath = '/multiview.html';
export const multiviewFrameScriptPath = '/multiviewFrame.js';
export const multiviewFrameScriptId = 'multiview-frames';
export const multiviewStateKey = 'multiviewState';
// How long the streams get to start in the background before the takeover is called off.
export const multiviewReadyTimeoutMs = 60_000;
// A set of games that could not get two streams going is left alone for this long.
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
	phase: 'preparing' | 'showing';
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
	// While Multiview is getting ready or showing, ordinary switching stands down.
	active: boolean;
	// The mute state is already settled for this pass, by a switch or by the caller's own sync.
	settled: boolean;
}

export interface multiviewDeps {
	// Opens in the background, so the user keeps watching while the streams start.
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
	setTimer: (run: () => void, ms: number) => unknown;
	clearTimer: (timer: unknown) => void;
}

const idle: multiviewOutcome = { active: false, settled: false };

const failedSetKey = (gameIds: readonly string[]): string => gameIds.toSorted().join(',');

const readSession = (stored: unknown): multiviewSession | null => {
	const session = stored as Partial<multiviewSession> | null;
	if (!session || typeof session.tabId !== 'number' || (session.phase !== 'preparing' && session.phase !== 'showing')) return null;
	return {
		phase: session.phase,
		tabId: session.tabId,
		boxes: Array.isArray(session.boxes) ? session.boxes.filter(box => typeof box?.gameId === 'string' && typeof box.url === 'string') : [],
		featuredGameId: typeof session.featuredGameId === 'string' ? session.featuredGameId : null,
		readyGameIds: Array.isArray(session.readyGameIds) ? session.readyGameIds.filter(id => typeof id === 'string') : [],
		startedAt: typeof session.startedAt === 'number' ? session.startedAt : 0,
		featuredAt: typeof session.featuredAt === 'number' ? session.featuredAt : 0,
	};
};

export const createMultiview = (deps: multiviewDeps) => {
	let session: multiviewSession | null = null;
	let games: Game[] = [];
	// The last time the user closed Multiview themselves. It reopens once the cooldown has passed.
	let closedAt = 0;
	let failed: { key: string; at: number } | null = null;
	let revealTimer: unknown = null;
	let switchDelayMs = 0;

	const lineup = (): MultiviewLineup => {
		const boxedIds = new Set(session?.boxes.map(box => box.gameId));
		return {
			boxes: session?.boxes ?? [],
			featuredGameId: session?.featuredGameId ?? null,
			games: games.filter(game => boxedIds.has(game.id)),
		};
	};

	const persist = () => deps.save(session).catch(() => {});

	const cancelRevealTimer = () => {
		if (revealTimer === null) return;
		deps.clearTimer(revealTimer);
		revealTimer = null;
	};

	const end = async () => {
		cancelRevealTimer();
		if (!session) return;
		const { tabId } = session;
		session = null;
		await persist();
		await deps.forbidFrames(tabId).catch(() => {});
		await deps.removeTab(tabId).catch(() => {});
	};

	// Two playing streams and the Switch Delay served, and the user is taken over.
	const maybeReveal = async (now: number): Promise<boolean> => {
		if (session?.phase !== 'preparing' || session.readyGameIds.length < 2) return false;
		const due = session.startedAt + switchDelayMs;
		if (due > now) {
			if (revealTimer === null) {
				revealTimer = deps.setTimer(() => {
					revealTimer = null;
					void maybeReveal(due);
				}, due - now);
			}
			return false;
		}
		const revealed = await deps.reveal(session.tabId, lineup());
		if (revealed && session) {
			session.phase = 'showing';
			await persist();
		}
		return revealed;
	};

	const start = async (pass: multiviewPass, gameIds: string[], urlByGameId: Map<string, string>) => {
		const tabId = await deps.createTab({
			url: multiviewPagePath,
			windowId: pass.besideTab?.windowId,
			index: pass.besideTab?.index === undefined ? undefined : pass.besideTab.index + 1,
		});
		if (tabId === undefined) return;
		await deps.allowFrames(tabId);
		session = {
			phase: 'preparing',
			tabId,
			boxes: gameIds.map(gameId => ({ gameId, url: urlByGameId.get(gameId)! })),
			featuredGameId: chooseFeatured({ gameIds, scores: pass.scores, current: null, sensitivity: pass.prefs.sensitivity, canChange: true }),
			readyGameIds: [],
			startedAt: pass.now,
			featuredAt: pass.now,
		};
		await persist();
		deps.broadcast(lineup());
	};

	// The best registered game, frameable or not, is where the user lands when Multiview closes.
	const leave = async (pass: multiviewPass): Promise<boolean> => {
		const totals = new Map(pass.scores.map(score => [score.gameId, score.total]));
		const best = pass.candidates
			.filter(candidate => totals.has(candidate.gameId))
			.toSorted((a, b) => (totals.get(b.gameId) ?? 0) - (totals.get(a.gameId) ?? 0))[0];
		const switched = best && session?.phase === 'showing' && pass.activeTabId === session.tabId
			? await deps.leaveTo(best.tabId, best.gameId)
			: false;
		await end();
		return switched;
	};

	const update = async (pass: multiviewPass): Promise<multiviewOutcome> => {
		games = pass.games;
		switchDelayMs = pass.prefs.switchDelaySeconds * 1000;
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
			if (!plan.open) return idle;
			const cooledDown = pass.now - Math.max(pass.lastSwitchTime, closedAt) > cooldownMs;
			const key = failedSetKey(plan.gameIds);
			const retryHeld = failed !== null && failed.key === key && pass.now - failed.at < multiviewRetryMs;
			if (!cooledDown || retryHeld) return idle;
			await start(pass, plan.gameIds, plan.urlByGameId);
			return { active: session !== null, settled: false };
		}

		if (!plan.open) return { active: false, settled: await leave(pass) };

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

		if (session.phase === 'preparing') {
			if (pass.now - session.startedAt > multiviewReadyTimeoutMs) {
				failed = { key: failedSetKey(plan.gameIds), at: pass.now };
				await end();
				return idle;
			}
			return { active: true, settled: await maybeReveal(pass.now) };
		}

		// The user wandered off to another tab. Like any switch, they get the cooldown to do it in.
		const away = pass.activeTabId !== session.tabId && pass.now - pass.lastSwitchTime > cooldownMs;
		return { active: true, settled: away ? await deps.reveal(session.tabId, lineup()) : false };
	};

	return {
		update,
		markReady: async (tabId: number, gameIds: string[], now: number) => {
			if (session?.tabId !== tabId) return;
			const boxed = new Set(session.boxes.map(box => box.gameId));
			session.readyGameIds = gameIds.filter(gameId => boxed.has(gameId));
			await persist();
			await maybeReveal(now);
		},
		lineupFor: (tabId: number | undefined): MultiviewLineup | null => (session && session.tabId === tabId ? lineup() : null),
		// The user closed it, or it closed while the worker was asleep.
		forget: async (tabId: number, now: number) => {
			if (session?.tabId !== tabId) return false;
			cancelRevealTimer();
			session = null;
			closedAt = now;
			await persist();
			await deps.forbidFrames(tabId).catch(() => {});
			return true;
		},
		stop: end,
		tabId: (): number | null => session?.tabId ?? null,
		isShowing: (): boolean => session?.phase === 'showing',
		restore: (stored: unknown) => {
			session = readSession(stored);
		},
	};
};

export type multiview = ReturnType<typeof createMultiview>;

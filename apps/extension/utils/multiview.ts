import type { Game, MultiviewBox, MultiviewLineup, UserPreferences } from '@arenaswap/core/types';
import type { Browser } from 'wxt/browser';
import { chooseFeatured, isOvertaken, planMultiview } from './multiviewLogic';
import type { multiviewCandidate, multiviewPlan } from './multiviewLogic';

export const multiviewPagePath = '/multiview.html';
export const multiviewFrameScriptPath = '/multiviewFrame.js';
export const multiviewFrameScriptId = 'multiview-frames';
export const multiviewStateKey = 'multiviewState';
export const multiviewReadyTimeoutMs = 60_000;
export const multiviewRetryMs = 10 * 60_000;
export const multiviewWarmupGraceMs = 2 * 60_000;
export const multiviewSoloGraceMs = 2 * 60_000;

export const multiviewPermissions: Browser.permissions.Permissions = { origins: ['<all_urls>'], permissions: ['webNavigation'] };

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
	revealedAt: number | null;
	featuredAt: number;
	soloSince: number | null;
}

export interface multiviewPass {
	candidates: multiviewCandidate[];
	scores: { gameId: string; total: number; breakPenalty?: number }[];
	games: Game[];
	prefs: Pick<UserPreferences, 'multiviewThreshold' | 'multiviewGames' | 'multiviewMaxBoxes' | 'sensitivity' | 'cooldownSeconds' | 'switchDelaySeconds'>;
	activeTabId: number | undefined;
	besideTab?: { windowId?: number; index?: number };
	lastSwitchTime: number;
	now: number;
}

export interface multiviewOutcome {
	active: boolean;
	settled: boolean;
}

interface tabPlace {
	windowId?: number;
	index?: number;
}

export interface multiviewDeps {
	createTab: (props: { url: string } & tabPlace) => Promise<number | undefined>;
	moveTab: (tabId: number, place: tabPlace) => Promise<void>;
	removeTab: (tabId: number) => Promise<void>;
	allowFrames: (tabId: number) => Promise<void>;
	forbidFrames: (tabId: number) => Promise<void>;
	broadcast: (lineup: MultiviewLineup) => void;
	reveal: (tabId: number, lineup: MultiviewLineup) => Promise<boolean>;
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
		revealedAt: session.revealedAt === null ? null : typeof session.revealedAt === 'number' ? session.revealedAt : session.startedAt ?? 0,
		featuredAt: typeof session.featuredAt === 'number' ? session.featuredAt : 0,
		soloSince: typeof session.soloSince === 'number' ? session.soloSince : null,
	};
};

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
	let closedAt = 0;
	let failed: { key: string; at: number } | null = null;
	let hijackHolds: Record<string, number> = {};
	let qualifiedAt: number | null = null;
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

	const warmUp = async (pass: multiviewPass, plan: multiviewPlan) => {
		warmLapsedAt = null;
		const current = session ?? await openTab(pass, plan.gameIds, { windowId: pass.besideTab?.windowId });
		if (!current) return;
		fillBoxes(current, plan);
		current.featuredGameId = chooseFeatured({ gameIds: plan.gameIds, scores: pass.scores, current: current.featuredGameId, sensitivity: pass.prefs.sensitivity, canChange: true });
		await persist();
		deps.broadcast(lineup());
	};

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

		if (shown.readyGameIds.length === 0 && onShowFor > multiviewReadyTimeoutMs) {
			failed = { key: failedSetKey(boxedIds()), at: pass.now };
			return { active: false, settled: await leave(pass) };
		}

		if (plan.open) {
			shown.soloSince = null;
			fillBoxes(shown, plan);
		} else {
			shown.boxes = shown.boxes.filter(box => plan.tabIdByGameId.has(box.gameId));
			if (shown.boxes.length === 0) return { active: false, settled: await leave(pass) };
			if (shown.readyGameIds.length > 0 && onShowFor > cooldownMs) {
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

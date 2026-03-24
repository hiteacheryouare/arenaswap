import { fetchGames, computeExcitement } from '@madness/core';
import {
	POLL_INTERVAL_MS,
	MAX_HISTORY_SNAPSHOTS,
	DEFAULT_SENSITIVITY,
	DEFAULT_COOLDOWN_SECS,
	SENSITIVITY_THRESHOLDS,
} from '@madness/core/constants';
import type {
	Game,
	ScoreSnapshot,
	TabRegistration,
	UserPreferences,
} from '@madness/core/types';

export default defineBackground(() => {
	let games: Game[] = [];
	const history = new Map<string, ScoreSnapshot[]>();
	let tabRegistry: TabRegistration[] = [];
	let prefs: UserPreferences = {
		sensitivity: DEFAULT_SENSITIVITY,
		favoriteTeamIds: [],
		cooldownSeconds: DEFAULT_COOLDOWN_SECS,
		enabled: true,
	};
	let lastSwitchTime = 0;

	const updateHistory = (currentGames: Game[]) => {
		currentGames.forEach(game => {
			const snapshots = history.get(game.id) ?? [];
			snapshots.push({
				gameId: game.id,
				timestamp: Date.now(),
				homeScore: game.homeTeam.score,
				awayScore: game.awayTeam.score,
			});
			if (snapshots.length > MAX_HISTORY_SNAPSHOTS) snapshots.shift();
			history.set(game.id, snapshots);
		});
	};

	const getGameLabel = (gameId: string): string => {
		const game = games.find(g => g.id === gameId);
		return game ? `${game.awayTeam.abbreviation} vs ${game.homeTeam.abbreviation}` : 'Unknown Game';
	};

	const tick = async () => {
		try {
			games = await fetchGames();
		} catch (err) {
			console.error('Madness: Failed to fetch games:', err);
			return;
		}

		// Always broadcast so the popup can show upcoming games even when nothing is live
		const liveGames = games.filter(g => g.status === 'in');
		const scores = liveGames.map(g => computeExcitement(g, history.get(g.id) ?? [], prefs));
		updateHistory(liveGames);

		browser.runtime.sendMessage({ type: 'SCORES_UPDATED', scores, games }).catch(() => {});

		if (!prefs.enabled || liveGames.length === 0) return;

		const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
		const activeReg = tabRegistry.find(r => r.tabId === activeTab?.id);
		const activeScore = scores.find(s => s.gameId === activeReg?.gameId)?.total ?? 0;

		const best = scores.reduce((a, b) => a.total > b.total ? a : b);
		const bestReg = tabRegistry.find(r => r.gameId === best.gameId);
		const threshold = SENSITIVITY_THRESHOLDS[prefs.sensitivity];
		const cooldownOk = Date.now() - lastSwitchTime > prefs.cooldownSeconds * 1000;

		if (
			bestReg &&
			activeTab?.id !== undefined &&
			bestReg.tabId !== activeTab.id &&
			best.total > activeScore + threshold &&
			cooldownOk
		) {
			await browser.tabs.update(activeTab.id, { muted: true });
			await browser.tabs.update(bestReg.tabId, { active: true, muted: false });
			lastSwitchTime = Date.now();

			await browser.notifications.create({
				type: 'basic',
				iconUrl: '/icon/128.png',
				title: `🏀 Madness → ${getGameLabel(best.gameId)}`,
				message: best.reason,
			});
		}
	};

	// Load persisted state on startup
	browser.storage.sync.get({ prefs: null }).then(result => {
		if (result.prefs) prefs = result.prefs as UserPreferences;
	});
	browser.storage.session.get({ tabRegistry: [] }).then(result => {
		tabRegistry = result.tabRegistry as TabRegistration[];
	});

	// Handle messages from popup
	browser.runtime.onMessage.addListener((msg: any) => {
		if (msg.type === 'UPDATE_PREFS') {
			prefs = msg.prefs;
			browser.storage.sync.set({ prefs });
		}
		if (msg.type === 'UPDATE_REGISTRY') {
			tabRegistry = msg.tabRegistry;
			browser.storage.session.set({ tabRegistry });
		}
	});

	setInterval(tick, POLL_INTERVAL_MS);
	tick();
});

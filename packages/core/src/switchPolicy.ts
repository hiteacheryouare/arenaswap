import { sensitivityThresholds } from './constants';
import type { UserPreferences } from './types';

export interface SwitchCandidateTab {
	tabId: number;
	gameId: string;
}

export interface SwitchPolicyInput {
	registry: readonly SwitchCandidateTab[];
	scores: readonly { gameId: string; total: number; reason?: string }[];
	activeTabId: number;
	sensitivity: UserPreferences['sensitivity'];
	cooldownSeconds: number;
	lastSwitchTime: number;
	now: number;
}

export interface SwitchTarget {
	tabId: number;
	gameId: string;
	reason?: string;
}

export const chooseSwitchTarget = ({ registry, scores, activeTabId, sensitivity, cooldownSeconds, lastSwitchTime, now }: SwitchPolicyInput): SwitchTarget | null => {
	const activeReg = registry.find(reg => reg.tabId === activeTabId);
	const activeScore = scores.find(s => s.gameId === activeReg?.gameId)?.total ?? 0;

	const registeredGameIds = new Set(registry.map(reg => reg.gameId));
	const candidates = scores.filter(s => registeredGameIds.has(s.gameId));
	if (candidates.length === 0) return null;

	const best = candidates.reduce((a, b) => (a.total > b.total ? a : b));
	const bestReg = activeReg?.gameId === best.gameId ? activeReg : registry.find(reg => reg.gameId === best.gameId)!;
	if (bestReg.tabId === activeTabId) return null;

	const threshold = sensitivityThresholds[sensitivity] ?? 0;
	const bestScoresAnything = best.total > 0;
	const winsByDefault = !activeReg && bestScoresAnything;
	if (!winsByDefault && best.total < activeScore + threshold) return null;
	if (cooldownSeconds > 0 && now - lastSwitchTime <= cooldownSeconds * 1000) return null;

	return { tabId: bestReg.tabId, gameId: best.gameId, ...(best.reason !== undefined ? { reason: best.reason } : {}) };
};

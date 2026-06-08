import { isFiniteNumber, isGameViewRecordLike, isObjectRecord, isSwitchEventLike } from '@arenaswap/core';
import type { GameViewRecord, RecapSession, SwitchEvent } from '@arenaswap/core/types';

export { GameViewRecord, RecapSession, SwitchEvent };

export const recapSessionStorageKey = 'recapSession';

export const normalizeRecapSession = (value: unknown): RecapSession | null => {
	if (!isObjectRecord(value)) return null;
	try {
		const now = Date.now();
		const sessionStartTime = isFiniteNumber(value.sessionStartTime) ? value.sessionStartTime : now;
		const lastEventTime = isFiniteNumber(value.lastEventTime) ? value.lastEventTime : now;
		const switchEvents: SwitchEvent[] = Array.isArray(value.switchEvents)
			? (value.switchEvents as unknown[]).filter(isSwitchEventLike)
			: [];
		const rawViews = isObjectRecord(value.gameViews) ? value.gameViews : {};
		const gameViews: Record<string, GameViewRecord> = {};
		for (const [id, raw] of Object.entries(rawViews)) {
			if (isGameViewRecordLike(raw)) gameViews[id] = raw;
		}
		return { sessionStartTime, lastEventTime, switchEvents, gameViews };
	} catch {
		return null;
	}
};

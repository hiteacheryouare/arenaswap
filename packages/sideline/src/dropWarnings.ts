import { logWarn } from '@arenaswap/core';

const lastWarnedDroppedCounts = new Map<string, number>();

export const warnOnDroppedCountChange = (key: string, dropped: number, buildMessage: () => string): void => {
	if (lastWarnedDroppedCounts.get(key) === dropped) return;
	lastWarnedDroppedCounts.set(key, dropped);
	if (dropped > 0) logWarn(buildMessage());
};

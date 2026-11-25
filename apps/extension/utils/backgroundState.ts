import { BackgroundStateSchema } from '@arenaswap/core';
import type { BackgroundState, ExtensionMessage } from '@arenaswap/core/types';

export const normalizeBackgroundState = (value: unknown): BackgroundState =>
	BackgroundStateSchema.parse(value);

export const fetchState = async (forceRefresh = false): Promise<BackgroundState> => {
	const state = await browser.runtime.sendMessage({ type: 'GET_STATE', forceRefresh } satisfies ExtensionMessage);
	return normalizeBackgroundState(state);
};

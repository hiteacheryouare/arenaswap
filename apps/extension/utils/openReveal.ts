export const openRevealEnabledKey = 'arenaswap.openRevealEnabled';

export const readOpenRevealEnabled = (): boolean => (
	globalThis.localStorage?.getItem(openRevealEnabledKey) !== 'off'
);

export const writeOpenRevealEnabled = (enabled: boolean) => {
	globalThis.localStorage?.setItem(openRevealEnabledKey, enabled ? 'on' : 'off');
};

export interface ReviewPromptState {
	successfulSwitchCount: number;
	firstSuccessfulSwitchAt: number | null;
	dismissedAt: number | null;
	reviewedAt: number | null;
}

export type reviewMarketplace = 'chrome' | 'firefox' | 'edge';

export const reviewPromptStorageKey = 'reviewPromptState';
export const reviewPromptSwitchThreshold = 3;
export const reviewPromptMinUsageMs = 30 * 60 * 1000;

export const createDefaultReviewPromptState = (): ReviewPromptState => ({
	successfulSwitchCount: 0,
	firstSuccessfulSwitchAt: null,
	dismissedAt: null,
	reviewedAt: null,
});

export const normalizeReviewPromptState = (value: unknown): ReviewPromptState => {
	if (typeof value !== 'object' || value === null) return createDefaultReviewPromptState();
	const raw = value as Partial<Record<keyof ReviewPromptState, unknown>>;
	return {
		successfulSwitchCount: Math.max(0, Math.round(Number(raw.successfulSwitchCount) || 0)),
		firstSuccessfulSwitchAt: typeof raw.firstSuccessfulSwitchAt === 'number' && Number.isFinite(raw.firstSuccessfulSwitchAt)
			? raw.firstSuccessfulSwitchAt
			: null,
		dismissedAt: typeof raw.dismissedAt === 'number' && Number.isFinite(raw.dismissedAt) ? raw.dismissedAt : null,
		reviewedAt: typeof raw.reviewedAt === 'number' && Number.isFinite(raw.reviewedAt) ? raw.reviewedAt : null,
	};
};

export const recordSuccessfulReviewPromptSwitch = (state: ReviewPromptState, now = Date.now()): ReviewPromptState => ({
	...state,
	successfulSwitchCount: state.successfulSwitchCount + 1,
	firstSuccessfulSwitchAt: state.firstSuccessfulSwitchAt ?? now,
});

export const shouldShowReviewPrompt = (state: ReviewPromptState, now = Date.now()): boolean => {
	if (state.dismissedAt !== null || state.reviewedAt !== null) return false;
	if (state.successfulSwitchCount < reviewPromptSwitchThreshold) return false;
	if (state.firstSuccessfulSwitchAt === null) return false;
	return now - state.firstSuccessfulSwitchAt >= reviewPromptMinUsageMs;
};

export const markReviewPromptDismissed = (state: ReviewPromptState, now = Date.now()): ReviewPromptState => ({
	...state,
	dismissedAt: now,
});

export const markReviewPromptReviewed = (state: ReviewPromptState, now = Date.now()): ReviewPromptState => ({
	...state,
	reviewedAt: now,
});

export const getReviewMarketplace = (userAgent: string): reviewMarketplace => {
	if (/Edg\//.test(userAgent)) return 'edge';
	if (/Firefox\//.test(userAgent)) return 'firefox';
	return 'chrome';
};

export const getReviewPromptUrl = (extensionId: string, userAgent: string): string => {
	const marketplace = getReviewMarketplace(userAgent);
	if (marketplace === 'firefox') return 'https://addons.mozilla.org/en-US/firefox/addon/arenaswap/';
	if (marketplace === 'edge') return `https://microsoftedge.microsoft.com/addons/detail/arenaswap/oeballpnidkinkcbjokogdgjckdjeeba`;
	return `https://chromewebstore.google.com/detail/arenaswap/gibojibgihombdmmfnhnimajppamfeee`;
};

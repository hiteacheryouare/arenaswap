import {
	createDefaultReviewPromptState,
	getReviewMarketplace,
	recordSuccessfulReviewPromptSwitch,
	reviewPromptMinUsageMs,
	reviewPromptSwitchThreshold,
	shouldShowReviewPrompt,
} from '../utils/reviewPrompt';

describe('review prompt thresholds', () => {
	test('waits for enough successful switches and usage time', () => {
		let state = createDefaultReviewPromptState();
		const startedAt = 1_000_000;

		for (let i = 0; i < reviewPromptSwitchThreshold; i++) {
			state = recordSuccessfulReviewPromptSwitch(state, startedAt + i);
		}

		expect(shouldShowReviewPrompt(state, startedAt + reviewPromptMinUsageMs - 1)).toBe(false);
		expect(shouldShowReviewPrompt(state, startedAt + reviewPromptMinUsageMs)).toBe(true);
	});

	test('does not show after dismissal or review click', () => {
		const state = {
			successfulSwitchCount: reviewPromptSwitchThreshold,
			firstSuccessfulSwitchAt: 1,
			dismissedAt: 2,
			reviewedAt: null,
		};
		expect(shouldShowReviewPrompt(state, 1 + reviewPromptMinUsageMs)).toBe(false);
	});
});

describe('review prompt marketplace detection', () => {
	test('detects firefox and edge before falling back to chrome', () => {
		expect(getReviewMarketplace('Mozilla/5.0 Firefox/120.0')).toBe('firefox');
		expect(getReviewMarketplace('Mozilla/5.0 Chrome/120.0 Edg/120.0')).toBe('edge');
		expect(getReviewMarketplace('Mozilla/5.0 Chrome/120.0')).toBe('chrome');
	});
});

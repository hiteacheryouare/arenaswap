import {
	createDefaultReviewPromptState,
	getReviewMarketplace,
	getReviewPromptUrl,
	markReviewPromptDismissed,
	markReviewPromptReviewed,
	normalizeReviewPromptState,
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

const earnedReviewPromptState = () => {
	let state = createDefaultReviewPromptState();
	for (let i = 0; i < reviewPromptSwitchThreshold; i++) {
		state = recordSuccessfulReviewPromptSwitch(state, 1_000_000 + i);
	}
	return state;
};
const wellPast = 1_000_000 + reviewPromptMinUsageMs + 1;

describe('a user who has already answered the review prompt', () => {
	test('is never asked again after dismissing it, however many more games they watch', () => {
		let state = markReviewPromptDismissed(earnedReviewPromptState(), wellPast);
		for (let i = 0; i < 50; i++) state = recordSuccessfulReviewPromptSwitch(state, wellPast + i);

		expect(shouldShowReviewPrompt(state, wellPast + 90 * 24 * 60 * 60 * 1000)).toBe(false);
	});

	test('is never asked again after going to the store', () => {
		let state = markReviewPromptReviewed(earnedReviewPromptState(), wellPast);
		for (let i = 0; i < 50; i++) state = recordSuccessfulReviewPromptSwitch(state, wellPast + i);

		expect(shouldShowReviewPrompt(state, wellPast + 90 * 24 * 60 * 60 * 1000)).toBe(false);
	});

	test('keeps that answer when it comes back out of storage', () => {
		const dismissed = markReviewPromptDismissed(earnedReviewPromptState(), wellPast);
		const restored = normalizeReviewPromptState(JSON.parse(JSON.stringify(dismissed)));

		expect(restored).toEqual(dismissed);
		expect(shouldShowReviewPrompt(restored, wellPast + 1)).toBe(false);
	});

	test('is not re-armed by a record written before the counters existed', () => {
		const legacy = normalizeReviewPromptState({ dismissedAt: 1_500_000 });

		expect(legacy.dismissedAt).toBe(1_500_000);
		expect(shouldShowReviewPrompt(legacy, 9_000_000)).toBe(false);
	});
});

describe('a review prompt record that cannot be trusted', () => {
	test.each([null, undefined, 'dismissed', 42, []])('starts clean rather than throwing on %p', value => {
		expect(normalizeReviewPromptState(value)).toEqual(createDefaultReviewPromptState());
	});

	test('does not let a nonsense counter force the banner up', () => {
		const state = normalizeReviewPromptState({
			successfulSwitchCount: Number.NaN,
			firstSuccessfulSwitchAt: Number.POSITIVE_INFINITY,
			dismissedAt: 'never',
			reviewedAt: {},
		});

		expect(state).toEqual(createDefaultReviewPromptState());
		expect(shouldShowReviewPrompt(state, Date.now())).toBe(false);
	});
});

describe('review prompt marketplace detection', () => {
	test('detects firefox and edge before falling back to chrome', () => {
		expect(getReviewMarketplace('Mozilla/5.0 Firefox/120.0')).toBe('firefox');
		expect(getReviewMarketplace('Mozilla/5.0 Chrome/120.0 Edg/120.0')).toBe('edge');
		expect(getReviewMarketplace('Mozilla/5.0 Chrome/120.0')).toBe('chrome');
	});

	test('sends each browser to the store it actually installed from', () => {
		expect(getReviewPromptUrl('id', 'Mozilla/5.0 Firefox/120.0')).toContain('addons.mozilla.org');
		expect(getReviewPromptUrl('id', 'Mozilla/5.0 Chrome/120.0 Edg/120.0')).toContain('microsoftedge.microsoft.com');
		expect(getReviewPromptUrl('id', 'Mozilla/5.0 Chrome/120.0')).toContain('chromewebstore.google.com');
	});
});

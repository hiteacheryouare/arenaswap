import type { PopupAction } from './cutTypes';

// A wall-clock time on Saturday night, Eastern, as the ISO string the clocks take. Every moment the
// films use falls between 7 PM and 9 PM.
export const sat = (clock: string) => {
	const [hours = 0, minutes = 0, seconds = 0] = clock.split(':').map(Number);
	const utc = Date.UTC(2026, 9, 3, hours + 12 + 4, minutes, seconds);
	return new Date(utc).toISOString();
};

export const kentuckyCard = '[data-glide-key="401856709"] .game-card';

// The tab suggestion banner, then its "Assign 5 tabs" button.
export const mainPopupActions = (takeALookAt: number, assignAt: number): PopupAction[] => [
	{ at: takeALookAt, kind: 'click', selector: '.popup-notice-action' },
	{ at: assignAt, kind: 'click', selector: '.suggest-view .btn-primary, .btn-primary.w-100' },
];

// Starring Kentucky, after which the scores the popup is fed are the ones its new favourite earns.
export const favoriteActions = (at: number): PopupAction[] => [
	{ at, kind: 'click', selector: 'button[data-team-star="true"][aria-label="Add UK to favorites"]' },
	{ at: at + 0.05, kind: 'profile', profile: 'fan' },
];

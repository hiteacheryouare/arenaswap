import type { Cue } from '../../audio/score';
import { beats } from '../timing';
import type { CardOrigin, PopupAction } from './cutTypes';

// A wall-clock time on Saturday night, Eastern, as the ISO string the clocks take. Every moment the
// films use falls between 7 PM and 9 PM.
export const sat = (clock: string) => {
	const [hours = 0, minutes = 0, seconds = 0] = clock.split(':').map(Number);
	const utc = Date.UTC(2026, 9, 3, hours + 12 + 4, minutes, seconds);
	return new Date(utc).toISOString();
};

export const kentuckyCard = '[data-glide-key="401856709"] .game-card';

export const liveDotSelector = `${kentuckyCard} .live-dot`;
export const liveBadgeSelector = `${kentuckyCard} .live-status-label`;

// The first orange card grows out of Kentucky's LIVE dot, which is where the film ends too.
export const liveDotOrigin: CardOrigin = { popup: 'main', selector: liveDotSelector };

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

// The end card lifts Kentucky's LIVE badge off its card, so the card's own goes.
export const endActions = (at: number): PopupAction[] => [{ at, kind: 'hide', selector: liveBadgeSelector }];

// An orange card's moves, in seconds: the dot swells, opens to fill the frame, holds, then shrinks
// away. The shot after a card has to be mounted by `under`, while the frame is still all orange.
export const cardTiming = { swell: 0.18, open: 0.42, close: 0.55 };

export const cardUnder = (from: number) => from + cardTiming.swell + cardTiming.open;

// The card's line arrives once the frame is orange and has faded before the orange starts to go.
export const cardSuperWindow = (from: number, to: number) => ({ from: cardUnder(from), to: to - cardTiming.close + 0.1 });

// The end card's moves, in beats before the end of a fourteen-beat ending; a shorter ending squeezes
// them evenly. The cuts hang the ending's sound cues on the same beats.
export const ending = { beats: 14, balls: [11.2, 10, 8.8, 7.6, 6.4], plainAgain: 5.2, lands: 4 };

export const endingCues = (endAt: number, lengthBeats: number): Cue[] => {
	const pace = Math.min(1, lengthBeats / ending.beats);
	return [
		...ending.balls.map((beat, index) => ({ at: endAt - beats(beat * pace), kind: 'dot' as const, step: index })),
		{ at: endAt - beats(ending.lands * pace), kind: 'dot', step: 0, gain: 1.2 },
	];
};

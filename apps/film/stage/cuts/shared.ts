import type { Cue } from '../../audio/score';
import { finalHitLag } from '../../audio/soundtrack';
import { musicBeats } from '../timing';
import type { CardOrigin, Ending, PopupAction } from './cutTypes';

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

// The end card starts fourteen of our beats before the film's end (eight in the 15) and holds a beat
// of the soundtrack past it. The balls change on the "and" of the soundtrack's beats, and the dot
// lands on its last hit, which is on an "and" too: a ball a beat in the 30 and the 60, one every half
// beat in the 15.
export const endingBeats = 14;
export const shortEndingBeats = 8;
export const endCardHold = musicBeats(1);

const before = (filmEnd: number, musicBeatsBefore: number) => filmEnd - musicBeats(musicBeatsBefore);

export const endingFor = (filmEnd: number): Ending => ({
	balls: [8.5, 7.5, 6.5, 5.5, 4.5].map(count => before(filmEnd, count)),
	plainAgain: before(filmEnd, 3.5),
	landsAt: before(filmEnd, 2.5) + finalHitLag,
	pace: 1,
});

export const shortEndingFor = (filmEnd: number): Ending => ({
	balls: [4.5, 4, 3.5, 3, 2.5].map(count => before(filmEnd, count)),
	plainAgain: before(filmEnd, 2),
	landsAt: before(filmEnd, 1.5) + finalHitLag,
	pace: shortEndingBeats / endingBeats,
});

export const endingCues = (schedule: Ending): Cue[] => [
	...schedule.balls.map((at, index) => ({ at, kind: 'dot' as const, step: index })),
	{ at: schedule.landsAt, kind: 'impact' },
];

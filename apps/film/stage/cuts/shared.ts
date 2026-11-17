import type { Cue } from '../../audio/score';
import { finalHitLag } from '../../audio/soundtrack';
import { musicBeats } from '../timing';
import type { CardOrigin, Ending, PopupAction } from './cutTypes';

const recordedSaturdayUtc = { year: 2026, monthIndex: 9, day: 3 };
const pmHours = 12;
const edtUtcOffsetHours = 4;

export const saturdayEveningEastern = (clock: string) => {
	const [hours = 0, minutes = 0, seconds = 0] = clock.split(':').map(Number);
	const utc = Date.UTC(recordedSaturdayUtc.year, recordedSaturdayUtc.monthIndex, recordedSaturdayUtc.day, hours + pmHours + edtUtcOffsetHours, minutes, seconds);
	return new Date(utc).toISOString();
};

export const kentuckyCard = '[data-glide-key="401856709"] .game-card';

export const liveDotSelector = `${kentuckyCard} .live-dot`;
export const liveBadgeSelector = `${kentuckyCard} .live-status-label`;

export const liveDotOrigin: CardOrigin = { popup: 'main', selector: liveDotSelector };

export const mainPopupActions = (takeALookAt: number, assignAt: number): PopupAction[] => [
	{ at: takeALookAt, kind: 'click', selector: '.popup-notice-action' },
	{ at: assignAt, kind: 'click', selector: '.suggest-view .btn-solid.theme-primary, .btn-solid.theme-primary.w-100' },
];

export const favoriteActions = (at: number): PopupAction[] => [
	{ at, kind: 'click', selector: 'button[data-team-star="true"][aria-label="Add UK to favorites"]' },
	{ at: at + 0.05, kind: 'profile', profile: 'fan' },
];

export const endActions = (at: number): PopupAction[] => [{ at, kind: 'hide', selector: liveBadgeSelector }];

export const cardTiming = { swell: 0.18, open: 0.42, close: 0.55 };

export const cardUnder = (from: number) => from + cardTiming.swell + cardTiming.open;

export const cardSuperWindow = (from: number, to: number) => ({ from: cardUnder(from), to: to - cardTiming.close + 0.1 });

export const endingBeats = 14;
export const shortEndingBeats = 8;
export const endCardHold = musicBeats(1);

const before = (filmEnd: number, musicBeatsBefore: number) => filmEnd - musicBeats(musicBeatsBefore);

export const endingFor = (filmEnd: number): Ending => ({
	balls: [8.5, 7.5, 6.5, 5.5, 4.5].map(count => before(filmEnd, count)),
	plainAgain: before(filmEnd, 3.5),
	landsAt: before(filmEnd, 2.5) + finalHitLag,
	beatScale: 1,
});

export const shortEndingFor = (filmEnd: number): Ending => ({
	balls: [4.5, 4, 3.5, 3, 2.5].map(count => before(filmEnd, count)),
	plainAgain: before(filmEnd, 2),
	landsAt: before(filmEnd, 1.5) + finalHitLag,
	beatScale: shortEndingBeats / endingBeats,
});

export const endingCues = (schedule: Ending): Cue[] => [
	...schedule.balls.map((at, index) => ({ at, kind: 'dot' as const, rung: index })),
	{ at: schedule.landsAt, kind: 'impact' },
];

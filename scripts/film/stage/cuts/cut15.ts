import { bar, beats, barSeconds } from '../timing';
import type { Cut } from './cutTypes';
import { cardSuperWindow, cardUnder, endActions, endingCues, liveDotOrigin, sat } from './shared';

const b = bar;
const flickTabs = [103, 104, 105, 101];
const endAt = b(9);
const toCal = b(5) + beats(2);
const payoffAt = b(6) + beats(2);

// 8 bars: the problem, the popup, the orange card on the drop, the switch, the win, the sign-off.
const cut15: Cut = {
	id: '15',
	bars: 8,
	duration: 8 * barSeconds,
	sections: [
		{ fromBar: 1, toBar: 3, part: 'intro' },
		{ fromBar: 4, toBar: 4, part: 'drop' },
		{ fromBar: 5, toBar: 5, part: 'groove' },
		{ fromBar: 6, toBar: 6, part: 'peak' },
		{ fromBar: 7, toBar: 8, part: 'outro' },
	],
	shots: [
		{ kind: 'wall', from: 0, to: b(2) + 0.5 },
		{ kind: 'browser', from: b(2), to: b(3) },
		{ kind: 'popupOpen', from: b(3), to: cardUnder(b(4)) },
		{ kind: 'card', from: b(4), to: toCal, origin: liveDotOrigin },
		{ kind: 'swaps', from: cardUnder(b(4)), to: payoffAt },
		{ kind: 'payoff', from: payoffAt, to: b(7) },
		{ kind: 'endCard', from: b(7), to: endAt },
	],
	supers: [
		{ key: 'tooMany', from: 0.6, to: b(2), place: 'top' },
		{ key: 'flipping', from: b(2) + beats(1), to: b(3), place: 'top' },
		{ key: 'watchesAll', from: b(3) + beats(1), to: b(4), place: 'top' },
		{ key: 'switches', ...cardSuperWindow(b(4), toCal), place: 'card', animate: 'words' },
		{ key: 'bestOne', from: toCal, to: payoffAt, place: 'top' },
	],
	popups: [
		{
			id: 'main',
			page: 'popup',
			loadAt: b(3),
			profile: 'plain',
			reveal: 'off',
			registered: true,
			clock: [
				{ at: b(3), slate: sat('7:32:40') },
				{ at: cardUnder(b(4)), slate: sat('7:32:42') },
				{ at: cardUnder(b(4)), slate: sat('7:33:15') },
				{ at: toCal, slate: sat('7:33:16') },
				{ at: payoffAt, slate: sat('7:33:18') },
				{ at: payoffAt, slate: sat('8:02:48') },
				{ at: b(6) + beats(3), slate: sat('8:02:53') },
				{ at: b(7), slate: sat('8:02:56') },
				{ at: endAt, slate: sat('8:03:00') },
			],
			actions: [
				{ at: payoffAt + 0.05, kind: 'click', selector: 'button[data-team-star="true"][aria-label="Add UK to favorites"]' },
				{ at: payoffAt + 0.1, kind: 'profile', profile: 'fan' },
				...endActions(b(7)),
			],
		},
	],
	tabs: [
		{ at: b(2), tabId: 102, via: 'cut' },
		...flickTabs.map((tabId, index) => ({ at: b(2) + beats(2 + index * 0.5), tabId, via: 'flick' as const })),
		{ at: toCal, tabId: 103, via: 'swap' },
		{ at: payoffAt, tabId: 101, via: 'cut' },
	],
	managedFrom: b(3),
	cues: [
		{ at: 0.15, kind: 'dot', step: 0 },
		{ at: 0.7, kind: 'whoosh', length: 0.5, gain: 0.5 },
		{ at: b(2) - 0.2, kind: 'whoosh', length: 0.6 },
		...flickTabs.map((_, index) => ({ at: b(2) + beats(2 + index * 0.5), kind: 'tick' as const, gain: 0.8 })),
		{ at: b(3), kind: 'whoosh', length: 0.5, pan: 0.4 },
		{ at: b(4), kind: 'dot', step: 1 },
		{ at: b(4) + 0.2, kind: 'whoosh', length: 0.5 },
		{ at: toCal - 0.6, kind: 'whoosh', length: 0.4, gain: 0.6, pan: 0.3 },
		{ at: toCal, kind: 'swap' },
		{ at: b(6) + beats(2.6), kind: 'swell', length: 1.2 },
		{ at: b(6) + beats(2.9), kind: 'confetti', gain: 1.2 },
		{ at: b(7), kind: 'dot', step: 4 },
		...endingCues(endAt, 8),
	],
};

export default cut15;

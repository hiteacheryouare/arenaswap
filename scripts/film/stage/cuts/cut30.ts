import { bar, beats, barSeconds } from '../timing';
import type { Cut } from './cutTypes';
import { cardSuperWindow, cardUnder, endActions, ending, endingCues, favoriteActions, liveDotOrigin, mainPopupActions, sat } from './shared';

const b = bar;
const flickTabs = [103, 104, 105, 102, 103, 104, 105, 101];
const toCal = b(9) + beats(3);
const endAt = b(17);
const endStart = endAt - beats(ending.beats);

// 16 bars: the problem, the popup, the switch, your team, the sign-off.
const cut30: Cut = {
	id: '30',
	bars: 16,
	duration: 16 * barSeconds,
	sections: [
		{ fromBar: 1, toBar: 3, part: 'intro' },
		{ fromBar: 4, toBar: 7, part: 'build' },
		{ fromBar: 8, toBar: 8, part: 'drop' },
		{ fromBar: 9, toBar: 11, part: 'groove' },
		{ fromBar: 12, toBar: 12, part: 'break' },
		{ fromBar: 13, toBar: 15, part: 'peak' },
		{ fromBar: 16, toBar: 16, part: 'outro' },
	],
	shots: [
		{ kind: 'wall', from: 0, to: b(3) + 0.7 },
		{ kind: 'browser', from: b(3), to: b(5) },
		{ kind: 'popupOpen', from: b(5), to: b(6) },
		{ kind: 'ranked', from: b(6), to: b(7) },
		{ kind: 'assign', from: b(7), to: cardUnder(b(8)) },
		{ kind: 'card', from: b(8), to: toCal, origin: liveDotOrigin },
		{ kind: 'swaps', from: cardUnder(b(8)), to: b(11) },
		{ kind: 'favorite', from: b(11), to: b(13) },
		{ kind: 'payoff', from: b(13), to: endStart },
		{ kind: 'endCard', from: endStart, to: endAt },
	],
	supers: [
		{ key: 'tooMany', from: 0.8, to: b(3), place: 'top' },
		{ key: 'flipping', from: b(3) + beats(3), to: b(5), place: 'top' },
		{ key: 'watchesAll', from: b(5) + beats(1.5), to: b(7), place: 'top' },
		{ key: 'setup', from: b(7) + beats(0.25), to: b(8), place: 'top' },
		{ key: 'switches', ...cardSuperWindow(b(8), toCal), place: 'card', animate: 'words' },
		{ key: 'bestOne', from: toCal, to: b(11), place: 'top' },
		{ key: 'gotTeam', from: b(11) + beats(0.25), to: b(12), place: 'top' },
		{ key: 'prioritize', from: b(12), to: b(13), place: 'top' },
	],
	popups: [
		{
			id: 'main',
			page: 'popup',
			loadAt: b(5),
			profile: 'plain',
			reveal: 'quick',
			registered: false,
			clock: [
				{ at: b(5), slate: sat('7:27:40') },
				{ at: cardUnder(b(8)), slate: sat('7:27:46') },
				{ at: cardUnder(b(8)), slate: sat('7:33:14') },
				{ at: toCal, slate: sat('7:33:16') },
				{ at: b(11), slate: sat('7:33:18') },
				{ at: b(11), slate: sat('7:59:00') },
				{ at: b(13), slate: sat('7:59:04') },
				{ at: b(13), slate: sat('8:02:48') },
				{ at: b(13) + beats(1), slate: sat('8:02:52') },
				{ at: endStart, slate: sat('8:02:55') },
				{ at: endAt, slate: sat('8:03:00') },
			],
			actions: [
				...mainPopupActions(b(7) + beats(0.5), b(7) + beats(2.5)),
				...favoriteActions(b(12)),
				...endActions(endStart),
			],
		},
	],
	tabs: [
		{ at: b(3), tabId: 102, via: 'cut' },
		...flickTabs.map((tabId, index) => ({ at: b(4) + beats(index * 0.5), tabId, via: 'flick' as const })),
		{ at: toCal, tabId: 103, via: 'swap' },
		{ at: b(11), tabId: 101, via: 'cut' },
	],
	managedFrom: b(7) + beats(2.5),
	cues: [
		{ at: 0.2, kind: 'dot', step: 0 },
		{ at: 1.0, kind: 'whoosh', length: 0.6, gain: 0.5 },
		{ at: b(3) - 0.25, kind: 'whoosh', length: 0.7 },
		...flickTabs.map((_, index) => ({ at: b(4) + beats(index * 0.5), kind: 'tick' as const, gain: 0.8 })),
		{ at: b(5), kind: 'whoosh', length: 0.5, pan: 0.4 },
		{ at: b(7) + beats(0.5), kind: 'tick' },
		{ at: b(7) + beats(2.5), kind: 'tick' },
		{ at: b(8), kind: 'dot', step: 1 },
		{ at: b(8) + 0.2, kind: 'whoosh', length: 0.5 },
		{ at: toCal - 0.6, kind: 'whoosh', length: 0.4, gain: 0.6, pan: 0.3 },
		{ at: toCal, kind: 'swap' },
		{ at: b(11) - 0.15, kind: 'whoosh', length: 0.35, gain: 0.55 },
		{ at: b(12), kind: 'dot', step: 5 },
		{ at: b(13) + beats(0.6), kind: 'swell', length: 1 },
		{ at: b(13) + beats(0.9), kind: 'confetti', gain: 1.2 },
		{ at: endStart, kind: 'dot', step: 4 },
		{ at: endStart + beats(0.4), kind: 'whoosh', length: 0.7 },
		...endingCues(endAt, ending.beats),
	],
};

export default cut30;

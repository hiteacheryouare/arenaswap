import { bar, beats, barSeconds, musicBeats } from '../timing';
import type { Cut } from './cutTypes';
import { cardSuperWindow, cardUnder, endActions, endCardHold, endingBeats, endingCues, endingFor, favoriteActions, liveDotOrigin, mainPopupActions, sat } from './shared';

const b = bar;
const flickTabs = [103, 104, 105, 102, 103, 104, 105, 101];
// Ctrl+Tab on the soundtrack's eighth notes.
const flickAt = b(4) - musicBeats(1);
const flickTimes = flickTabs.map((_, index) => flickAt + musicBeats(index * 0.5));
const toCal = b(9) + beats(3);
// The second orange card grows out of Kentucky's LIVE dot and shrinks back into it.
const gotTeamAt = b(10) + beats(3);
const gotTeamEnd = b(12);
const starAt = b(12) + beats(1);
const endAt = b(17);
const endStart = endAt - beats(endingBeats);
const ending = endingFor(endAt);
const creditsAt = endAt + endCardHold;

// 16 bars: the problem, the popup, the switch, your team, the sign-off. Then three of credits.
const cut30: Cut = {
	id: '30',
	bars: 19,
	duration: 19 * barSeconds,
	sections: [
		{ fromBar: 1, toBar: 3, part: 'intro' },
		{ fromBar: 4, toBar: 7, part: 'build' },
		{ fromBar: 8, toBar: 8, part: 'drop' },
		{ fromBar: 9, toBar: 10, part: 'groove' },
		{ fromBar: 11, toBar: 11, part: 'break' },
		{ fromBar: 12, toBar: 15, part: 'peak' },
		{ fromBar: 16, toBar: 16, part: 'outro' },
		{ fromBar: 17, toBar: 19, part: 'tail' },
	],
	shots: [
		{ kind: 'wall', from: 0, to: b(3) + 0.7 },
		{ kind: 'browser', from: b(3), to: b(5) },
		{ kind: 'popupOpen', from: b(5), to: b(6) },
		{ kind: 'ranked', from: b(6), to: b(7) },
		{ kind: 'assign', from: b(7), to: cardUnder(b(8)) },
		{ kind: 'card', from: b(8), to: toCal, origin: liveDotOrigin },
		{ kind: 'swaps', from: cardUnder(b(8)), to: cardUnder(gotTeamAt) },
		{ kind: 'card', from: gotTeamAt, to: gotTeamEnd, origin: liveDotOrigin },
		{ kind: 'favorite', from: cardUnder(gotTeamAt), to: b(13) },
		{ kind: 'payoff', from: b(13), to: endStart },
		{ kind: 'endCard', from: endStart, to: creditsAt, ending },
		{ kind: 'credits', from: creditsAt, to: creditsAt + beats(7) },
		{ kind: 'signature', from: creditsAt + beats(7), to: b(20) },
	],
	supers: [
		{ key: 'tooMany', from: 0.8, to: b(3), place: 'top' },
		{ key: 'flipping', from: flickAt - beats(1), to: b(5), place: 'top' },
		{ key: 'watchesAll', from: b(5) + beats(1.5), to: b(7), place: 'top' },
		{ key: 'setup', from: b(7) + beats(0.25), to: b(8), place: 'top' },
		{ key: 'switches', ...cardSuperWindow(b(8), toCal), place: 'card', animate: 'words' },
		{ key: 'bestOne', from: toCal, to: gotTeamAt, place: 'top' },
		{ key: 'gotTeam', ...cardSuperWindow(gotTeamAt, gotTeamEnd), place: 'card' },
		{ key: 'prioritize', from: starAt, to: endStart, place: 'top' },
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
				{ at: cardUnder(gotTeamAt), slate: sat('7:33:18') },
				{ at: cardUnder(gotTeamAt), slate: sat('7:59:00') },
				{ at: b(13), slate: sat('7:59:04') },
				{ at: b(13), slate: sat('8:02:48') },
				{ at: b(13) + beats(1), slate: sat('8:02:52') },
				{ at: endStart, slate: sat('8:02:55') },
				{ at: endAt, slate: sat('8:03:00') },
			],
			actions: [
				...mainPopupActions(b(7) + musicBeats(0.5), b(7) + musicBeats(2)),
				...favoriteActions(starAt),
				...endActions(endStart),
			],
		},
	],
	tabs: [
		{ at: b(3), tabId: 102, via: 'cut' },
		...flickTabs.map((tabId, index) => ({ at: flickTimes[index]!, tabId, via: 'flick' as const })),
		{ at: toCal, tabId: 103, via: 'swap' },
		{ at: cardUnder(gotTeamAt), tabId: 101, via: 'cut' },
	],
	managedFrom: b(7) + musicBeats(2),
	landsAt: ending.landsAt,
	cues: [
		{ at: musicBeats(0.25), kind: 'dot', step: 0 },
		{ at: musicBeats(1.5), kind: 'whoosh', length: musicBeats(1), gain: 0.5 },
		{ at: b(3) - musicBeats(1), kind: 'whoosh', length: musicBeats(1) },
		...flickTimes.map(at => ({ at, kind: 'tick' as const, gain: 0.8 })),
		{ at: b(5) - musicBeats(1), kind: 'whoosh', length: musicBeats(1), pan: 0.4 },
		{ at: b(7) + musicBeats(0.5), kind: 'tick' },
		{ at: b(7) + musicBeats(2), kind: 'tick' },
		{ at: b(8), kind: 'dot', step: 1 },
		{ at: b(8), kind: 'whoosh', length: musicBeats(1) },
		{ at: b(8) + musicBeats(1), kind: 'impact', gain: 0.8 },
		{ at: toCal - musicBeats(1), kind: 'whoosh', length: musicBeats(1), gain: 0.6, pan: 0.3 },
		{ at: toCal, kind: 'swap' },
		{ at: gotTeamAt, kind: 'dot', step: 3 },
		{ at: gotTeamAt, kind: 'whoosh', length: musicBeats(1) },
		{ at: gotTeamAt + musicBeats(1), kind: 'impact', gain: 0.8 },
		{ at: starAt, kind: 'dot', step: 5 },
		{ at: b(13), kind: 'swell', length: musicBeats(0.75) },
		{ at: b(13) + musicBeats(0.75), kind: 'confetti', gain: 1.2 },
		{ at: endStart, kind: 'dot', step: 4 },
		{ at: endStart, kind: 'whoosh', length: musicBeats(1.5) },
		...endingCues(ending),
	],
};

export default cut30;

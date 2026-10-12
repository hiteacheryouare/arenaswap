import { bar, beats, barSeconds, musicBeats } from '../timing';
import type { Cut } from './cutTypes';
import { cardSuperWindow, cardUnder, endActions, endCardHold, endingBeats, endingCues, endingFor, favoriteActions, kentuckyCard, liveDotOrigin, mainPopupActions, sat } from './shared';

const b = bar;
const flickTabs = [103, 104, 105, 102, 103, 104, 105, 101];
// Ctrl+Tab on the soundtrack's eighth notes.
const flickAt = b(4) - musicBeats(1);
const flickTimes = flickTabs.map((_, index) => flickAt + musicBeats(index * 0.5));

// The first orange card ends on ArenaSwap's switch to Cal; the second opens out of the league grid.
const toCal = b(9) + beats(3);
const gotTeamAt = b(25) + beats(2);
const gotTeamEnd = b(26) + beats(3);
const starAt = b(27);
// The Standby Stream switch: the rule at 7:14 PM, when every open tab was below 45.
const standbyAt = b(19) + beats(3);
const endAt = b(33);
const endStart = endAt - beats(endingBeats);
const ending = endingFor(endAt);
const creditsAt = endAt + endCardHold;

// 32 bars of film, then five of credits. The problem, the answer, then one benefit per scene, each
// held long enough to read.
const cut60: Cut = {
	id: '60',
	bars: 37,
	duration: 37 * barSeconds,
	sections: [
		{ fromBar: 1, toBar: 2, part: 'intro' },
		{ fromBar: 3, toBar: 7, part: 'build' },
		{ fromBar: 8, toBar: 8, part: 'drop' },
		{ fromBar: 9, toBar: 24, part: 'groove' },
		{ fromBar: 25, toBar: 25, part: 'break' },
		{ fromBar: 26, toBar: 31, part: 'peak' },
		{ fromBar: 32, toBar: 32, part: 'outro' },
		{ fromBar: 33, toBar: 37, part: 'tail' },
	],
	shots: [
		{ kind: 'wall', from: 0, to: b(3) + 0.7 },
		{ kind: 'browser', from: b(3), to: b(5) },
		{ kind: 'popupOpen', from: b(5), to: b(6) },
		{ kind: 'ranked', from: b(6), to: b(7) },
		{ kind: 'assign', from: b(7), to: cardUnder(b(8)) },
		{ kind: 'card', from: b(8), to: toCal, origin: liveDotOrigin },
		{ kind: 'swaps', from: cardUnder(b(8)), to: b(11) },
		{ kind: 'detail', from: b(11), to: b(13) + beats(2) },
		{ kind: 'pregame', from: b(13) + beats(2), to: b(15) + beats(3) },
		{ kind: 'settings', from: b(15) + beats(3), to: b(18) },
		{ kind: 'standby', from: b(18), to: b(22) },
		{ kind: 'guide', from: b(22), to: b(24) },
		{ kind: 'leagues', from: b(24), to: cardUnder(gotTeamAt) },
		{ kind: 'card', from: gotTeamAt, to: gotTeamEnd, origin: 'leagueDot' },
		{ kind: 'favorite', from: cardUnder(gotTeamAt), to: b(28) + beats(2) },
		{ kind: 'payoff', from: b(28) + beats(2), to: endStart },
		{ kind: 'endCard', from: endStart, to: creditsAt, ending },
		{ kind: 'credits', from: creditsAt, to: creditsAt + beats(7) },
		{ kind: 'signature', from: creditsAt + beats(7), to: creditsAt + beats(11) },
		{ kind: 'legal', from: creditsAt + beats(11), to: b(38) },
	],
	supers: [
		{ key: 'tooMany', from: 0.8, to: b(3), place: 'top' },
		{ key: 'flipping', from: flickAt - beats(1), to: b(5), place: 'top' },
		{ key: 'watchesAll', from: b(5) + beats(1.5), to: b(7), place: 'top' },
		{ key: 'setup', from: b(7) + beats(0.25), to: b(8), place: 'top' },
		{ key: 'switches', ...cardSuperWindow(b(8), toCal), place: 'card', animate: 'words' },
		{ key: 'bestOne', from: toCal, to: b(11), place: 'top' },
		{ key: 'seeWhy', from: b(11) + beats(0.5), to: b(13) + beats(2), place: 'left' },
		{ key: 'beforeKickoff', from: b(13) + beats(2.5), to: b(15) + beats(3), place: 'left' },
		{ key: 'yours', from: b(15) + beats(3.5), to: b(18), place: 'left' },
		{ key: 'slowDown', from: b(18) + beats(0.5), to: standbyAt - 0.15, place: 'top' },
		{ key: 'neverBoring', from: standbyAt + beats(0.25), to: b(22), place: 'top' },
		{ key: 'upNext', from: b(22) + beats(0.5), to: b(24), place: 'top' },
		{ key: 'leagueRange', from: b(24) + beats(0.5), to: gotTeamAt, place: 'top' },
		{ key: 'gotTeam', ...cardSuperWindow(gotTeamAt, gotTeamEnd), place: 'card' },
		{ key: 'prioritize', from: starAt, to: b(28) + beats(2), place: 'top' },
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
				{ at: cardUnder(gotTeamAt), slate: sat('7:59:00') },
				{ at: b(28) + beats(2), slate: sat('7:59:04') },
				{ at: b(28) + beats(2), slate: sat('8:02:47') },
				{ at: b(29), slate: sat('8:02:51') },
				{ at: endStart, slate: sat('8:02:55') },
				{ at: endAt, slate: sat('8:03:00') },
			],
			actions: [
				...mainPopupActions(b(7) + musicBeats(0.5), b(7) + musicBeats(2)),
				...favoriteActions(starAt),
				...endActions(endStart),
			],
		},
		{
			id: 'detail',
			page: 'popup',
			loadAt: 0,
			profile: 'plain',
			reveal: 'off',
			registered: true,
			clock: [{ at: b(11), slate: sat('7:47:28') }],
			actions: [
				{ at: 1, kind: 'click', selector: kentuckyCard },
				{ at: b(11) + beats(1.5), kind: 'scrollTo', selector: '.popup-container', target: '.game-detail-chart-card', offset: 12, over: beats(3) },
			],
		},
		{
			id: 'pregame',
			page: 'popup',
			loadAt: 0,
			profile: 'plain',
			reveal: 'off',
			registered: false,
			source: 'pregame',
			clock: [{ at: b(13) + beats(2), slate: '2026-10-11T15:00:00.000Z' }],
			actions: [
				{ at: b(14), kind: 'click', selector: '.game-card.game-card-clickable[aria-label="Open details for CHI vs GB"]' },
				{ at: b(14) + musicBeats(2), kind: 'click', selector: '#gd-tab-401872990-matchup' },
				{ at: b(15), kind: 'scrollTo', selector: '.popup-container', target: '.gd-matchup > :nth-child(2)', offset: 12, over: beats(2) },
			],
		},
		{
			id: 'settings',
			page: 'popup',
			loadAt: 0,
			profile: 'plain',
			reveal: 'off',
			registered: true,
			clock: [{ at: b(15) + beats(3), slate: sat('7:50:00') }],
			actions: [
				{ at: 1, kind: 'click', selector: 'button[aria-label="Settings"]' },
				{ at: 1.5, kind: 'click', selector: '#settingsGroup-scoring' },
				{ at: b(16) + beats(1), kind: 'click', selector: '#scoringModeSelect' },
				{ at: b(16) + beats(3), kind: 'click', selector: '#scoringModeSelect + .dropdown-menu li:nth-child(2) button' },
			],
		},
		{
			id: 'standby',
			page: 'popup',
			loadAt: 0,
			profile: 'plain',
			reveal: 'off',
			registered: true,
			clock: [{ at: b(18), slate: sat('7:13:30') }],
			prefs: { standbyStreamEnabled: true, standbyStreamThreshold: 45 },
			standbyAt,
			actions: [],
		},
		{
			id: 'guide',
			page: 'guide',
			loadAt: 0,
			profile: 'plain',
			reveal: 'off',
			registered: true,
			clock: [{ at: b(22), slate: sat('7:50:00') }],
			actions: [],
			width: 1280,
			height: 720,
		},
	],
	tabs: [
		{ at: b(3), tabId: 102, via: 'cut' },
		...flickTabs.map((tabId, index) => ({ at: flickTimes[index]!, tabId, via: 'flick' as const })),
		{ at: toCal, tabId: 103, via: 'swap' },
		{ at: b(18), tabId: 101, via: 'cut' },
		{ at: standbyAt, tabId: 106, via: 'standby' },
		{ at: gotTeamAt, tabId: 101, via: 'cut' },
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
		...[b(11), b(13) + beats(2), b(15) + beats(3), b(18), b(22), b(24)].map(at => ({ at: at - musicBeats(0.5), kind: 'whoosh' as const, length: musicBeats(0.5), gain: 0.55 })),
		{ at: b(14), kind: 'tick' },
		{ at: b(14) + musicBeats(2), kind: 'tick' },
		{ at: b(16) + beats(1), kind: 'tick' },
		{ at: b(16) + beats(3), kind: 'tick' },
		{ at: standbyAt, kind: 'swap' },
		{ at: b(24) + musicBeats(1.75), kind: 'dot', step: 2 },
		{ at: gotTeamAt, kind: 'dot', step: 3 },
		{ at: gotTeamAt, kind: 'whoosh', length: musicBeats(1) },
		{ at: gotTeamAt + musicBeats(1), kind: 'impact', gain: 0.8 },
		{ at: starAt, kind: 'dot', step: 5 },
		{ at: b(29) - musicBeats(1), kind: 'swell', length: musicBeats(1) },
		{ at: b(29), kind: 'confetti', gain: 1.2 },
		{ at: endStart, kind: 'dot', step: 4 },
		{ at: endStart, kind: 'whoosh', length: musicBeats(1.5) },
		...endingCues(ending),
	],
};

export default cut60;

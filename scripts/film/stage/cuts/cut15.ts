import { bar, beats, barSeconds } from '../timing';
import type { Cut } from './cutTypes';
import { sat } from './shared';

const b = bar;

// 8 bars: the setup, the wink, one swap out and back on the drop, the win, the sign-off.
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
		{ kind: 'popupOpen', from: b(3), to: b(4) },
		{ kind: 'swaps', from: b(4), to: b(6) },
		{ kind: 'payoff', from: b(6), to: b(7) },
		{ kind: 'endCard', from: b(7), to: b(9) },
	],
	supers: [
		{ key: 'watchOne', from: b(2) + beats(0.5), to: b(3), place: 'top' },
		{ key: 'otherGames', from: b(3) + beats(1), to: b(4), place: 'top' },
		{ key: 'switches', from: b(4) + beats(1), to: b(5) + beats(2), place: 'top' },
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
				{ at: b(4) - beats(1), slate: sat('7:32:58') },
				{ at: b(4) + beats(1), slate: sat('7:33:16') },
				{ at: b(5), slate: sat('7:33:40') },
				{ at: b(5), slate: sat('7:35:05') },
				{ at: b(5) + beats(1), slate: sat('7:35:18') },
				{ at: b(6), slate: sat('7:35:40') },
				{ at: b(6), slate: sat('8:02:35') },
				{ at: b(6) + beats(2), slate: sat('8:02:53') },
				{ at: b(7), slate: sat('8:03:00') },
			],
			actions: [
				{ at: b(6) + 0.05, kind: 'click', selector: 'button[data-team-star="true"][aria-label="Add UK to favorites"]' },
				{ at: b(6) + 0.1, kind: 'profile', profile: 'fan' },
			],
		},
	],
	tabs: [
		{ at: b(2), tabId: 101, via: 'cut' },
		{ at: b(4) + beats(1), tabId: 103, via: 'swap' },
		{ at: b(5) + beats(1), tabId: 101, via: 'back' },
	],
	managedFrom: b(3),
	cues: [
		{ at: 0.15, kind: 'dot', step: 0 },
		{ at: 0.7, kind: 'whoosh', length: 0.5, gain: 0.5 },
		{ at: b(2) - 0.2, kind: 'whoosh', length: 0.6 },
		{ at: b(3), kind: 'whoosh', length: 0.5, pan: 0.4 },
		{ at: b(4) + beats(1) - 0.5, kind: 'dot', step: 1 },
		{ at: b(4) + beats(1), kind: 'swap' },
		{ at: b(4) + beats(1), kind: 'whoosh', length: 0.45, pan: -0.3 },
		{ at: b(5) + beats(1) - 0.5, kind: 'dot', step: 2 },
		{ at: b(5) + beats(1), kind: 'swap' },
		{ at: b(6) + beats(1.8), kind: 'swell', length: 1.8 },
		{ at: b(6) + beats(2), kind: 'confetti', gain: 1.2 },
		{ at: b(7) + beats(2), kind: 'dot', step: 0, gain: 1.2 },
	],
};

export default cut15;

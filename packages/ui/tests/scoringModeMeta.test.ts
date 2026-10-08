import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { builtInModes, scorerTunables, scoreGame } from 'powerscore';
import type { BuiltInModeId } from 'powerscore';
import {
	boostIds,
	boostPresentation,
	factorTones,
	modePresentation,
	modeSignalIds,
	penaltyPresentation,
	signalPresentation,
} from '../src/components/scoringModeMeta';
import { signalColors } from '../src/components/signalColors';
import { colorDifference } from '../src/components/colorMath';

// The engine's ids are plain strings, so nothing at compile time stops it growing one this table
// has never heard of. That is what these check.

const modes = Object.keys(builtInModes) as BuiltInModeId[];
const colorOf = (id: string) => (id in boostPresentation ? boostPresentation[id as keyof typeof boostPresentation] : penaltyPresentation[id as keyof typeof penaltyPresentation]).color;

describe('scoringModeMeta keeps up with the engine', () => {
	test('lists every built-in mode, with its signals in the engine\'s display order', () => {
		expect(Object.keys(modeSignalIds).toSorted()).toEqual(modes.toSorted());
		for (const mode of modes) {
			expect(modeSignalIds[mode]).toEqual(builtInModes[mode].signals.map(signal => signal.id));
		}
	});

	test('knows whether each mode pays the stall penalty', () => {
		for (const mode of modes) expect(modePresentation[mode].usesStallPenalty).toBe(builtInModes[mode].usesStallPenalty);
	});

	test('has an entry for every boost a mode can pay, and for the three every mode adds', () => {
		const engineBoosts = new Set([
			...modes.flatMap(mode => builtInModes[mode].boosts.map(boost => boost.id)),
			...Object.keys(scorerTunables.reasons.boosts ?? {}),
		]);
		const scored = scoreGame(
			{ id: 'g', league: 'nba', sportType: 'basketball', homeTeam: { score: 1 }, awayTeam: { score: 0 }, period: 2, clockSeconds: 300, status: 'in' },
			{},
			{ favoriteTeamCount: 1, favoriteBoostPoints: 5, gameBoost: 3, postseasonBoostPoints: 4 },
		);
		for (const boost of scored.boosts) engineBoosts.add(boost.id);
		expect([...engineBoosts].toSorted()).toEqual([...boostIds].toSorted());
	});

	// A mode that blends with Classic has a row saying so; Classic does not blend with itself.
	test('explains the blend for exactly the modes that blend', () => {
		for (const mode of modes) {
			expect('blendTooltipKey' in modePresentation[mode]).toBe(builtInModes[mode].classicBlend !== undefined);
		}
	});
});

describe('scoringModeMeta colours', () => {
	test('keeps Classic on its own five colours', () => {
		for (const id of modeSignalIds.classic) expect(signalPresentation[id].color).toBe(signalColors[id]);
	});

	test('draws every mode in the five signal tones, one tone per signal', () => {
		const palette = new Set(Object.values(signalColors));
		for (const mode of modes) {
			const colors = modeSignalIds[mode].map(id => signalPresentation[id].color);
			for (const color of colors) expect(palette.has(color)).toBe(true);
			expect(new Set(colors).size).toBe(colors.length);
		}
	});

	const factors = [...Object.values(boostPresentation), ...Object.values(penaltyPresentation)];

	test('takes every boost and penalty tone from the breakdown\'s palette', () => {
		const tones = new Set(Object.values(factorTones).map(tone => `${tone.color} ${tone.ink}`));
		for (const entry of factors) expect(tones.has(`${entry.color} ${entry.ink}`)).toBe(true);
	});

	test('gives every boost and penalty its own colour', () => {
		expect(new Set(factors.map(entry => entry.color)).size).toBe(factors.length);
		expect(new Set(factors.map(entry => entry.ink)).size).toBe(factors.length);
	});

	// The boosts that only one sport can pay never land on the same card as another sport's.
	const sportOnly: Record<string, string> = { goAheadRun: 'baseball', noHitter: 'baseball', twoMinuteDrill: 'football', redCard: 'soccer' };

	test('keeps any two factors that can share a card at least 11 apart in ΔE00', () => {
		const tooClose = modes.flatMap(mode => ['baseball', 'football', 'soccer', 'hockey'].flatMap(sport => {
			const ids = ['favoriteBoost', 'gameBoost', 'postseasonBoost', ...builtInModes[mode].boosts.map(boost => boost.id), 'clockStall', 'volatility']
				.filter(id => !sportOnly[id] || sportOnly[id] === sport);
			return ids.flatMap((one, index) => ids.slice(index + 1)
				.filter(two => colorDifference(colorOf(one), colorOf(two)) < 11)
				.map(two => `${mode} ${sport}: ${one} / ${two}`));
		}));
		expect(tooClose).toEqual([]);
	});

	// Bootstrap Icons draws a name it doesn't have as nothing, so a typo is a blank space beside the row.
	test('names only icons the extension\'s copy of Bootstrap Icons has', () => {
		const glyphsPath = require.resolve('bootstrap-icons/font/bootstrap-icons.json', { paths: [join(__dirname, '../../../apps/extension')] });
		const glyphs = JSON.parse(readFileSync(glyphsPath, 'utf8')) as Record<string, number>;
		const missing = [...factors.map(entry => entry.icon), 'layers-half'].filter(icon => !(icon in glyphs));
		expect(missing).toEqual([]);
	});

	test('gives every boost and penalty its own icon, apart from the blend rows\' too', () => {
		const icons = [...factors.map(entry => entry.icon), 'layers-half'];
		expect(new Set(icons).size).toBe(icons.length);
	});
});

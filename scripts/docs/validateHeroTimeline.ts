// Runs the hero timeline through the shipped scorer and prints what it produces.
//
// The hero depends on a ranking: which game is best has to change twice, and it has to change
// because the numbers changed. That is a property of `computePowerScore`, not of the timeline,
// so it needs checking rather than assuming. Run this after editing any beat in heroGames.ts.
//
//   npm run docs:validate-hero
//
// Columns are one game each, `total` with the leader marked. The trailing column is the tab the
// switcher would have you on, applying the shipped sensitivity threshold and cooldown.

import { computePowerScore } from '../../packages/powerscore/src/scorer';
import { scoreMaxTotal } from '../../packages/powerscore/src/constants';
import type { ScoreSnapshot } from '../../packages/powerscore/src/types';
import { defaultCooldownSecs, defaultSensitivity, pollIntervalMs, sensitivityThresholds } from '../../packages/core/src/constants';
import { heroGameAt, heroGames, heroTickCount } from '../../apps/docs/src/components/hero/heroGames';

const threshold = sensitivityThresholds[defaultSensitivity];
const cooldownTicks = Math.round((defaultCooldownSecs * 1000) / pollIntervalMs);

const history = new Map<string, ScoreSnapshot[]>();
const winProb = new Map<string, number[]>();
heroGames.forEach(script => {
	history.set(script.base.id, []);
	winProb.set(script.base.id, []);
});

let onScreen = heroGames[0].base.id;
let lastSwitchTick = -cooldownTicks;
const switches: string[] = [];

const pad = (s: string, n: number) => s.padEnd(n);
console.log(pad('tick', 5) + heroGames.map(g => pad(g.base.awayTeam.abbreviation + '@' + g.base.homeTeam.abbreviation, 12)).join('') + 'on screen');

for (let tick = 0; tick < heroTickCount; tick++) {
	const now = Date.now() + tick * pollIntervalMs;
	const scored = heroGames.map(script => {
		const id = script.base.id;
		const game = heroGameAt(script, tick);
		const snapshots = history.get(id)!;
		snapshots.push({ gameId: id, timestamp: now, homeScore: game.homeTeam.score, awayScore: game.awayTeam.score });
		const probs = winProb.get(id)!;
		const margin = game.homeTeam.score - game.awayTeam.score;
		probs.push(Math.min(0.97, Math.max(0.03, 0.5 + margin * 0.045)));
		const result = computePowerScore(game, snapshots, 0, probs);
		return { id, script, game, total: result.total };
	});

	const best = scored.reduce((a, b) => (b.total > a.total ? b : a));
	const current = scored.find(s => s.id === onScreen)!;
	const gap = best.total - current.total;
	const offCooldown = tick - lastSwitchTick >= cooldownTicks;
	if (best.id !== onScreen && gap >= threshold && offCooldown) {
		switches.push(`t${tick}: ${current.script.tabTitle} (${current.total}) -> ${best.script.tabTitle} (${best.total}), gap ${gap}`);
		onScreen = best.id;
		lastSwitchTick = tick;
	}

	const cells = scored.map(s => {
		const mark = s.id === best.id ? '*' : ' ';
		const eye = s.id === onScreen ? '<' : ' ';
		return pad(`${mark}${String(s.total).padStart(3)}${eye} ${s.game.awayTeam.score}-${s.game.homeTeam.score}`, 12);
	});
	console.log(pad(String(tick), 5) + cells.join('') + heroGames.find(g => g.base.id === onScreen)!.tabTitle);
}

console.log(`\nmax total ${scoreMaxTotal}, sensitivity ${defaultSensitivity} needs a ${threshold} point gap, cooldown ${cooldownTicks} ticks`);
console.log(`switches (${switches.length}):`);
switches.forEach(s => console.log('  ' + s));

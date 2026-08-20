// Checks the hero timeline against the shipped scorer, and fails if it stops telling the story the
// hero is built on.
//
//   npm run docs:validate-hero
//
// The hero depends on a ranking: every clip has to get its turn on screen, the turns have to arrive
// in one direction rather than flip-flopping, and each change has to happen because the numbers
// changed. That is a property of `computePowerScore` over authored beats, not of either one alone,
// so it needs checking rather than assuming. Run this after editing any beat.
//
// It prints the board and then asserts. The assertions are the point — this used to print only,
// which meant a beat edit that flattened the ranking produced a table nobody read.

import { heroGameAt, heroGames, heroTickCount } from '../../apps/docs/src/components/hero/heroGames';
import {
	cooldownTicks,
	openingIndex,
	replayThrough,
	scoreBoardAt,
	switchThreshold,
} from '../../apps/docs/src/components/hero/heroTimeline';
import { scoreMaxTotal, sportTypeConfigMap } from '../../packages/powerscore/src/constants';

const failures: string[] = [];

const pad = (value: string, width: number) => value.padEnd(width);

// ─── The board, tick by tick ─────────────────────────────────────────────────
console.log(pad('tick', 5) + heroGames.map(g => pad(`${g.base.awayTeam.abbreviation}@${g.base.homeTeam.abbreviation}`, 12)).join('') + 'on screen');

for (let tick = 0; tick < heroTickCount; tick++) {
	const { board, onScreenIndex } = replayThrough(tick);
	const best = board.reduce((a, b) => (b.result.total > a.result.total ? b : a));
	const cells = board.map(entry => {
		const leader = entry.index === best.index ? '*' : ' ';
		const watching = entry.index === onScreenIndex ? '<' : ' ';
		return pad(`${leader}${String(entry.result.total).padStart(3)}${watching} ${entry.game.awayTeam.score}-${entry.game.homeTeam.score}`, 12);
	});
	console.log(pad(String(tick), 5) + cells.join('') + heroGames[onScreenIndex].tabTitle);
}

const final = replayThrough(heroTickCount - 1);
console.log(`\nmax total ${scoreMaxTotal}, sensitivity needs a ${switchThreshold} point gap, cooldown ${cooldownTicks} ticks`);
console.log(`switches (${final.switches.length}):`);
final.switches.forEach(s => console.log(`  t${s.tick}: ${s.from} -> ${s.to}, gap ${s.gap}`));

// ─── Assertions ──────────────────────────────────────────────────────────────

const indexOfTab = (title: string) => heroGames.findIndex(script => script.tabTitle === title);

// Every clip has to be seen. A tab that never comes up is a video nobody watches and bytes nobody
// needed, which is the state this timeline was rewritten to fix.
const shown = new Set<number>([openingIndex, ...final.switches.map(change => indexOfTab(change.to))]);
heroGames.forEach((script, index) => {
	if (!shown.has(index)) failures.push(`${script.tabTitle}: never on screen, so its clip never plays`);
});

// And seen in one direction. Coming back to a tab already left reads as the switcher being unable to
// make up its mind, even when every individual decision cleared the threshold honestly.
const visited = [openingIndex];
for (const change of final.switches) {
	const to = indexOfTab(change.to);
	if (visited.includes(to)) failures.push(`t${change.tick}: returns to ${change.to}, which was on screen earlier`);
	visited.push(to);
}

if (final.switches.length < heroGames.length - 1) {
	failures.push(`only ${final.switches.length} switch(es) for ${heroGames.length} games; every clip needs a turn`);
}

// A game clock that jumps forward means a beat's clock is not a whole number of ticks from its
// period anchor, so the derived clock overshoots and the next beat corrects it upwards.
for (const script of heroGames) {
	if (script.clockless) continue;
	const countsUp = script.clockCountsUp === true;
	for (let tick = 1; tick < heroTickCount; tick++) {
		const before = heroGameAt(script, tick - 1);
		const after = heroGameAt(script, tick);
		if (after.period !== before.period) continue;
		const moved = after.clockSeconds - before.clockSeconds;
		const wrongWay = countsUp ? moved < 0 : moved > 0;
		if (wrongWay && after.clockSeconds !== 0) {
			failures.push(`${script.tabTitle}: clock went ${countsUp ? 'backwards' : 'forwards'} at tick ${tick} (${before.clockSeconds}s -> ${after.clockSeconds}s in period ${after.period})`);
		}
	}
}

// Sport rules the cards would otherwise state incorrectly.
for (const script of heroGames) {
	const config = sportTypeConfigMap[script.base.sportType];
	for (let tick = 0; tick < heroTickCount; tick++) {
		const game = heroGameAt(script, tick);

		if (config.clockBased && game.clockSeconds < 0) {
			failures.push(`${script.tabTitle}: negative clock at tick ${tick}`);
		}
		if (game.awayTeam.score < 0 || game.homeTeam.score < 0) {
			failures.push(`${script.tabTitle}: negative score at tick ${tick}`);
		}
		// A home team that is ahead does not bat in the bottom of the ninth, so a card showing that
		// state is showing a game that would already be over.
		if (script.base.sportType === 'baseball' && game.period >= 9 && game.topOfInning === false && game.homeTeam.score > game.awayTeam.score) {
			failures.push(`${script.tabTitle}: bottom of inning ${game.period} with the home team ahead at tick ${tick} — that game is over`);
		}
	}
}

// Scores may only go up, and only by an amount the sport can actually produce in one poll.
const maxJump: Record<string, number> = { basketball: 6, football: 8, hockey: 1, baseball: 4, softball: 4, soccer: 1 };
for (const script of heroGames) {
	const cap = maxJump[script.base.sportType] ?? 5;
	for (let tick = 1; tick < heroTickCount; tick++) {
		const before = heroGameAt(script, tick - 1);
		const after = heroGameAt(script, tick);
		for (const side of ['awayTeam', 'homeTeam'] as const) {
			const moved = after[side].score - before[side].score;
			if (moved < 0) failures.push(`${script.tabTitle}: ${side} score went down at tick ${tick}`);
			if (moved > cap) failures.push(`${script.tabTitle}: ${side} scored ${moved} in one poll at tick ${tick}, over the ${cap} this sport allows`);
		}
	}
}

// Every game has to score above zero at some point, or it is a card with nothing to say.
for (const script of heroGames) {
	const best = Math.max(...Array.from({ length: heroTickCount }, (_, tick) => (
		scoreBoardAt(tick).find(entry => entry.id === script.base.id)?.result.total ?? 0
	)));
	if (best === 0) failures.push(`${script.tabTitle}: never scores above 0 across the whole timeline`);
}

if (failures.length > 0) {
	console.error(`\n${failures.length} problem(s):`);
	failures.forEach(f => console.error(`  - ${f}`));
	process.exit(1);
}
console.log('\nAll checks passed.');

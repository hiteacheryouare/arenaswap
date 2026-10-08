import { noHitterTunables } from '../constants';
import { isBaseball, isLive, none } from './shared';
import type { BoostDefinition, Game, ReasonFragment, Side, SportTypeConfig } from '../types';

// A bid for `side`'s pitching staff: the other team has no hits. Grows by completed hitless innings
// from "through 5" (through 3 in softball), and out by out while the staff is on the field.
const noBid = { value: 0, completed: 0 };

const bidValue = (game: Game<string>, sport: SportTypeConfig, side: Side): { value: number; completed: number } => {
	const curve = sport.lateGameCurve;
	const opponent = side === 'home' ? game.awayTeam : game.homeTeam;
	if (!curve || opponent.hits !== 0 || game.period === undefined || game.topOfInning === undefined) return noBid;

	// Home pitches the tops, the road team the bottoms.
	const pitching = side === 'home' ? game.topOfInning : !game.topOfInning;
	// The bottom half with three outs is the break after the inning, when both halves are done.
	const inningOver = !game.topOfInning && (game.outs ?? 0) >= 3;
	const completed = (side === 'home' && !game.topOfInning) || inningOver ? game.period : game.period - 1;
	const stage = completed - (curve.regulationInnings - 4);
	if (stage < 0) return noBid;

	const { ladder, finalStagePerOut, battingFactor, softballFactor } = noHitterTunables;
	const rung = Math.min(stage, ladder.length - 1);
	let value: number = ladder[rung]!;
	if (pitching) {
		const outs = Math.min(3, Math.max(0, game.outs ?? 0));
		value += rung === ladder.length - 1 ? finalStagePerOut * outs : (outs / 3) * (ladder[rung + 1]! - ladder[rung]!);
	} else {
		value *= battingFactor;
	}
	return { value: game.sportType === 'softball' ? value * softballFactor : value, completed };
};

export const noHitterBoost: BoostDefinition = {
	id: 'noHitter',
	bucket: 'noHitter',
	compute: ({ game, sport }) => {
		if (!isBaseball(game) || !isLive(game)) return none;
		const home = bidValue(game, sport, 'home');
		const away = bidValue(game, sport, 'away');
		const points = Math.max(home.value, away.value) + 0.5 * Math.min(home.value, away.value);
		if (points <= 0) return none;
		const lead = home.value >= away.value ? { bid: home, hitless: game.awayTeam } : { bid: away, hitless: game.homeTeam };
		const details: ReasonFragment[] = home.value > 0 && away.value > 0
			? [{ key: 'doubleNoHitter', params: { innings: Math.min(home.completed, away.completed) } }]
			: [{ key: 'noHitter', params: { team: lead.hitless.abbreviation ?? '?', innings: lead.bid.completed } }];
		return { points: Math.round(points), meta: { inning: game.period ?? 0 }, details };
	},
};

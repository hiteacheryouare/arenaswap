import { ageSince, decayFactor } from '../math';
import { computeCloseness, computeLateGame } from './classic';
import { secondsLeftInPeriod } from '../boosts/shared';
import type { FantasyPlayerState, Game, ReasonFragment, SignalDefinition, SignalInput, SignalOutput, SportType } from '../types';

const none: SignalOutput = { points: 0 };

// Yards from the end zone a kicker is in range: a 54-yard try in the pros, 47 in college.
const fieldGoalRange: Record<string, number> = { ncaaf: 30 };
const proFieldGoalRange = 37;

const redZoneWeight: Record<string, number> = { QB: 1, RB: 0.8, WR: 1, TE: 0.9 };
const goalLineWeight: Record<string, number> = { QB: 0.9, RB: 1, WR: 0.7, TE: 0.8 };

// Points of production that count as a full burst: a touchdown, a home run, a goal.
const fullProduction: Partial<Record<SportType, number>> = { football: 6, basketball: 6, baseball: 5, softball: 5, hockey: 3, soccer: 3 };

export const activePlayers = (context: SignalInput['context']): FantasyPlayerState[] => (context.fantasy ?? []).filter(player => player.active !== false);

const label = (player: FantasyPlayerState): string => player.name ?? player.position;

interface Situation { value: number; reason?: ReasonFragment }

const footballSituation = (player: FantasyPlayerState, input: SignalInput): Situation => {
	const { game, sport, league } = input;
	const live = game.down !== undefined && game.down >= 1 && (game.distance ?? 0) >= 0;
	if (!live || game.possession === undefined || game.yardsToEndZone === undefined) return { value: 0 };
	const yards = game.yardsToEndZone;
	const hasBall = game.possession === player.side;
	const name = { name: label(player) };
	if (player.position === 'DST') {
		if (hasBall) return { value: 0 };
		return { value: yards <= 20 ? 25 : 20, reason: { key: 'fantasyDefense', params: name } };
	}
	if (!hasBall) return { value: 0 };
	if (player.position === 'K') {
		const range = fieldGoalRange[game.league] ?? proFieldGoalRange;
		if (yards > range) return { value: 8 };
		const secsLeft = secondsLeftInPeriod(game, sport, league);
		const endOfHalf = secsLeft !== null && secsLeft <= 30 && (game.period === 2 || (game.period ?? 0) >= league.regularPeriods);
		return { value: game.down === 4 || endOfHalf ? 45 : 30, reason: { key: 'fantasyFieldGoalRange', params: name } };
	}
	if (yards <= 5) return { value: 50 * (goalLineWeight[player.position] ?? 0.8), reason: { key: 'fantasyRedZone', params: name } };
	if (yards <= 20) return { value: 40 * (redZoneWeight[player.position] ?? 0.8), reason: { key: 'fantasyRedZone', params: name } };
	return { value: yards <= 50 ? 28 : 20, reason: { key: 'fantasyHasBall', params: name } };
};

const baseballSituation = (player: FantasyPlayerState, game: Game<string>): Situation => {
	const name = { name: label(player) };
	if (player.role === 'atBat') return { value: 40, reason: { key: 'fantasyAtBat', params: name } };
	if (player.role === 'onDeck') return { value: 25, reason: { key: 'fantasyOnDeck', params: name } };
	if (player.role === 'inHole') return { value: 15 };
	if (player.role === 'pitching') {
		const runnersOn = game.baseRunners && (game.baseRunners.first || game.baseRunners.second || game.baseRunners.third);
		return { value: runnersOn ? 40 : 30, reason: { key: 'fantasyPitching', params: name } };
	}
	const batting = game.topOfInning === undefined ? false : (game.topOfInning ? 'away' : 'home') === player.side;
	return player.position !== 'P' && batting ? { value: 20 } : { value: 0 };
};

// Basketball and hockey have no live on-court data, so a player in the game is worth as much as
// the game itself is close and late.
const inGameSituation = (player: FantasyPlayerState, input: SignalInput): Situation => {
	const closeLate = computeCloseness(input).points + computeLateGame(input).points;
	return { value: 20 + 30 * Math.min(1, closeLate / 80), reason: { key: 'fantasyInGame', params: { name: label(player) } } };
};

const situationOf = (player: FantasyPlayerState, input: SignalInput): Situation => {
	switch (input.game.sportType) {
		case 'football': return footballSituation(player, input);
		case 'baseball':
		case 'softball': return baseballSituation(player, input.game);
		default: return inGameSituation(player, input);
	}
};

// Whoever has the most going on, plus a quarter of everyone else's: your RB and your D/ST in the
// same game both count, and the max follows the ball.
export const computeFantasySituation = (input: SignalInput): SignalOutput => {
	const situations = activePlayers(input.context).map(player => situationOf(player, input)).toSorted((a, b) => b.value - a.value);
	if (situations.length === 0 || situations[0]!.value <= 0) return none;
	const [best, ...rest] = situations;
	const points = Math.round(best!.value + 0.25 * rest.reduce((total, situation) => total + situation.value, 0));
	return { points, ...(best!.reason ? { reason: best!.reason } : {}) };
};

// Fantasy points scored lately, fading like a lead change. Negative plays don't count: a pick-six
// thrown is no reason to switch in after the fact.
export const computeFantasyProduction = ({ game, context, sport, now }: SignalInput): SignalOutput => {
	const full = fullProduction[game.sportType] ?? 6;
	let recent = 0;
	let topPlayer: FantasyPlayerState | undefined;
	let topRecent = 0;
	for (const player of activePlayers(context)) {
		const playerRecent = (player.pointEvents ?? [])
			.filter(event => event.points > 0)
			.reduce((total, event) => total + event.points * decayFactor(ageSince(event.at, now), sport.decayHalfLifeMs.leadChange), 0);
		recent += playerRecent;
		if (playerRecent > topRecent) {
			topRecent = playerRecent;
			topPlayer = player;
		}
	}
	const points = Math.round(35 * Math.min(1, recent / full));
	if (points <= 0 || !topPlayer) return none;
	return { points, reason: { key: 'fantasyPoints', params: { name: label(topPlayer), points: Math.round(topRecent * 10) / 10 } } };
};

export const computeFantasyExposure = ({ context }: SignalInput): SignalOutput => {
	const count = activePlayers(context).length;
	if (count === 0) return none;
	return { points: Math.min(15, count * 5), reason: { key: 'fantasyRostered', params: { count } } };
};

export const fantasySituationSignal: SignalDefinition = { id: 'situation', ceiling: 50, compute: computeFantasySituation };
export const fantasyProductionSignal: SignalDefinition = { id: 'production', ceiling: 35, compute: computeFantasyProduction };
export const fantasyExposureSignal: SignalDefinition = { id: 'exposure', ceiling: 15, compute: computeFantasyExposure };

export const fantasySignals: readonly SignalDefinition[] = [fantasySituationSignal, fantasyProductionSignal, fantasyExposureSignal];

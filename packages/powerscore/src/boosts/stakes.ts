import { stakesTunables } from '../constants';
import { isDecided, isLive, isPostseason, none, teamOf } from './shared';
import type { BoostDefinition, Game, ReasonFragment, SeriesState, Side, TeamStakes } from '../types';

const decisiveValue: Record<number, number> = { 7: 10, 5: 9, 3: 8 };

// Keyed "winner-wins-loser-wins" for the team facing elimination's opponent.
const eliminationValue: Record<string, number> = { '7:3-2': 7, '7:3-1': 5, '7:3-0': 4, '5:2-1': 6, '5:2-0': 4, '3:1-0': 5 };

const seriesStakes = (series: SeriesState): number => {
	if (series.bestOf < 3) return 0;
	const needed = Math.ceil(series.bestOf / 2);
	const homeOnBrink = series.homeWins === needed - 1;
	const awayOnBrink = series.awayWins === needed - 1;
	if (homeOnBrink && awayOnBrink) return decisiveValue[series.bestOf] ?? 8;
	if (!homeOnBrink && !awayOnBrink) return 0;
	const leader = Math.max(series.homeWins, series.awayWins);
	const trailer = Math.min(series.homeWins, series.awayWins);
	return eliminationValue[`${series.bestOf}:${leader}-${trailer}`] ?? 4;
};

// The scoreboard already shows the series record, so this says only what the game decides.
const seriesDetail = (game: Game<string>, series: SeriesState): ReasonFragment => {
	if (series.homeWins === series.awayWins) return { key: 'seriesDecider', params: { game: series.homeWins + series.awayWins + 1 } };
	const leader = teamOf(game, series.homeWins > series.awayWins ? 'home' : 'away');
	return { key: 'seriesClinch', params: { team: leader.abbreviation ?? '?' } };
};

const rankedStakes = (game: Game<string>): number => {
	const home = game.homeTeam.rank;
	const away = game.awayTeam.rank;
	if (home === undefined || away === undefined || home > 25 || away > 25) return 0;
	const better = Math.min(home, away);
	const worse = Math.max(home, away);
	if (worse <= 5) return 6;
	if (worse <= 10) return 5;
	if (better <= 10) return 4;
	return 3;
};

const teamRaceValue = (stakes: TeamStakes | undefined): number => {
	if (!stakes) return 0;
	const line = stakes.nearLine === 'title' || stakes.nearLine === 'relegation' ? 6 : stakes.nearLine === 'topQualification' ? 4 : stakes.nearLine === 'other' ? 3 : 0;
	return Math.max(stakes.canClinch || stakes.canBeEliminated ? 5 : 0, line, stakes.inRace ? 3 : 0);
};

const raceKeys: Record<NonNullable<TeamStakes['nearLine']>, string> = {
	title: 'raceTitle',
	relegation: 'raceRelegation',
	topQualification: 'raceTopQualification',
	other: 'raceLine',
};

// Says the flag that earned the team's race value, the biggest one first.
const raceDetail = (game: Game<string>, side: Side, stakes: TeamStakes): ReasonFragment | undefined => {
	const team = teamOf(game, side).abbreviation ?? '?';
	if (stakes.nearLine === 'title' || stakes.nearLine === 'relegation') return { key: raceKeys[stakes.nearLine], params: { team } };
	if (stakes.canClinch) return { key: 'raceClinch', params: { team } };
	if (stakes.canBeEliminated) return { key: 'raceElimination', params: { team } };
	if (stakes.nearLine) return { key: raceKeys[stakes.nearLine], params: { team } };
	if (stakes.inRace) return { key: 'raceHunt', params: { team } };
	return undefined;
};

// What the result decides: a postseason series on the brink, or in the regular season a meeting of
// ranked teams and a late-season race. Kept apart by season so it never double-counts the
// postseason boost. Gated on the margin: a decided Game 7 has nothing left to decide.
export const stakesBoost: BoostDefinition = {
	id: 'stakes',
	bucket: 'context',
	compute: ({ game, context, sport, league, progress, margin }) => {
		if (!isLive(game) || isDecided({ game, sport, league, margin })) return none;
		let stakes = 0;
		const details: ReasonFragment[] = [];
		if (isPostseason(game)) {
			const series = game.series ? seriesStakes(game.series) : 0;
			stakes += series;
			if (series > 0) details.push(seriesDetail(game, game.series!));
		} else {
			const ranked = rankedStakes(game);
			stakes += ranked;
			if (ranked > 0) {
				details.push({ key: 'rankedMeeting', params: {
					team: game.awayTeam.abbreviation ?? '?',
					rank: game.awayTeam.rank!,
					other: game.homeTeam.abbreviation ?? '?',
					otherRank: game.homeTeam.rank!,
				} });
			}
			const home = teamRaceValue(context.stakes?.home);
			const away = teamRaceValue(context.stakes?.away);
			stakes += Math.min(stakesTunables.raceMax, Math.max(home, away) + 0.5 * Math.min(home, away));
			const sides: Side[] = home >= away ? ['home', 'away'] : ['away', 'home'];
			sides.forEach(side => {
				const race = context.stakes?.[side];
				const detail = race && teamRaceValue(race) > 0 ? raceDetail(game, side, race) : undefined;
				if (detail) details.push(detail);
			});
		}
		stakes = Math.min(stakesTunables.max, stakes);
		const [, t2, t3] = sport.closenessMargins;
		const gate = margin <= t2 ? 1 : margin <= t3 || progress < 0.5 ? 0.5 : 0;
		const points = Math.round(stakes * gate);
		return points > 0 ? { points, details } : none;
	},
};

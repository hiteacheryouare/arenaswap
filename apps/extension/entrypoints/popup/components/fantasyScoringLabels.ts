import type { FantasySport } from 'powerscore';
import type { plainMessageKey } from './settingsCatalog';

export interface fantasyRuleGroup {
	// Basketball's six rules need no heading of their own.
	headingKey?: plainMessageKey;
	rules: readonly { rule: string; labelKey: plainMessageKey }[];
}

export const fantasySports: readonly FantasySport[] = ['football', 'basketball', 'baseball', 'hockey'];

export const fantasySportLabelKeys = {
	football: 'sport.football',
	basketball: 'sport.basketball',
	baseball: 'sport.baseball',
	hockey: 'sport.hockey',
} as const satisfies Record<FantasySport, plainMessageKey>;

export const fantasyRuleGroups = {
	football: [
		{
			headingKey: 'fantasy.groupOffense',
			rules: [
				{ rule: 'passingYards', labelKey: 'fantasy.football.passingYards' },
				{ rule: 'passingTouchdowns', labelKey: 'fantasy.football.passingTouchdowns' },
				{ rule: 'interceptionsThrown', labelKey: 'fantasy.football.interceptionsThrown' },
				{ rule: 'rushingYards', labelKey: 'fantasy.football.rushingYards' },
				{ rule: 'rushingTouchdowns', labelKey: 'fantasy.football.rushingTouchdowns' },
				{ rule: 'receptions', labelKey: 'fantasy.football.receptions' },
				{ rule: 'receivingYards', labelKey: 'fantasy.football.receivingYards' },
				{ rule: 'receivingTouchdowns', labelKey: 'fantasy.football.receivingTouchdowns' },
				{ rule: 'twoPointConversions', labelKey: 'fantasy.football.twoPointConversions' },
				{ rule: 'fumblesLost', labelKey: 'fantasy.football.fumblesLost' },
				{ rule: 'returnTouchdowns', labelKey: 'fantasy.football.returnTouchdowns' },
			],
		},
		{
			headingKey: 'fantasy.groupKicking',
			rules: [
				{ rule: 'extraPointsMade', labelKey: 'fantasy.football.extraPointsMade' },
				{ rule: 'extraPointsMissed', labelKey: 'fantasy.football.extraPointsMissed' },
				{ rule: 'fieldGoals0To39', labelKey: 'fantasy.football.fieldGoals0To39' },
				{ rule: 'fieldGoals40To49', labelKey: 'fantasy.football.fieldGoals40To49' },
				{ rule: 'fieldGoals50Plus', labelKey: 'fantasy.football.fieldGoals50Plus' },
				{ rule: 'fieldGoalsMissed', labelKey: 'fantasy.football.fieldGoalsMissed' },
			],
		},
		{
			headingKey: 'fantasy.groupDefense',
			rules: [
				{ rule: 'sacks', labelKey: 'fantasy.football.sacks' },
				{ rule: 'takeaways', labelKey: 'fantasy.football.takeaways' },
				{ rule: 'safetiesAndBlocks', labelKey: 'fantasy.football.safetiesAndBlocks' },
				{ rule: 'defensiveTouchdowns', labelKey: 'fantasy.football.defensiveTouchdowns' },
				{ rule: 'pointsAllowed0', labelKey: 'fantasy.football.pointsAllowed0' },
				{ rule: 'pointsAllowed1To6', labelKey: 'fantasy.football.pointsAllowed1To6' },
				{ rule: 'pointsAllowed7To13', labelKey: 'fantasy.football.pointsAllowed7To13' },
				{ rule: 'pointsAllowed14To20', labelKey: 'fantasy.football.pointsAllowed14To20' },
				{ rule: 'pointsAllowed21To27', labelKey: 'fantasy.football.pointsAllowed21To27' },
				{ rule: 'pointsAllowed28To34', labelKey: 'fantasy.football.pointsAllowed28To34' },
				{ rule: 'pointsAllowed35Plus', labelKey: 'fantasy.football.pointsAllowed35Plus' },
			],
		},
	],
	basketball: [
		{
			rules: [
				{ rule: 'points', labelKey: 'fantasy.basketball.points' },
				{ rule: 'rebounds', labelKey: 'fantasy.basketball.rebounds' },
				{ rule: 'assists', labelKey: 'fantasy.basketball.assists' },
				{ rule: 'steals', labelKey: 'fantasy.basketball.steals' },
				{ rule: 'blocks', labelKey: 'fantasy.basketball.blocks' },
				{ rule: 'turnovers', labelKey: 'fantasy.basketball.turnovers' },
			],
		},
	],
	baseball: [
		{
			headingKey: 'fantasy.groupHitters',
			rules: [
				{ rule: 'totalBases', labelKey: 'fantasy.baseball.totalBases' },
				{ rule: 'runs', labelKey: 'fantasy.baseball.runs' },
				{ rule: 'runsBattedIn', labelKey: 'fantasy.baseball.runsBattedIn' },
				{ rule: 'walks', labelKey: 'fantasy.baseball.walks' },
				{ rule: 'stolenBases', labelKey: 'fantasy.baseball.stolenBases' },
				{ rule: 'strikeouts', labelKey: 'fantasy.baseball.strikeouts' },
			],
		},
		{
			headingKey: 'fantasy.groupPitchers',
			rules: [
				{ rule: 'outsRecorded', labelKey: 'fantasy.baseball.outsRecorded' },
				{ rule: 'hitsAllowed', labelKey: 'fantasy.baseball.hitsAllowed' },
				{ rule: 'earnedRuns', labelKey: 'fantasy.baseball.earnedRuns' },
				{ rule: 'walksAllowed', labelKey: 'fantasy.baseball.walksAllowed' },
				{ rule: 'pitcherStrikeouts', labelKey: 'fantasy.baseball.pitcherStrikeouts' },
				{ rule: 'wins', labelKey: 'fantasy.baseball.wins' },
				{ rule: 'losses', labelKey: 'fantasy.baseball.losses' },
				{ rule: 'saves', labelKey: 'fantasy.baseball.saves' },
				{ rule: 'holds', labelKey: 'fantasy.baseball.holds' },
			],
		},
	],
	hockey: [
		{
			headingKey: 'fantasy.groupSkaters',
			rules: [
				{ rule: 'goals', labelKey: 'fantasy.hockey.goals' },
				{ rule: 'assists', labelKey: 'fantasy.hockey.assists' },
				{ rule: 'powerPlayPoints', labelKey: 'fantasy.hockey.powerPlayPoints' },
				{ rule: 'shotsOnGoal', labelKey: 'fantasy.hockey.shotsOnGoal' },
				{ rule: 'blockedShots', labelKey: 'fantasy.hockey.blockedShots' },
				{ rule: 'plusMinus', labelKey: 'fantasy.hockey.plusMinus' },
			],
		},
		{
			headingKey: 'fantasy.groupGoalies',
			rules: [
				{ rule: 'goalieWins', labelKey: 'fantasy.hockey.goalieWins' },
				{ rule: 'saves', labelKey: 'fantasy.hockey.saves' },
				{ rule: 'goalsAgainst', labelKey: 'fantasy.hockey.goalsAgainst' },
				{ rule: 'shutouts', labelKey: 'fantasy.hockey.shutouts' },
				{ rule: 'overtimeLosses', labelKey: 'fantasy.hockey.overtimeLosses' },
			],
		},
	],
} as const satisfies Record<FantasySport, readonly fantasyRuleGroup[]>;

// The input's step, from how finely the default is written: 0.04 steps by hundredths, 1.2 by tenths.
export const ruleStep = (points: number): number => {
	const decimals = String(points).split('.')[1]?.length ?? 0;
	return decimals === 0 ? 1 : 10 ** -decimals;
};

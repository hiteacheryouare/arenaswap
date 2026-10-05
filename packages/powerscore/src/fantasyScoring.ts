// Fantasy scoring rules: points per stat, keyed by neutral stat names a caller maps its own box
// score onto. Defaults are the sports analyst's (full PPR for football, Yahoo points for basketball);
// every rule has bounds a settings screen can enforce.

export type FantasySport = 'football' | 'basketball' | 'baseball' | 'hockey';

export interface FantasyRule {
	points: number;
	min: number;
	max: number;
}

const rule = (points: number, min: number, max: number): FantasyRule => ({ points, min, max });

export const defaultFantasyScoring: Record<FantasySport, Record<string, FantasyRule>> = {
	football: {
		passingYards: rule(0.04, 0, 0.1),
		passingTouchdowns: rule(4, 0, 10),
		interceptionsThrown: rule(-2, -6, 0),
		rushingYards: rule(0.1, 0, 0.5),
		rushingTouchdowns: rule(6, 0, 10),
		receptions: rule(1, 0, 2),
		receivingYards: rule(0.1, 0, 0.5),
		receivingTouchdowns: rule(6, 0, 10),
		twoPointConversions: rule(2, 0, 4),
		fumblesLost: rule(-2, -6, 0),
		returnTouchdowns: rule(6, 0, 10),
		extraPointsMade: rule(1, 0, 3),
		extraPointsMissed: rule(-1, -3, 0),
		fieldGoals0To39: rule(3, 0, 10),
		fieldGoals40To49: rule(4, 0, 10),
		fieldGoals50Plus: rule(5, 0, 10),
		fieldGoalsMissed: rule(-1, -5, 0),
		sacks: rule(1, 0, 4),
		takeaways: rule(2, 0, 6),
		safetiesAndBlocks: rule(2, 0, 6),
		defensiveTouchdowns: rule(6, 0, 10),
		pointsAllowed0: rule(10, -10, 15),
		pointsAllowed1To6: rule(7, -10, 15),
		pointsAllowed7To13: rule(4, -10, 15),
		pointsAllowed14To20: rule(1, -10, 15),
		pointsAllowed21To27: rule(0, -10, 15),
		pointsAllowed28To34: rule(-1, -10, 15),
		pointsAllowed35Plus: rule(-4, -10, 15),
	},
	basketball: {
		points: rule(1, 0, 3),
		rebounds: rule(1.2, 0, 3),
		assists: rule(1.5, 0, 3),
		steals: rule(3, 0, 6),
		blocks: rule(3, 0, 6),
		turnovers: rule(-1, -4, 0),
	},
	baseball: {
		totalBases: rule(1, 0, 4),
		runs: rule(1, 0, 4),
		runsBattedIn: rule(1, 0, 4),
		walks: rule(1, 0, 4),
		stolenBases: rule(1, 0, 4),
		strikeouts: rule(-1, -3, 0),
		outsRecorded: rule(1, 0, 3),
		hitsAllowed: rule(-1, -3, 0),
		earnedRuns: rule(-2, -5, 0),
		walksAllowed: rule(-1, -3, 0),
		pitcherStrikeouts: rule(1, 0, 4),
		wins: rule(2, -10, 10),
		losses: rule(-2, -10, 0),
		saves: rule(5, 0, 10),
		holds: rule(2, 0, 10),
	},
	hockey: {
		goals: rule(3, 0, 6),
		assists: rule(2, 0, 4),
		powerPlayPoints: rule(1, 0, 3),
		shotsOnGoal: rule(0.5, 0, 2),
		blockedShots: rule(0.5, 0, 2),
		plusMinus: rule(0, -2, 2),
		goalieWins: rule(4, 0, 10),
		saves: rule(0.2, 0, 1),
		goalsAgainst: rule(-2, -5, 0),
		shutouts: rule(3, 0, 10),
		overtimeLosses: rule(1, 0, 4),
	},
};

// Where a defense's points-allowed tier comes from.
const pointsAllowedTier = (allowed: number): string => {
	if (allowed === 0) return 'pointsAllowed0';
	if (allowed <= 6) return 'pointsAllowed1To6';
	if (allowed <= 13) return 'pointsAllowed7To13';
	if (allowed <= 20) return 'pointsAllowed14To20';
	if (allowed <= 27) return 'pointsAllowed21To27';
	if (allowed <= 34) return 'pointsAllowed28To34';
	return 'pointsAllowed35Plus';
};

export const fantasySportOf = (sportType: string): FantasySport | undefined => {
	if (sportType === 'football' || sportType === 'basketball' || sportType === 'hockey') return sportType;
	if (sportType === 'baseball' || sportType === 'softball') return 'baseball';
	return undefined;
};

// A user's overrides, held to each rule's bounds; unknown rules are ignored.
export const resolveFantasyScoring = (sport: FantasySport, overrides: Partial<Record<string, number>> = {}): Record<string, number> => (
	Object.fromEntries(Object.entries(defaultFantasyScoring[sport]).map(([key, { points, min, max }]) => {
		const override = overrides[key];
		return [key, typeof override === 'number' && Number.isFinite(override) ? Math.min(max, Math.max(min, override)) : points];
	}))
);

// Fantasy points for one stat line. `pointsAllowed` (a defense's) is scored by tier.
export const computeFantasyPoints = (sport: FantasySport, stats: Partial<Record<string, number>>, overrides?: Partial<Record<string, number>>): number => {
	const rules = resolveFantasyScoring(sport, overrides);
	let total = 0;
	for (const [key, value] of Object.entries(stats)) {
		if (typeof value !== 'number' || !Number.isFinite(value)) continue;
		if (key === 'pointsAllowed') total += rules[pointsAllowedTier(value)] ?? 0;
		else total += (rules[key] ?? 0) * value;
	}
	return Math.round(total * 100) / 100;
};

export * from './scoreMaxima';
export * from './tunables';
export * from './leagues';

export const breakPenalty = 15;

export const scoringOpportunityBaseRunnerBoosts: [number, number, number, number] = [0, 3, 6, 10];

export const scoringOpportunityRedZoneBoost = 10;
export const scoringOpportunityRedZoneFringeBoost = 5;

export const redZoneDownMultipliers = {
	fourthDownGoalToGo: 1.5,
	fourthDown: 1.35,
	thirdAndShort: 1.15,
	other: 1,
} as const;

export const thirdAndShortDistance = 3;

import type { ReasonFragment } from '@arenaswap/core/types';

// Why a boost is paying in this game, written under its row; the tooltip keeps the general rule. The
// engine sends the boosts it scores as keyed sentences; the favorite and manual boosts are built here
// from what the popup already knows.

type translate = (key: string, subs?: Record<string, string | number>) => string;

export interface boostReasonInput {
	id: string;
	details?: readonly ReasonFragment[];
	// Abbreviations of the favorited teams playing in this game.
	favoriteTeams: readonly string[];
}

export const boostDetailKeys: ReadonlySet<string> = new Set([
	'seriesClinch', 'seriesDecider', 'rankedMeeting',
	'raceTitle', 'raceRelegation', 'raceTopQualification', 'raceLine', 'raceClinch', 'raceElimination', 'raceHunt',
	'basesEmpty', 'runnerFirst', 'runnerSecond', 'runnerThird', 'runnersFirstSecond', 'runnersFirstThird', 'runnersSecondThird', 'basesLoaded',
	'inningOver', 'outsideRedZone', 'redZone', 'redZoneThirdAndShort', 'redZoneFourthDown', 'redZoneNotClose', 'noScoringPosition',
	'goAheadRun', 'tyingRun', 'winningRun', 'lastChance',
	'driveTied', 'driveTrailing',
	'emptyNet', 'powerPlayTied', 'powerPlayClose', 'powerPlayTeamTied', 'powerPlayTeamTrailing', 'powerPlayTeamLeading',
	'redCard', 'noHitter', 'doubleNoHitter',
	'underdogLeading', 'underdogLevel', 'underdogClose',
	'regularSeason', 'postseasonBoostOff',
]);

const roundKeys = ['boostDetail.postseasonFinal', 'boostDetail.postseasonSemifinal', 'boostDetail.postseasonQuarterfinal', 'boostDetail.postseasonEarlyRound'];

const translateDetail = ({ key, params }: ReasonFragment, t: translate): string | undefined => {
	if (key === 'postseasonRound') {
		const roundKey = roundKeys[Number(params?.round)];
		return roundKey ? t(roundKey) : undefined;
	}
	return boostDetailKeys.has(key) ? t(`boostDetail.${key}`, params) : undefined;
};

const favoriteSentence = (teams: readonly string[], t: translate): string | undefined => {
	if (teams.length === 0) return undefined;
	return teams.length === 1
		? t('boostDetail.favoriteOne', { team: teams[0]! })
		: t('boostDetail.favoriteBoth', { team: teams[0]!, other: teams[1]! });
};

// One line a translator wrote whole beats a line half in English: an unknown key drops them all.
export const boostReason = ({ id, details, favoriteTeams }: boostReasonInput, t: translate): string | undefined => {
	if (id === 'favoriteBoost') return favoriteSentence(favoriteTeams, t);
	if (id === 'gameBoost') return t('boostDetail.gameBoostSet');
	if (!details?.length) return undefined;
	const sentences = details.map(detail => translateDetail(detail, t));
	if (sentences.some(sentence => sentence === undefined)) return undefined;
	return sentences.join(t('boostDetail.joiner'));
};

import type { ReasonFragment } from '@arenaswap/core/types';

// A boost's tooltip says what is happening in this game. The engine sends the boosts it scores as
// keyed sentences; the favorite and manual boosts are built here from what the popup already knows.
// Anything without a sentence falls back to the boost's general rule.

type translate = (key: string, subs?: Record<string, string | number>) => string;

export interface boostTooltipInput {
	id: string;
	points: number;
	details?: readonly ReasonFragment[];
	// Abbreviations of the favorited teams playing in this game.
	favoriteTeams: readonly string[];
	// Play is stopped and every boost scores nothing.
	frozen: boolean;
}

// The runner sentences already exist for the bases diagram.
const sharedKeys: Record<string, string> = {
	runnerFirst: 'bases.first',
	runnerSecond: 'bases.second',
	runnerThird: 'bases.third',
	runnersFirstSecond: 'bases.firstSecond',
	runnersFirstThird: 'bases.firstThird',
	runnersSecondThird: 'bases.secondThird',
	basesLoaded: 'bases.loaded',
	basesEmpty: 'bases.empty',
};

export const boostDetailKeys: ReadonlySet<string> = new Set([
	'seriesClinch', 'seriesDecider', 'rankedMeeting',
	'raceTitle', 'raceRelegation', 'raceTopQualification', 'raceLine', 'raceClinch', 'raceElimination', 'raceHunt',
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
	if (sharedKeys[key]) return t(sharedKeys[key]);
	if (key === 'postseasonRound') {
		const roundKey = roundKeys[Number(params?.round)];
		return roundKey ? t(roundKey) : undefined;
	}
	return boostDetailKeys.has(key) ? t(`boostDetail.${key}`, params) : undefined;
};

const favoriteSentence = (points: number, teams: readonly string[], t: translate): string => {
	if (teams.length === 0) return t('boostDetail.favoriteNone');
	if (points === 0) return t('boostDetail.favoriteOff');
	return teams.length === 1
		? t('boostDetail.favoriteOne', { team: teams[0]! })
		: t('boostDetail.favoriteBoth', { team: teams[0]!, other: teams[1]! });
};

// One line a translator wrote whole beats a line half in English: an unknown key drops them all.
export const boostTooltip = ({ id, points, details, favoriteTeams, frozen }: boostTooltipInput, t: translate): string | undefined => {
	if (frozen) return t('boostDetail.playStopped');
	if (id === 'favoriteBoost') return favoriteSentence(points, favoriteTeams, t);
	if (id === 'gameBoost') return t(points > 0 ? 'boostDetail.gameBoostSet' : 'boostDetail.gameBoostNone');
	if (!details?.length) return undefined;
	const sentences = details.map(detail => translateDetail(detail, t));
	if (sentences.some(sentence => sentence === undefined)) return undefined;
	return sentences.join(t('boostDetail.joiner'));
};

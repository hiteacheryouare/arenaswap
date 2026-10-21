import { ordinal } from 'powerscore';
import type { ReasonFragment } from '@arenaswap/core/types';

// The engine writes each reason as sentences of keys with parameters, and English as prose. Any
// other language rebuilds the sentences from locale strings.

type translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;
type params = NonNullable<ReasonFragment['params']>;

// Sentences whose parameters go straight into the string.
const sentenceKeys: Record<string, string> = {
	redZone: 'powerScore.reasonRedZone',
	redZoneThirdAndShort: 'powerScore.reasonRedZoneThirdAndShort',
	redZoneFourthDown: 'powerScore.reasonRedZoneFourthDown',
	driveTrailing: 'powerScore.reasonDriveTrailing',
	driveTied: 'powerScore.reasonDriveTied',
	emptyNet: 'powerScore.reasonEmptyNet',
	powerPlay: 'powerScore.reasonPowerPlay',
	powerPlayTeam: 'powerScore.reasonPowerPlayTeam',
	goAheadRun: 'powerScore.reasonGoAheadRunOnBase',
	tyingRun: 'powerScore.reasonTyingRunOnBase',
	winningRun: 'powerScore.reasonWinningRunOnBase',
	runnerSecond: 'powerScore.reasonRunnerSecond',
	runnerThird: 'powerScore.reasonRunnerThird',
	runnersFirstSecond: 'powerScore.reasonRunnersFirstSecond',
	runnersFirstThird: 'powerScore.reasonRunnersFirstThird',
	runnersSecondThird: 'powerScore.reasonRunnersSecondThird',
	basesLoaded: 'powerScore.reasonBasesLoaded',
	noHitter: 'powerScore.reasonNoHitterThrough',
	doubleNoHitter: 'powerScore.reasonDoubleNoHitterThrough',
	fantasyHasBall: 'powerScore.reasonFantasyHasBall',
	fantasyRedZone: 'powerScore.reasonFantasyRedZone',
	fantasyFieldGoalRange: 'powerScore.reasonFantasyFieldGoalRange',
	fantasyDefense: 'powerScore.reasonFantasyDefense',
	fantasyAtBat: 'powerScore.reasonFantasyAtBat',
	fantasyOnDeck: 'powerScore.reasonFantasyOnDeck',
	fantasyPitching: 'powerScore.reasonFantasyPitching',
	fantasyInGame: 'powerScore.reasonFantasyInGame',
	scoredStraight: 'powerScore.reasonScoredStraight',
	scoredStraightToLead: 'powerScore.reasonScoredStraightToLead',
	tookLead: 'powerScore.reasonTookLead',
	cameBackToLead: 'powerScore.reasonCameBackToLead',
	cutDeficit: 'powerScore.reasonCutDeficit',
	seriesClinch: 'powerScore.reasonSeriesClinch',
	seriesDecider: 'powerScore.reasonSeriesDecider',
	raceClinch: 'powerScore.reasonRaceClinch',
	raceElimination: 'powerScore.reasonRaceElimination',
	upset: 'powerScore.reasonUpset',
	shootout: 'powerScore.reasonHockeyShootout',
	penaltyShootout: 'powerScore.reasonPenaltyShootout',
};

const whenKeys: Record<string, string> = {
	clock: 'powerScore.reasonWhenClock',
	quarter: 'powerScore.reasonWhenQuarter',
	half: 'powerScore.reasonWhenHalf',
	period: 'powerScore.reasonWhenPeriod',
	overtime: 'powerScore.reasonWhenOvertime',
	overtimeClock: 'powerScore.reasonWhenOvertimeClock',
	overtimeNumbered: 'powerScore.reasonWhenOvertimeNumbered',
	minute: 'powerScore.reasonWhenMinute',
	extraTime: 'powerScore.reasonWhenExtraTime',
	top: 'powerScore.reasonWhenTop',
	bottom: 'powerScore.reasonWhenBottom',
	inning: 'powerScore.reasonWhenInning',
};

const scoreKeys: Record<string, string> = {
	tied: 'powerScore.reasonScoreTied',
	lead: 'powerScore.reasonScoreLead',
	up: 'powerScore.reasonScoreUp',
	leadGoals: 'powerScore.reasonScoreLeadGoals',
	upGoals: 'powerScore.reasonScoreUpGoals',
};

// Only English has suffixes to add; every other locale's strings place the number themselves.
const ordinalFor = (n: unknown, locale: string): string => (locale.toLowerCase().startsWith('en') ? ordinal(Number(n)) : String(n));

const lastMinutes = (p: params, t: translate) => t('powerScore.reasonLastMinutes', Number(p.minutes));

// Undefined when the time is a kind this build has no string for, which drops the whole line.
const withWhen = (sentence: string, p: params, t: translate, locale: string): string | undefined => {
	if (p.when === undefined) return sentence;
	const whenKey = whenKeys[String(p.when)];
	if (!whenKey) return undefined;
	const when = t(whenKey, { clock: p.clock ?? '', ordinal: ordinalFor(p.period, locale) });
	return t('powerScore.reasonJoinWhen', { sentence, when });
};

const translateFragment = ({ key, params: p = {} }: ReasonFragment, t: translate, locale: string): string | undefined => {
	const sentenceKey = sentenceKeys[key];
	if (sentenceKey) return t(sentenceKey, p);
	const run = `${p.scoredFor}–${p.scoredAgainst}`;
	switch (key) {
		case 'state': {
			// Some languages count goals with their own word, so a lead in hockey or soccer has its own string.
			const scoreKey = scoreKeys[`${p.score}${p.score !== 'tied' && p.unit === 'goal' ? 'Goals' : ''}`];
			return scoreKey ? withWhen(t(scoreKey, p), p, t, locale) : undefined;
		}
		case 'tiedIt': return withWhen(t('powerScore.reasonTiedIt', p), p, t, locale);
		case 'cameBack': return withWhen(t('powerScore.reasonCameBack', p), p, t, locale);
		case 'redCard': return t('powerScore.reasonRedCardDown', { ...p, ordinal: ordinalFor(p.minute, locale) });
		case 'run': return t('powerScore.reasonRun', { team: p.team, run });
		case 'runToLead': return t('powerScore.reasonRunToLead', { team: p.team, run });
		case 'outscoring': return t('powerScore.reasonOutscoring', { team: p.team, other: p.other, run, window: lastMinutes(p, t) });
		case 'leadChanges': return t('powerScore.reasonLeadChangesRecent', { count: p.count, window: lastMinutes(p, t) });
		case 'fantasyPoints': return t('powerScore.reasonFantasyPointsRecent', { name: p.name, points: p.points, window: lastMinutes(p, t) });
		case 'fantasyRostered': return t('powerScore.reasonFantasyPlayersInGame', Number(p.count));
		default: return undefined;
	}
};

// One line a translator wrote whole beats a line half in English: a key this build does not know
// (a custom mode's own) drops the line.
export const translateReasonFragments = (fragments: readonly ReasonFragment[], t: translate, locale: string): string | undefined => {
	if (fragments.length === 0) return undefined;
	const sentences = fragments.map(fragment => translateFragment(fragment, t, locale));
	if (sentences.some(sentence => sentence === undefined)) return undefined;
	return sentences.join(t('powerScore.reasonSentenceJoiner'));
};

interface spokenScore {
	reason: string;
	// A live score's.
	breakdown?: { reasons: readonly ReasonFragment[] };
	// A history snapshot's.
	reasons?: readonly ReasonFragment[];
}

export const speakReason = (score: spokenScore, t: translate, locale: string): string | undefined => {
	if (locale.toLowerCase().startsWith('en')) return score.reason || undefined;
	const keyed = score.breakdown?.reasons ?? score.reasons;
	return keyed ? translateReasonFragments(keyed, t, locale) : undefined;
};

export const capitalizeReason = (reason: string, locale: string): string => (
	reason.charAt(0).toLocaleUpperCase(locale) + reason.slice(1)
);

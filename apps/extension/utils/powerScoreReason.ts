import type { ReasonFragment } from '@arenaswap/core/types';
import type { BoostId } from '@arenaswap/ui/src/components/scoringModeMeta';

// A PowerScore 3 score carries its reasons as keys with parameters, and each one is rebuilt from
// locale strings. A score from before then carries only English prose, which the fallback below
// reads back fragment by fragment.

type translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

const text = (params: ReasonFragment['params'], name: string): string => String(params?.[name] ?? '');
const count = (params: ReasonFragment['params'], name: string): number => Number(params?.[name] ?? 0);

const marginKeys: Record<string, string> = { point: 'powerScore.reasonMarginPoints', goal: 'powerScore.reasonMarginGoals', run: 'powerScore.reasonMarginRuns' };
const blowoutKeys: Record<string, string> = { point: 'powerScore.reasonBlowoutPoints', goal: 'powerScore.reasonBlowoutGoals', run: 'powerScore.reasonBlowoutRuns' };

const boostReasonKeys: Record<BoostId, string> = {
	favoriteBoost: 'powerScore.reasonFavoriteBoost',
	gameBoost: 'powerScore.reasonGameBoost',
	scoringOpportunity: 'powerScore.reasonScoringOpportunity',
	goAheadRun: 'powerScore.reasonGoAheadRun',
	twoMinuteDrill: 'powerScore.reasonTwoMinuteDrill',
	emptyNet: 'powerScore.reasonEmptyNet',
	powerPlay: 'powerScore.reasonPowerPlay',
	redCard: 'powerScore.reasonRedCard',
	noHitter: 'powerScore.reasonNoHitter',
	upsetWatch: 'powerScore.reasonUpsetWatch',
	upsetRout: 'powerScore.reasonUpsetRout',
	stakes: 'powerScore.reasonStakes',
	postseasonBoost: 'powerScore.reasonPostseasonBoost',
};

const plainReasonKeys: Record<string, string> = {
	tied: 'powerScore.reasonTied',
	overtime: 'powerScore.reasonOvertime',
	extraTime: 'powerScore.reasonExtraTime',
	shootout: 'powerScore.reasonShootout',
	extraInnings: 'powerScore.reasonExtraInnings',
	overtimeLooming: 'powerScore.reasonOvertimeLooming',
	levelLate: 'powerScore.reasonLevelLate',
	tradingLeads: 'powerScore.reasonTradingLeads',
	justTookLead: 'powerScore.reasonJustTookLead',
	fallback: 'powerScore.reasonFallback',
	earlyRout: 'powerScore.reasonEarlyRout',
};

const teamReasonKeys: Record<string, string> = {
	onARoll: 'powerScore.reasonOnARoll',
	cuttingIn: 'powerScore.reasonCuttingIn',
	closingGap: 'powerScore.reasonClosingGap',
	leadHeld: 'powerScore.reasonLeadHeld',
	pilingOn: 'powerScore.reasonPilingOn',
};

const playerReasonKeys: Record<string, string> = {
	fantasyHasBall: 'powerScore.reasonFantasyHasBall',
	fantasyRedZone: 'powerScore.reasonFantasyRedZone',
	fantasyFieldGoalRange: 'powerScore.reasonFantasyFieldGoalRange',
	fantasyDefense: 'powerScore.reasonFantasyDefense',
	fantasyAtBat: 'powerScore.reasonFantasyAtBat',
	fantasyOnDeck: 'powerScore.reasonFantasyOnDeck',
	fantasyPitching: 'powerScore.reasonFantasyPitching',
	fantasyInGame: 'powerScore.reasonFantasyInGame',
};

const translateKeyedFragment = ({ key, params }: ReasonFragment, t: translate): string | undefined => {
	const plain = plainReasonKeys[key];
	if (plain) return t(plain);
	const team = teamReasonKeys[key];
	if (team) return t(team, { team: text(params, 'team') });
	const player = playerReasonKeys[key];
	if (player) return t(player, { name: text(params, 'name') });
	const boost = (boostReasonKeys as Record<string, string>)[key];
	if (boost) return t(boost, { points: text(params, 'points') });
	switch (key) {
		case 'margin': {
			const unitKey = marginKeys[text(params, 'unit')];
			return unitKey ? t(unitKey, count(params, 'margin')) : undefined;
		}
		case 'blowoutMargin': {
			const unitKey = blowoutKeys[text(params, 'unit')];
			return unitKey ? t(unitKey, count(params, 'margin')) : undefined;
		}
		case 'inning': return t('powerScore.reasonInning', { inning: text(params, 'inning') });
		case 'clockLeft': return t('powerScore.reasonClockLeft', { clock: text(params, 'clock') });
		case 'minutesIn': return t('powerScore.reasonMinutesIn', count(params, 'minutes'));
		case 'underMinutes': return t('powerScore.reasonUnderMinutes', count(params, 'minutes'));
		case 'outscoring': return t('powerScore.reasonOutscoring', {
			team: text(params, 'team'),
			other: text(params, 'other'),
			run: `${text(params, 'scoredFor')}–${text(params, 'scoredAgainst')}`,
		});
		case 'fantasyPoints': return t('powerScore.reasonFantasyPoints', { name: text(params, 'name'), points: text(params, 'points') });
		case 'fantasyRostered': return t('powerScore.reasonFantasyRostered', count(params, 'count'));
		default: return undefined;
	}
};

// Like the English fallback, a line with one key this does not know (a custom mode's own) is
// dropped whole rather than printed half translated.
export const translateReasonFragments = (fragments: readonly ReasonFragment[], t: translate): string | undefined => {
	if (fragments.length === 0) return undefined;
	const parts = fragments.map(fragment => translateKeyedFragment(fragment, t));
	if (parts.some(part => part === undefined)) return undefined;
	return parts.join(t('powerScore.reasonJoiner'));
};

interface boosts {
	favoriteBonus: number;
	gameBoost: number;
	scoringOpportunityBoost: number;
	postseasonBoost: number;
}

// Defined once so the fragments background.ts writes and the patterns below read them back can
// never drift apart.
const boostLabels = {
	favorite: 'favorite bonus',
	game: 'game boost',
	scoringOpportunity: 'scoring opportunity',
	postseason: 'postseason',
} as const;

export const boostReasonParts = ({ favoriteBonus, gameBoost, scoringOpportunityBoost, postseasonBoost }: boosts): string[] => [
	favoriteBonus > 0 && `${boostLabels.favorite} (+${favoriteBonus})`,
	gameBoost > 0 && `${boostLabels.game} (+${gameBoost})`,
	scoringOpportunityBoost > 0 && `${boostLabels.scoringOpportunity} (+${scoringOpportunityBoost})`,
	postseasonBoost > 0 && `${boostLabels.postseason} (+${postseasonBoost})`,
].filter((part): part is string => typeof part === 'string');

const boostPattern = (label: string) => new RegExp(`^${label} \\(\\+(\\d+)\\)$`);

const fragments: [RegExp, (match: RegExpMatchArray, t: translate) => string][] = [
	[/^it's tied$/, (_, t) => t('powerScore.reasonTied')],
	[/^(\d+)-point game$/, (m, t) => t('powerScore.reasonMarginPoints', Number(m[1]))],
	[/^(\d+)-goal game$/, (m, t) => t('powerScore.reasonMarginGoals', Number(m[1]))],
	[/^(\d+)-run game$/, (m, t) => t('powerScore.reasonMarginRuns', Number(m[1]))],
	[/^overtime$/, (_, t) => t('powerScore.reasonOvertime')],
	[/^extra time$/, (_, t) => t('powerScore.reasonExtraTime')],
	[/^penalties$/, (_, t) => t('powerScore.reasonShootout')],
	[/^extra innings$/, (_, t) => t('powerScore.reasonExtraInnings')],
	[/^(\d+)(?:st|nd|rd|th) inning$/, (m, t) => t('powerScore.reasonInning', { inning: m[1] })],
	[/^(\d+:\d{2}) left$/, (m, t) => t('powerScore.reasonClockLeft', { clock: m[1] })],
	[/^under (\d+) min left$/, (m, t) => t('powerScore.reasonUnderMinutes', Number(m[1]))],
	[/^(\d+) min in$/, (m, t) => t('powerScore.reasonMinutesIn', Number(m[1]))],
	[/^tied — overtime looming$/, (_, t) => t('powerScore.reasonOvertimeLooming')],
	[/^still level late$/, (_, t) => t('powerScore.reasonLevelLate')],
	[/^(\S+) outscoring (\S+) (\d+)-(\d+)$/, (m, t) => t('powerScore.reasonOutscoring', { team: m[1], other: m[2], run: `${m[3]}–${m[4]}` })],
	[/^(\S+) on a roll$/, (m, t) => t('powerScore.reasonOnARoll', { team: m[1] })],
	[/^trading leads$/, (_, t) => t('powerScore.reasonTradingLeads')],
	[/^just took the lead$/, (_, t) => t('powerScore.reasonJustTookLead')],
	[/^(\S+) cutting into it$/, (m, t) => t('powerScore.reasonCuttingIn', { team: m[1] })],
	[/^(\S+) closing the gap$/, (m, t) => t('powerScore.reasonClosingGap', { team: m[1] })],
	[/^best game available$/, (_, t) => t('powerScore.reasonFallback')],
	[boostPattern(boostLabels.favorite), (m, t) => t('powerScore.reasonFavoriteBoost', { points: m[1] })],
	[boostPattern(boostLabels.game), (m, t) => t('powerScore.reasonGameBoost', { points: m[1] })],
	[boostPattern(boostLabels.scoringOpportunity), (m, t) => t('powerScore.reasonScoringOpportunity', { points: m[1] })],
	[boostPattern(boostLabels.postseason), (m, t) => t('powerScore.reasonPostseasonBoost', { points: m[1] })],
];

const translateFragment = (fragment: string, t: translate): string | undefined => {
	for (const [pattern, render] of fragments) {
		const match = fragment.match(pattern);
		if (match) return render(match, t);
	}
	return undefined;
};

// English reads as the scorer wrote it. Anywhere else, a line with one fragment this does not
// recognise is dropped whole rather than printed half translated.
export const translateReason = (reason: string, t: translate, locale: string): string | undefined => {
	if (locale.toLowerCase().startsWith('en')) return reason;
	const parts = reason.split(', ').map(fragment => translateFragment(fragment, t));
	if (parts.some(part => part === undefined)) return undefined;
	return parts.join(t('powerScore.reasonJoiner'));
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
	return keyed ? translateReasonFragments(keyed, t) : translateReason(score.reason, t, locale);
};

export const capitalizeReason = (reason: string, locale: string): string => (
	reason.charAt(0).toLocaleUpperCase(locale) + reason.slice(1)
);

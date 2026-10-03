// The PowerScore reason is English prose the scorer writes, plus the boost fragments background.ts
// adds after it, joined with ", ". The scorer cannot be taught other languages, so for every other
// language the line is read back here fragment by fragment and rebuilt from locale strings.

type translate = (key: string, subsOrCount?: unknown, subs?: unknown) => string;

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

export const capitalizeReason = (reason: string, locale: string): string => (
	reason.charAt(0).toLocaleUpperCase(locale) + reason.slice(1)
);

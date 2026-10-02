// English fallbacks for every label the shared components render, plus the labels the website
// reuses when it shows a piece of the extension.
//
// A plain module rather than part of i18nContext so build-time code — Astro frontmatter on the
// site, for one — can read a label without pulling React in to do it. The extension never uses
// these: it wraps the tree in a TranslationContext backed by its own locale files, and every key
// here exists there too.

export const defaultStrings: Record<string, string> = {
	'gameCard.live': 'LIVE',
	'gameCard.final': 'Final',
	'gameCard.powerScore': 'PowerScore',
	'gameCard.watchLabel': 'Watch:',
	'gameCard.oddsProvidedBy': 'Odds provided by:',
	'gameCard.favorited': 'Favorited',
	'gameCard.addToFavoritesShort': 'Add to favorites',
	'gameCard.addToFavorites': 'Add {team} to favorites',
	'gameCard.removeFromFavorites': 'Remove {team} from favorites',
	'gameCard.openDetails': 'Open details for {away} vs {home}',
	'gameCard.delay': 'DELAY',
	'gameCard.delayFallback': 'Delay',
	'gameCard.vs': 'vs',
	'gameCard.topOfInning': 'Top of inning',
	'gameCard.bottomOfInning': 'Bottom of inning',
	'gameCard.shootout': 'PENS {away}–{home}',
	'gameCard.downDistanceAt': '{downDistance} at {fieldPosition}',
	'gameCard.teamRank': 'Ranked #{rank}',
	'gameCard.timeoutsRemaining': '{team}: 1 timeout left | {team}: $1 timeouts left',
	'gameCard.timeoutsShort': '{count} TO',
	'gameCard.periodQuarter': 'Q{count}',
	'gameCard.periodFirstHalf': '1H',
	'gameCard.periodSecondHalf': '2H',
	'gameCard.period': 'P{count}',
	'gameCard.periodInning': 'Inn {count}',
	'gameCard.periodOvertime': 'OT',
	'gameCard.periodOvertimeNumbered': '{count}OT',
	'gameCard.periodExtraTimeFirst': 'ET1',
	'gameCard.periodExtraTimeSecond': 'ET2',
	'gameCard.periodShootout': 'PENS',
	'field.possession': '{team} has the ball',
	'field.noPossession': 'Field position',
	'main.tourButton': 'Tour',
	'main.settingsButton': 'Settings',
	'main.guideButton': 'Guide',
	'main.sectionActiveLiveTabs': 'Active Tabs',
	'main.sectionOtherLiveGames': 'Live Games',
	'main.sectionUpNext': 'Up Next',
	'main.enableToggleLabel': 'Enable auto-switching',
	'main.onStandbyStream': 'On standby stream, waiting for action',
	'tabAssign.placeholder': '— Assign a tab —',
	'detail.halftime': 'Halftime',
	'detail.chartPowerScoreTitle': 'PowerScore Over Time',
	'detail.chartScoreTitle': 'Game Score Over Time',
	'detail.chartWinProbTitle': 'Win Probability',
	'detail.chartComponentsTitle': 'PowerScore Components Over Time',
	'setup.groupSwitching': 'Switching',
	'setup.groupSwitchingDesc': 'How eager ArenaSwap is to move you to a better game.',
	'setup.groupScoring': 'Scoring',
	'setup.groupScoringDesc': 'Which signals feed a PowerScore, and what earns bonus points.',
	'setup.groupLeagues': 'Leagues',
	'setup.groupLeaguesDesc': 'Which leagues get tracked, and the order they appear in.',
	'setup.groupDisplay': 'Display',
	'setup.groupDisplayDesc': 'What shows up on the main screen.',
	'setup.groupStandby': 'Standby Stream',
	'setup.groupStandbyDesc': 'Where to park you when every game goes quiet.',
	'setup.groupDemo': 'Demo Mode',
	'setup.groupDemoDesc': 'Scripted games, so you can watch a switch happen on demand.',
	'bso.balls': 'B',
	'bso.strikes': 'S',
	'bso.outs': 'O',
	'bso.ballsSpoken': '1 ball | $1 balls',
	'bso.strikesSpoken': '1 strike | $1 strikes',
	'bso.outsSpoken': '1 out | $1 outs',
	'bso.countSpoken': '{balls}, {strikes}, {outs}',
	'bases.empty': 'Bases empty',
	'bases.first': 'Runner on first',
	'bases.second': 'Runner on second',
	'bases.third': 'Runner on third',
	'bases.firstSecond': 'Runners on first and second',
	'bases.firstThird': 'Runners on first and third',
	'bases.secondThird': 'Runners on second and third',
	'bases.loaded': 'Bases loaded',
};

type Substitutions = Record<string, string | number>;

// The extension's i18n.t: a number picks a plural form and fills $1, an object fills {names}.
export type Translator = (key: string, countOrSubs?: number | Substitutions, subs?: Substitutions) => string;

// Plural strings outside the extension are written "one | other", the shape WXT compiles them to.
export const translateFrom = (lookup: (key: string) => string | undefined): Translator => (key, countOrSubs, subs) => {
	const count = typeof countOrSubs === 'number' ? countOrSubs : undefined;
	const named = typeof countOrSubs === 'object' ? countOrSubs : subs;
	let str = lookup(key) ?? key;
	if (count !== undefined) {
		const forms = str.split(' | ');
		str = (forms.length === 2 ? forms[count === 1 ? 0 : 1]! : forms[0]!).split('$1').join(String(count));
	}
	if (named) {
		for (const [k, v] of Object.entries(named)) {
			str = str.split(`{${k}}`).join(String(v));
		}
	}
	return str;
};

export const defaultTranslate = translateFrom(key => defaultStrings[key]);

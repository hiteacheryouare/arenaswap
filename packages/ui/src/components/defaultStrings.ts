// English fallbacks for every label the shared components render, plus the labels the website
// reuses when it shows a piece of the extension.
//
// A plain module rather than part of i18nContext so build-time code — Astro frontmatter on the
// site, for one — can read a label without pulling React in to do it. The extension never uses
// these: it wraps the tree in a TranslationContext backed by its own locale files, and every key
// here exists there too.

export const defaultStrings: Record<string, string> = {
	'gameCard.live': 'LIVE',
	'gameCard.powerScore': 'PowerScore',
	'gameCard.watchLabel': 'Watch:',
	'gameCard.oddsProvidedBy': 'Odds provided by:',
	'gameCard.favorited': 'Favorited',
	'gameCard.addToFavoritesShort': 'Add to favorites',
	'gameCard.vs': 'vs',
	'gameCard.topOfInning': 'Top of inning',
	'gameCard.bottomOfInning': 'Bottom of inning',
	'gameCard.shootout': 'PENS {away}–{home}',
	'gameCard.downDistanceAt': '{downDistance} at {fieldPosition}',
	'main.tourButton': 'Tour',
	'main.settingsButton': 'Settings',
	'main.sectionActiveLiveTabs': 'Active Tabs',
	'main.sectionOtherLiveGames': 'Live Games',
	'main.sectionUpNext': 'Up Next',
	'main.enableToggleLabel': 'Enable auto-switching',
	'main.onStandbyStream': 'On standby stream, waiting for action',
	'tabAssign.placeholder': '— Assign a tab —',
	'detail.chartPowerScoreTitle': 'PowerScore over time',
	'detail.chartScoreTitle': 'Game score over time',
	'detail.chartWinProbTitle': 'Win probability',
	'detail.chartComponentsTitle': 'PowerScore components over time',
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
	'setup.groupDemo': 'Demo mode',
	'setup.groupDemoDesc': 'Scripted games, so you can watch a switch happen on demand.',
	'bso.balls': 'B',
	'bso.strikes': 'S',
	'bso.outs': 'O',
};

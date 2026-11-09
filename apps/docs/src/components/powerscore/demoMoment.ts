import { leagueConfigMap } from 'powerscore';
import type { Game } from 'powerscore';
import { formatGameClock, formatPeriod } from '@arenaswap/ui/src/components/gameFormat';
import { islandTranslator } from '../../i18n/islandStrings';
import { uiStrings } from '../../i18n/ui';
import type { LocaleCode } from '../../i18n/locales';

// "NBA", "Q4" and "2:14" the way the popup's game card prints them, in the reader's language.
export const momentLabels = (game: Game, locale: LocaleCode) => ({
	league: leagueConfigMap[game.league].label,
	period: formatPeriod(game, islandTranslator(uiStrings(locale))),
	clock: formatGameClock(game),
});

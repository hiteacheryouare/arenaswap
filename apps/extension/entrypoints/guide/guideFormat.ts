import { i18n } from '#i18n';
import type { guideBand } from './guideHeat';

const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const fiveMinutesMs = 5 * 60_000;

export const formatGuideTime = (ms: number, locale?: string): string => (
	new Date(ms).toLocaleTimeString(locale, timeOptions)
);

// The band starts at "now" once its window is under way, so to the minute it ticked forward every
// minute. It is widened to the five minutes around it, and formatRange says "3:45 – 4:15 PM" with
// the PM once, in whatever order and spacing the locale uses.
export const formatBandRange = (fromMs: number, toMs: number, locale?: string): string => (
	new Intl.DateTimeFormat(locale, timeOptions).formatRange(
		Math.floor(fromMs / fiveMinutesMs) * fiveMinutesMs,
		Math.ceil(toMs / fiveMinutesMs) * fiveMinutesMs,
	)
);

// The whole sentence back, minus its opening phrase — which is the label on the switch immediately
// to its left, so the header still reads 'Best time to watch · 3:45 – 4:20 PM · 3 games' end to end
// without printing that phrase twice. Assembled from the parts that are present rather than written
// inline with separators, so a missing piece cannot leave an orphan '·'.
export const bandLabel = (band: guideBand, locale?: string): string => [
	formatBandRange(band.fromMs, band.toMs, locale),
	i18n.t('guide.bandGames', band.gameCount),
	band.favoriteCount > 0 ? i18n.t('guide.bandFavorites', band.favoriteCount) : '',
].filter(Boolean).join(' · ');

import { i18n } from '#i18n';
import type { guideBand } from './guideHeat';

const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const fiveMinutesMs = 5 * 60_000;

export const formatGuideTime = (ms: number, locale?: string): string => (
	new Date(ms).toLocaleTimeString(locale, timeOptions)
);

export const formatBandRange = (fromMs: number, toMs: number, locale?: string): string => (
	new Intl.DateTimeFormat(locale, timeOptions).formatRange(
		Math.floor(fromMs / fiveMinutesMs) * fiveMinutesMs,
		Math.ceil(toMs / fiveMinutesMs) * fiveMinutesMs,
	)
);

export const bandLabel = (band: guideBand, locale?: string): string => [
	formatBandRange(band.fromMs, band.toMs, locale),
	i18n.t('guide.bandGames', band.gameCount),
	band.favoriteCount > 0 ? i18n.t('guide.bandFavorites', band.favoriteCount) : '',
].filter(Boolean).join(' · ');

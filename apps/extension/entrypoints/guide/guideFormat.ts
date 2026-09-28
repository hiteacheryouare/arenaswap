import { i18n } from '#i18n';
import type { guideBand } from './guideHeat';

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

// A 12-hour reader gets '7 PM' on the axis, the way a printed schedule reads. A 24-hour one keeps
// the minutes: '19' on its own could be anything.
const hourFormat = timeFormat.resolvedOptions().hourCycle?.startsWith('h1')
	? new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
	: timeFormat;

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export const formatGuideTime = (ms: number): string => timeFormat.format(ms);

export const formatHourMark = (ms: number): string => hourFormat.format(ms);

export const formatDayDate = (ms: number): string => dayFormat.format(ms);

// The locale's own range, so '7:25 – 7:40 PM' prints its period once and a German reader gets
// '19:25–19:40 Uhr'.
export const formatGuideRange = (fromMs: number, toMs: number): string => timeFormat.formatRange(fromMs, toMs);

// Finishes the sentence the switch's label starts: 'Best time to watch' then '7:25 – 7:40 PM, 5 games'.
export const bandLabel = (band: guideBand): string => [
	formatGuideRange(band.fromMs, band.toMs),
	i18n.t('guide.bandGames', band.gameCount),
	band.favoriteCount > 0 ? i18n.t('guide.bandFavorites', band.favoriteCount) : '',
].filter(Boolean).join(', ');

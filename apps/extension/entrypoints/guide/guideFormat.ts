import { i18n } from '#i18n';
import type { guideBand } from './guideHeat';

export const formatGuideTime = (ms: number): string => (
	new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
);

// The whole sentence back, minus its opening phrase — which is the label on the switch immediately
// to its left, so the header still reads 'Best time to watch · 3:47 PM–4:17 PM · 3 games' end to end
// without printing that phrase twice. Assembled from the parts that are present rather than written
// inline with separators, so a missing piece cannot leave an orphan '·'.
export const bandLabel = (band: guideBand): string => [
	`${formatGuideTime(band.fromMs)}–${formatGuideTime(band.toMs)}`,
	i18n.t('guide.bandGames', band.gameCount),
	band.favoriteCount > 0 ? i18n.t('guide.bandFavorites', band.favoriteCount) : '',
].filter(Boolean).join(' · ');

import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import HoverTooltip from '@arenaswap/ui/src/components/hoverTooltip';
import { OddsProvider, oddsSummary } from './gameCardShared';
import { conditionIcon, formatTemperature } from './weatherUtils';
import type { BettingDisplayPrefs, WeatherDisplayPrefs } from './gameCardTypes';

interface gameInfoPanelProps {
	game: Game;
	bettingPrefs: BettingDisplayPrefs;
	weatherPrefs: WeatherDisplayPrefs;
}

const InfoRow = ({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) => (
	<div className='game-info-row'>
		<i className={`bi ${icon} game-info-icon`} aria-hidden='true' />
		<span className='game-info-label'>{label}</span>
		<div className='game-info-value'>{children}</div>
	</div>
);

const GameInfoPanel = ({ game, bettingPrefs, weatherPrefs }: gameInfoPanelProps) => {
	const networks = game.broadcasts?.join(' • ');
	const venueName = game.venueName;
	const venueLocation = game.venueLocation;
	const hasVenue = Boolean(venueName || venueLocation);
	const weather = game.weather;
	const bettingOn = bettingPrefs.bettingEnabled;
	const odds = bettingOn ? oddsSummary(game) : null;
	const hasOddsProvider = bettingOn && Boolean(game.odds?.provider?.name);
	if (!networks && !hasVenue && !weather && !odds && !hasOddsProvider) return null;

	// Conditions belong to the venue, so they ride in its row rather than claiming a line of their
	// own. A dome game has no weather, and a neutral site may arrive with no venue we know.
	const conditions = weather && {
		icon: conditionIcon(weather.conditionLabel),
		text: `${weather.conditionLabel} · ${formatTemperature(weather.temperatureF, weatherPrefs.temperatureUnit)}`,
	};

	return (
		<section className='game-info-panel'>
			<div className='game-info-heading'>{i18n.t('detail.gameInfoHeading')}</div>

			{networks && (
				<InfoRow icon='bi-broadcast' label={i18n.t('detail.infoWatch')}>
					<span className='game-info-value-strong'>{networks}</span>
				</InfoRow>
			)}

			{hasVenue && (
				<InfoRow icon='bi-geo-alt' label={i18n.t('detail.infoVenue')}>
					{venueName && <div className='game-info-venue-name'>{venueName}</div>}
					{venueLocation && <div className='game-info-venue-location'>{venueLocation}</div>}
					{conditions && (
						<div className='game-info-weather'>
							<i className={`bi ${conditions.icon}`} aria-hidden='true' />
							<span>{conditions.text}</span>
						</div>
					)}
				</InfoRow>
			)}

			{!hasVenue && conditions && (
				<InfoRow icon={conditions.icon} label={i18n.t('detail.infoWeather')}>
					<span>{conditions.text}</span>
				</InfoRow>
			)}

			{(odds || hasOddsProvider) && (
				<InfoRow icon='bi-graph-up' label={i18n.t('detail.infoLine')}>
					{odds && <span>{odds}</span>}
					{hasOddsProvider && (
						// Attribution rides at the end of the line it describes instead of spending a
						// row of its own; the tooltip carries the wording a visible label used to,
						// provider name included so its trailing colon still introduces something.
						<HoverTooltip
							className='game-info-attribution'
							text={`${i18n.t('gameCard.oddsProvidedBy')} ${game.odds!.provider!.name}`}
						>
							<OddsProvider game={game} dark />
						</HoverTooltip>
					)}
				</InfoRow>
			)}
		</section>
	);
};

export default GameInfoPanel;

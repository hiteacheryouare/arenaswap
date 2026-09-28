import { i18n } from '#i18n';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Game } from '@arenaswap/core/types';
import { oddsLine } from '@arenaswap/ui/src/components/boardSituation';
import HoverTooltip from '@arenaswap/ui/src/components/hoverTooltip';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';
import { conditionIcon, formatTemperature } from './weatherUtils';
import type { BettingDisplayPrefs, WeatherDisplayPrefs } from '@arenaswap/ui/src/components/displayPrefs';

interface gameInfoPanelProps {
	game: Game;
	bettingPrefs: BettingDisplayPrefs;
	weatherPrefs: WeatherDisplayPrefs;
	// Wall-clock length in minutes. Only a finished game has one, and only in the leagues that
	// report it, so the row it feeds is absent rather than blank.
	gameDurationMins?: number | null;
}

// Our sources publish no completion timestamp, so the only honest finish time is the start they
// did publish plus the duration they did publish. Both have to be there.
const finishedAt = (startTime: string | undefined, durationMins: number | null | undefined): string | null => {
	if (!startTime || !durationMins) return null;
	const startMs = new Date(startTime).getTime();
	if (!Number.isFinite(startMs)) return null;
	return new Date(startMs + (durationMins * 60 * 1000))
		.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
	<div className='game-info-row'>
		<dt className='game-info-label'>{label}</dt>
		<dd className='game-info-value'>{children}</dd>
	</div>
);

const Conditions = ({ weather, unit, className }: { weather: NonNullable<Game['weather']>; unit: WeatherDisplayPrefs['temperatureUnit']; className: string }) => (
	<span className={className}>
		<i className={`bi ${conditionIcon(weather.conditionLabel)}`} aria-hidden='true' />
		{weather.conditionLabel}, {formatTemperature(weather.temperatureF, unit)}
	</span>
);

// The sportsbook's own mark in the theme it was drawn for, or its name when the mark won't load.
const OddsProviderMark = ({ game }: { game: Game }) => {
	const theme = useDocumentTheme();
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const provider = game.odds?.provider;
	if (!provider?.name) return null;
	const logoUrl = theme === 'dark' ? provider.darkLogoUrl ?? provider.logoUrl : provider.logoUrl ?? provider.darkLogoUrl;
	if (logoUrl && failedSrc !== logoUrl) {
		return <img src={logoUrl} alt={provider.name} onError={() => setFailedSrc(logoUrl)} height={12} className='odds-provider-logo' />;
	}
	return <span className='game-info-provider-name'>{provider.name}</span>;
};

const GameInfoPanel = ({ game, bettingPrefs, weatherPrefs, gameDurationMins }: gameInfoPanelProps) => {
	const networks = game.broadcasts?.join(', ');
	const venueName = game.venueName;
	const venueLocation = game.venueLocation;
	const hasVenue = Boolean(venueName || venueLocation);
	const weather = game.weather;
	const bettingOn = bettingPrefs.bettingEnabled;
	const odds = bettingOn ? oddsLine(game) : null;
	const hasOddsProvider = bettingOn && Boolean(game.odds?.provider?.name);
	// Filled in the moment the status flips to final, so its presence is the gate.
	const attendance = game.attendance;
	const endedAt = finishedAt(game.startTime, gameDurationMins);
	if (!networks && !hasVenue && !weather && !odds && !hasOddsProvider && attendance === undefined && !endedAt) return null;

	return (
		<section className='card dt-card game-info-panel' aria-labelledby='dt-info-title'>
			<h3 className='dt-card-title game-info-heading' id='dt-info-title'>{i18n.t('detail.gameInfoHeading')}</h3>
			<dl className='game-info-list'>
				{networks && (
					<InfoRow label={i18n.t('detail.infoWatch')}>
						<span className='game-info-value-strong'>{networks}</span>
					</InfoRow>
				)}

				{/* Conditions belong to the building, so they ride under it rather than taking a row.
				    A dome has none, and a neutral site may arrive with no venue we know. */}
				{hasVenue && (
					<InfoRow label={i18n.t('detail.infoVenue')}>
						{venueName && <span className='game-info-venue-name'>{venueName}</span>}
						{venueLocation && <small className='game-info-venue-location'>{venueLocation}</small>}
						{weather && <Conditions weather={weather} unit={weatherPrefs.temperatureUnit} className='game-info-weather' />}
					</InfoRow>
				)}

				{!hasVenue && weather && (
					<InfoRow label={i18n.t('detail.infoWeather')}>
						<Conditions weather={weather} unit={weatherPrefs.temperatureUnit} className='game-info-conditions' />
					</InfoRow>
				)}

				{endedAt && (
					<InfoRow label={i18n.t('detail.infoEnded')}>
						<span className='game-info-value-strong num'>{endedAt}</span>
					</InfoRow>
				)}

				{attendance !== undefined && (
					<InfoRow label={i18n.t('detail.infoAttendance')}>
						<span className='game-info-value-strong num'>{attendance.toLocaleString()}</span>
					</InfoRow>
				)}

				{(odds || hasOddsProvider) && (
					<InfoRow label={i18n.t('detail.infoLine')}>
						<span className='game-info-odds'>
							{odds && <span className='num'>{odds}</span>}
							{hasOddsProvider && (
								<HoverTooltip
									className='game-info-attribution'
									text={`${i18n.t('gameCard.oddsProvidedBy')} ${game.odds!.provider!.name}`}
								>
									<OddsProviderMark game={game} />
								</HoverTooltip>
							)}
						</span>
					</InfoRow>
				)}
			</dl>
			<p className='dt-source'>{i18n.t('detail.sourcesFootnote')}</p>
		</section>
	);
};

export default GameInfoPanel;

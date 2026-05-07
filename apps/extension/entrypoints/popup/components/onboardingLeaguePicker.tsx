import { useState } from 'react';
import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap, SportType } from '@arenaswap/core/types';
import { leaguesBySportType, sportTypeLabels, sportTypeOrder } from '../popupHelpers';

interface onboardingLeaguePickerProps {
	selectedLeagues: Set<LeagueId>;
	leagueLogos: LeagueLogoMap;
	onToggleLeague: (id: LeagueId) => void;
	onToggleSport: (sport: SportType, selectAll: boolean) => void;
	onNext: () => void;
}

type leagueConfig = (typeof leagueConfigs)[number];

const sportEmojis: Record<SportType, string> = {
	basketball: '🏀',
	football: '🏈',
	hockey: '🏒',
	baseball: '⚾',
	soccer: '⚽',
};

const LeagueLogo = ({ league, logos }: { league: leagueConfig; logos: LeagueLogoMap }) => {
	const [imageFailed, setImageFailed] = useState(false);
	const logoUrl = resolveLeagueLogoUrl(league.id, logos[league.id]);
	const initials = league.label.split(/\s+/).map(p => p[0] ?? '').join('').slice(0, 3).toUpperCase();
	if (imageFailed) {
		return (
			<span className='league-toggle-logo league-toggle-logo-fallback d-inline-flex align-items-center justify-content-center fw-bold'>
				{initials}
			</span>
		);
	}
	return (
		<img
			src={logoUrl}
			alt={`${league.label} logo`}
			className='league-toggle-logo'
			loading='lazy'
			onError={() => setImageFailed(true)}
		/>
	);
};

const onboardingLeaguePicker = ({
	selectedLeagues,
	leagueLogos,
	onToggleLeague,
	onToggleSport,
	onNext,
}: onboardingLeaguePickerProps) => (
	<div className='popup-container'>
		<div className='mb-1 text-body-secondary' style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>STEP 1 OF 2</div>
		<h2 className='fw-bold lh-sm mb-3' style={{ fontSize: '1.1rem' }}>Which sports do you watch?</h2>

		<div>
			{(Object.keys(sportTypeOrder) as SportType[])
				.sort((a, b) => sportTypeOrder[a] - sportTypeOrder[b])
				.map(sportType => {
					const leagues = leaguesBySportType[sportType];
					const allSelected = leagues.every(l => selectedLeagues.has(l.id));
					return (
						<div key={sportType} className='league-toggle-group'>
							<div className='d-flex align-items-center justify-content-between'>
								<div className='fw-semibold text-body-secondary setting-toggle-label'>
									{sportEmojis[sportType]} {sportTypeLabels[sportType]}
								</div>
								<div className='d-flex align-items-center gap-1'>
									<label
										className='text-body-secondary'
										style={{ fontSize: '0.7rem' }}
										htmlFor={`sport-all-${sportType}`}
									>
										All
									</label>
									<div className='form-check form-switch mb-0'>
										<input
											className='form-check-input'
											type='checkbox'
											id={`sport-all-${sportType}`}
											checked={allSelected}
											onChange={() => onToggleSport(sportType, !allSelected)}
										/>
									</div>
								</div>
							</div>
							{leagues.map(league => (
								<div key={league.id} className='d-flex align-items-center justify-content-between gap-2 mt-1 league-toggle-row' style={{ paddingLeft: '0.75rem' }}>
									<div className='d-flex align-items-center gap-2 min-w-0'>
										<LeagueLogo league={league} logos={leagueLogos} />
										<label className='fw-semibold text-body mb-0 lh-sm league-toggle-label' htmlFor={`onb-league-${league.id}`}>
											{league.label}
										</label>
									</div>
									<div className='form-check form-switch mb-0'>
										<input
											className='form-check-input'
											type='checkbox'
											id={`onb-league-${league.id}`}
											checked={selectedLeagues.has(league.id)}
											onChange={() => onToggleLeague(league.id)}
										/>
									</div>
								</div>
							))}
						</div>
					);
				})}
		</div>

		<button
			className='btn btn-primary w-100 mt-4'
			onClick={onNext}
			disabled={selectedLeagues.size === 0}
		>
			Next →
		</button>
	</div>
);

export default onboardingLeaguePicker;

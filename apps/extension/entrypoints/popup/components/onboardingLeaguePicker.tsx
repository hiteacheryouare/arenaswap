import { useState } from 'react';
import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap, SportType } from '@arenaswap/core/types';
import { leaguesBySportType, sportTypeLabels, sportTypeOrder } from '../popupHelpers';

interface onboardingLeaguePickerProps {
	selectedLeagues: Set<LeagueId>;
	leagueLogos: LeagueLogoMap;
	onToggleLeague: (id: LeagueId) => void;
	onToggleSport: (sport: SportType, selectAll: boolean) => void;
	onBack: () => void;
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
			className='onb-league-logo'
			loading='eager'
			onError={() => setImageFailed(true)}
		/>
	);
};

const onboardingLeaguePicker = ({
	selectedLeagues,
	leagueLogos,
	onToggleLeague,
	onToggleSport,
	onBack,
	onNext,
}: onboardingLeaguePickerProps) => (
	<div className='popup-container'>
		<div className='d-flex align-items-center mb-1'>
			<button className='btn btn-link btn-sm p-0 text-body-secondary small' onClick={onBack}>
				<i className='bi bi-arrow-left me-1' />Back
			</button>
			<span className='small text-body-secondary text-uppercase ms-auto'>Step 2 of 3</span>
		</div>
		<div className='fw-bold lh-sm mb-3 fs-5'>Which sports do you watch?</div>

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
								<div className='form-check mb-0'>
									<input
										className='form-check-input'
										type='checkbox'
										id={`sport-all-${sportType}`}
										checked={allSelected}
										onChange={() => onToggleSport(sportType, !allSelected)}
									/>
									<label className='form-check-label small text-body-secondary' htmlFor={`sport-all-${sportType}`}>
										All
									</label>
								</div>
							</div>
							{leagues.map(league => (
								<div key={league.id} className='d-flex align-items-center gap-2 mt-1 ps-3 py-1'>
									<div className='form-check mb-0'>
										<input
											className='form-check-input'
											type='checkbox'
											id={`onb-league-${league.id}`}
											checked={selectedLeagues.has(league.id)}
											onChange={() => onToggleLeague(league.id)}
										/>
									</div>
									<label className='d-flex align-items-center gap-2 min-w-0 mb-0 grow' htmlFor={`onb-league-${league.id}`}>
										<LeagueLogo league={league} logos={leagueLogos} />
										<span className='fw-semibold text-body lh-sm league-toggle-label'>{league.label}</span>
									</label>
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
			Next <i className='bi bi-arrow-right' />
		</button>
	</div>
);

export default onboardingLeaguePicker;

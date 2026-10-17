import { i18n } from '#i18n';
import { resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap, SportType } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { toLeagueInitials, type leagueConfig } from './leagueLogo';
import { leaguesBySportType, sportTypeLabels, sportTypeOrder } from '../popupHelpers';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';

interface onboardingLeaguePickerProps {
	selectedLeagues: Set<LeagueId>;
	leagueLogos: LeagueLogoMap;
	onToggleLeague: (id: LeagueId) => void;
	onToggleSport: (sport: SportType, selectAll: boolean) => void;
	onBack: () => void;
	onNext: () => void;
}

const sportEmojis: Record<SportType, string> = {
	basketball: '🏀',
	football: '🏈',
	hockey: '🏒',
	baseball: '⚾',
	softball: '🥎',
	soccer: '⚽',
};

const LeagueLogo = ({ league, logos }: { league: leagueConfig; logos: LeagueLogoMap }) => (
	<Crest
		logo={resolveLeagueLogoUrl(league.id, logos[league.id])}
		abbreviation={toLeagueInitials(league)}
		className='onb-league-logo'
		loading='eager'
	/>
);

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
			<button className='btn btn-link btn-sm p-0 fg-secondary small' onClick={onBack}>
				<i className='bi bi-arrow-left me-1' />{i18n.t('leaguePicker.back')}
			</button>
			<FlowStepper step={2} total={3} className='ms-auto' />
		</div>
		<div className='fw-bold lh-xs mb-5 fs-lg popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('leaguePicker.title')}</div>

		<div>
			{(Object.keys(sportTypeOrder) as SportType[])
				.toSorted((a, b) => sportTypeOrder[a] - sportTypeOrder[b])
				.map(sportType => {
					const leagues = leaguesBySportType[sportType];
					const allSelected = leagues.every(l => selectedLeagues.has(l.id));
					return (
						<div key={sportType} className='league-toggle-group'>
							<div className='d-flex align-items-center justify-content-between'>
								<div className='fw-semibold fg-secondary setting-toggle-label'>
									{sportEmojis[sportType]} {sportTypeLabels[sportType]}
								</div>
								<div className='form-field'>
									<input
										className='check'
										type='checkbox'
										id={`sport-all-${sportType}`}
										checked={allSelected}
										onChange={() => onToggleSport(sportType, !allSelected)}
									/>
									<label className='small fg-secondary align-self-center' htmlFor={`sport-all-${sportType}`}>
										{i18n.t('leaguePicker.all')}
									</label>
								</div>
							</div>
							{leagues.map(league => (
								<div key={league.id} className='d-flex align-items-center gap-5 mt-1 ps-5 py-1'>
									<input
										className='check'
										type='checkbox'
										id={`onb-league-${league.id}`}
										checked={selectedLeagues.has(league.id)}
										onChange={() => onToggleLeague(league.id)}
									/>
									<label className='d-flex align-items-center gap-3 min-w-0 mb-0' htmlFor={`onb-league-${league.id}`}>
										<LeagueLogo league={league} logos={leagueLogos} />
										<span className='fw-semibold fg-body lh-xs league-toggle-label'>{league.label}</span>
									</label>
								</div>
							))}
						</div>
					);
				})}
		</div>

		<button
			className='btn btn-solid theme-primary w-100 mt-7'
			onClick={onNext}
			disabled={selectedLeagues.size === 0}
		>
			{i18n.t('leaguePicker.next')} <i className='bi bi-arrow-right' />
		</button>
	</div>
);

export default onboardingLeaguePicker;

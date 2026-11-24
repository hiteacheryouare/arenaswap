import { i18n } from '#i18n';
import { isCollegeLeagueId, resolveCollegeFilter } from '@arenaswap/core/constants';
import type { SportType, CollegeLeagueId } from '@arenaswap/core/types';
import ToggleSwitch from '@arenaswap/ui/src/components/toggleSwitch';
import CollegeLeagueButton from '../collegeLeagueButton';
import LeagueLogo from '../leagueLogo';
import leagueOffseasonLabel from '../leagueOffseasonLabel';
import { sportTypeLabels, sportTypeOrder } from '../../popupHelpers';
import { leaguesBySportType } from '../../../../utils/leagueOrder';
import type { setupViewProps } from '../setupView';

interface settingsLeaguesPageProps extends Pick<setupViewProps, 'prefs' | 'prefsLoaded' | 'leagueLogos' | 'leagueSchedules' | 'onToggleSport' | 'onToggleLeague'> {
	noLeaguesSelected: boolean;
	now: number;
	openCollegeLeague: (leagueId: CollegeLeagueId) => void;
}

const settingsLeaguesPage = ({
	prefs, prefsLoaded, leagueLogos, leagueSchedules, onToggleSport, onToggleLeague,
	noLeaguesSelected, now, openCollegeLeague,
}: settingsLeaguesPageProps) => (
	<>
		{noLeaguesSelected && (
			<div className='setup-no-leagues-warn mb-3'>
				<i className='bi bi-exclamation-circle me-1' />
				{i18n.t('setup.noLeaguesWarning')}
			</div>
		)}
		{(Object.keys(sportTypeOrder) as SportType[])
			.toSorted((a, b) => sportTypeOrder[a] - sportTypeOrder[b])
			.map(sportType => {
				const leagues = leaguesBySportType[sportType];
				const allSelected = leagues.every(l => prefs.enabledLeagues.includes(l.id));
				return (
					<div key={sportType} className='league-toggle-group'>
						<div className='d-flex align-items-center justify-content-between'>
							<div className='fw-semibold fg-secondary setting-toggle-label'>{sportTypeLabels[sportType]}</div>
							<button
								type='button'
								className='btn btn-outline theme-accent btn-sm px-3 py-0 small'
								onClick={() => onToggleSport(sportType, !allSelected)}
								disabled={!prefsLoaded}
							>
								{allSelected ? i18n.t('setup.selectNone') : i18n.t('setup.selectAll')}
							</button>
						</div>
						<div className='league-toggle-grid'>
							{leagues.map(league => {
								const offseasonLabel = leagueOffseasonLabel(leagueSchedules[league.id], now);
								const labelBody = (
									<>
										<span className='d-block fw-semibold fg-body'>{league.label}</span>
										{offseasonLabel && <span className='d-block fg-secondary league-offseason'>{offseasonLabel}</span>}
									</>
								);
								return (
									<div key={league.id} className='league-toggle-row'>
										<div className='league-toggle-row-top'>
											<LeagueLogo league={league} logos={leagueLogos} />
											<ToggleSwitch
												id={`league-${league.id}`}
												checked={prefs.enabledLeagues.includes(league.id)}
												onChange={() => onToggleLeague(league.id)}
												disabled={!prefsLoaded}
												aria-label={isCollegeLeagueId(league.id) ? league.label : undefined}
											/>
										</div>
										{isCollegeLeagueId(league.id) ? (
											<CollegeLeagueButton
												leagueId={league.id}
												leagueLabel={league.label}
												filter={resolveCollegeFilter(prefs.collegeFilters, league.id)}
												onOpen={() => openCollegeLeague(league.id as CollegeLeagueId)}
											>
												{labelBody}
											</CollegeLeagueButton>
										) : (
											<label className='mb-0 league-toggle-label' htmlFor={`league-${league.id}`}>{labelBody}</label>
										)}
									</div>
								);
							})}
						</div>
					</div>
				);
			})}
	</>
);

export default settingsLeaguesPage;

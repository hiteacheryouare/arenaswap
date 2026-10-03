import { useEffect, useState, type ReactNode } from 'react';
import { i18n } from '#i18n';
import { logWarn } from '@arenaswap/core';
import { collegeDivisions, collegeLeaguesWithOtherConferences, isConferenceCovered, otherConferenceKey } from '@arenaswap/core/constants';
import type { CollegeFilter, CollegeLeagueId, ConferenceDirectory, ConferenceEntry, LeagueLogoMap } from '@arenaswap/core/types';
import ConferenceCrest from '@arenaswap/ui/src/components/conferenceCrest';
import { loadConferenceDirectory } from '../../../utils/collegeConferences';
import { collegeDivisionLabel, collegeDivisionShortLabel, collegeRankedLabel, collegeTitleRoundsLabel } from './collegeFilterLabels';
import LeagueLogo, { type leagueConfig } from './leagueLogo';

interface collegeFilterPageProps {
	league: leagueConfig & { id: CollegeLeagueId };
	leagueLogos: LeagueLogoMap;
	filter: CollegeFilter;
	disabled: boolean;
	onChange: (filter: CollegeFilter) => void;
}

interface directoryResult {
	requestKey: string;
	directory?: ConferenceDirectory;
	failed?: boolean;
}

// `--as-tertiary-bg` in each theme, which is what a tile is painted with.
const tileSurfaces = { dark: '#161b22', light: '#f3f5f8' };

// Loading is whatever has no answer for the current request yet, so a retry or a different league
// reads as loading without a state reset of its own.
const useConferenceDirectory = (leagueId: CollegeLeagueId) => {
	const [attempt, setAttempt] = useState(0);
	const requestKey = `${leagueId}:${attempt}`;
	const [result, setResult] = useState<directoryResult>();

	useEffect(() => {
		let cancelled = false;
		loadConferenceDirectory(leagueId)
			.then(directory => {
				if (!cancelled) setResult({ requestKey, directory });
			})
			.catch(err => {
				logWarn(`Could not load the ${leagueId} conference list.`, err);
				if (!cancelled) setResult({ requestKey, failed: true });
			});
		return () => { cancelled = true; };
	}, [leagueId, requestKey]);

	const current = result?.requestKey === requestKey ? result : undefined;
	return {
		directory: current?.directory,
		status: current?.directory ? 'ready' : current?.failed ? 'failed' : 'loading',
		retry: () => setAttempt(count => count + 1),
	};
};

const toggled = (list: string[], value: string): string[] => (
	list.includes(value) ? list.filter(item => item !== value) : [...list, value]
);

const crestInitials = (shortName: string): string => shortName.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 4).toUpperCase();

const byShortName = (a: ConferenceEntry, b: ConferenceEntry): number => a.shortName.localeCompare(b.shortName);

interface filterTileProps {
	id: string;
	crest: ReactNode;
	label: string;
	title?: string;
	checked: boolean;
	disabled: boolean;
	coveredHint?: string;
	onChange: () => void;
}

const FilterTile = ({ id, crest, label, title, checked, disabled, coveredHint, onChange }: filterTileProps) => (
	<div className={`league-toggle-row${coveredHint ? ' is-covered' : ''}`}>
		<div className='league-toggle-row-top'>
			{crest}
			<div className='form-check form-switch mb-0'>
				<input
					className='form-check-input'
					type='checkbox'
					id={id}
					checked={checked}
					onChange={onChange}
					disabled={disabled || Boolean(coveredHint)}
					aria-describedby={coveredHint ? `${id}-covered` : undefined}
				/>
			</div>
		</div>
		<label className='mb-0 league-toggle-label' htmlFor={id} title={title}>
			<span className='d-block fw-semibold text-body'>{label}</span>
		</label>
		{coveredHint && <span id={`${id}-covered`} className='visually-hidden'>{coveredHint}</span>}
	</div>
);

const CollegeFilterPage = ({ league, leagueLogos, filter, disabled, onChange }: collegeFilterPageProps) => {
	const leagueId = league.id;
	const { status, directory, retry } = useConferenceDirectory(leagueId);
	const divisions = collegeDivisions[leagueId];
	const nothingPicked = filter.divisions.length === 0 && filter.conferences.length === 0 && !filter.ranked;
	const conferenceDivisions = divisions.filter(division => division.hasConferences);
	const offersOther = collegeLeaguesWithOtherConferences.includes(leagueId);

	const conferenceTile = (id: string, crest: ReactNode, label: string, divisionKey: string, title?: string) => {
		const covered = isConferenceCovered(leagueId, filter, divisionKey);
		const division = divisions.find(candidate => candidate.key === divisionKey);
		return (
			<FilterTile
				key={id}
				id={`college-conference-${id}`}
				crest={crest}
				label={label}
				title={title}
				checked={covered || filter.conferences.includes(id)}
				disabled={disabled}
				coveredHint={covered && division ? i18n.t('collegeFilter.coveredBy', { division: collegeDivisionShortLabel(division.name) }) : undefined}
				onChange={() => onChange({ ...filter, conferences: toggled(filter.conferences, id) })}
			/>
		);
	};

	return (
		<>
			<div className='league-toggle-group'>
				<div className='fw-semibold text-body-secondary setting-toggle-label'>{i18n.t('collegeFilter.divisionsHeading')}</div>
				<div className='league-toggle-grid'>
					{divisions.map(division => (
						<FilterTile
							key={division.key}
							id={`college-division-${division.key}`}
							crest={<LeagueLogo league={league} logos={leagueLogos} />}
							label={collegeDivisionLabel(division.name)}
							checked={filter.divisions.includes(division.key)}
							disabled={disabled}
							onChange={() => onChange({ ...filter, divisions: toggled(filter.divisions, division.key) })}
						/>
					))}
					<FilterTile
						id='college-ranked'
						crest={<span className='league-toggle-logo college-filter-icon' aria-hidden='true'><i className='bi bi-trophy' /></span>}
						label={collegeRankedLabel(leagueId)}
						checked={filter.ranked}
						disabled={disabled}
						onChange={() => onChange({ ...filter, ranked: !filter.ranked })}
					/>
					<FilterTile
						id='college-title-rounds'
						crest={<span className='league-toggle-logo college-filter-icon' aria-hidden='true'><i className='bi bi-diagram-3' /></span>}
						label={collegeTitleRoundsLabel(leagueId)}
						title={i18n.t('collegeFilter.titleRoundsHint')}
						checked={filter.titleRounds}
						disabled={disabled}
						onChange={() => onChange({ ...filter, titleRounds: !filter.titleRounds })}
					/>
				</div>
			</div>

			{!directory && (
				<div className='college-filter-status text-body-secondary' role='status'>
					{status === 'failed' ? (
						<>
							{i18n.t('collegeFilter.loadFailed')}{' '}
							<button type='button' className='btn btn-link btn-sm p-0 align-baseline college-filter-retry' onClick={retry}>
								{i18n.t('collegeFilter.retry')}
							</button>
						</>
					) : i18n.t('collegeFilter.loading')}
				</div>
			)}

			{directory && conferenceDivisions.map((division, index) => {
				const conferences = directory.conferences.filter(conference => conference.divisionKey === division.key).toSorted(byShortName);
				const isLast = index === conferenceDivisions.length - 1;
				return (
					<div key={division.key} className='league-toggle-group'>
						<div className='fw-semibold text-body-secondary setting-toggle-label'>
							{divisions.length === 1
								? i18n.t('collegeFilter.conferencesHeading')
								: i18n.t('collegeFilter.divisionConferencesHeading', { division: collegeDivisionShortLabel(division.name) })}
						</div>
						<div className='league-toggle-grid'>
							{conferences.map(conference => conferenceTile(
								conference.id,
								<ConferenceCrest
									slug={conference.crestSlug}
									abbreviation={crestInitials(conference.shortName)}
									surfaces={tileSurfaces}
									discClassName='college-crest-disc'
									crestClassName='college-crest'
								/>,
								conference.shortName,
								conference.divisionKey,
								conference.name,
							))}
							{offersOther && isLast && conferenceTile(
								otherConferenceKey,
								<span className='league-toggle-logo college-filter-icon' aria-hidden='true'><i className='bi bi-three-dots' /></span>,
								i18n.t('collegeFilter.otherConferences'),
								division.key,
							)}
						</div>
					</div>
				);
			})}

			{nothingPicked && (
				<div className='setup-no-leagues-warn mt-2 mb-1'>
					<i className='bi bi-exclamation-circle me-1' />
					{i18n.t('collegeFilter.nothingPicked', { league: league.label })}
				</div>
			)}
		</>
	);
};

export default CollegeFilterPage;

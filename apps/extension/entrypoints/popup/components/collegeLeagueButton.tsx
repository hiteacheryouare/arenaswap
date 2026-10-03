import { useEffect, useState, type ReactNode } from 'react';
import { i18n } from '#i18n';
import type { CollegeFilter, CollegeLeagueId, ConferenceDirectory } from '@arenaswap/core/types';
import { readConferenceDirectory } from '../../../utils/collegeConferences';
import { collegeFilterSummary } from './collegeFilterLabels';

interface collegeLeagueButtonProps {
	leagueId: CollegeLeagueId;
	leagueLabel: string;
	filter: CollegeFilter;
	children: ReactNode;
	onOpen: () => void;
}

// Takes the place of a college league's label on the Leagues page. The switch beside it still turns
// the league on and off; this opens the league's division and conference picker.
const CollegeLeagueButton = ({ leagueId, leagueLabel, filter, children, onOpen }: collegeLeagueButtonProps) => {
	// Only what is already cached, for conference names. Opening the picker is what fetches.
	const [directory, setDirectory] = useState<ConferenceDirectory>();
	useEffect(() => {
		let cancelled = false;
		readConferenceDirectory(leagueId)
			.then(cached => { if (!cancelled) setDirectory(cached); })
			.catch(() => {});
		return () => { cancelled = true; };
	}, [leagueId]);

	return (
		<button
			type='button'
			className='college-league-open league-toggle-label'
			onClick={onOpen}
			title={i18n.t('collegeFilter.open', { league: leagueLabel })}
		>
			<span className='d-block'>
				{children}
				<span className='d-block text-body-secondary college-league-summary'>{collegeFilterSummary(leagueId, filter, directory)}</span>
			</span>
			<i className='bi bi-chevron-right college-league-chevron' aria-hidden='true' />
		</button>
	);
};

export default CollegeLeagueButton;

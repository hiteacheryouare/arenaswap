import { i18n } from '#i18n';
import { collegeDivisions, collegeRankedPollSize, isConferenceCovered, otherConferenceKey } from '@arenaswap/core/constants';
import type { CollegeDivisionName } from '@arenaswap/core/constants';
import type { CollegeFilter, CollegeLeagueId, ConferenceDirectory } from '@arenaswap/core/types';

export const collegeDivisionLabel = (name: CollegeDivisionName): string => ({
	fbs: i18n.t('collegeFilter.division.fbs'),
	fcs: i18n.t('collegeFilter.division.fcs'),
	d1: i18n.t('collegeFilter.division.d1'),
	d2: i18n.t('collegeFilter.division.d2'),
	d3: i18n.t('collegeFilter.division.d3'),
})[name];

export const collegeDivisionShortLabel = (name: CollegeDivisionName): string => ({
	fbs: i18n.t('collegeFilter.divisionShort.fbs'),
	fcs: i18n.t('collegeFilter.divisionShort.fcs'),
	d1: i18n.t('collegeFilter.divisionShort.d1'),
	d2: i18n.t('collegeFilter.divisionShort.d2'),
	d3: i18n.t('collegeFilter.divisionShort.d3'),
})[name];

export const collegeRankedLabel = (leagueId: CollegeLeagueId): string => (
	i18n.t('collegeFilter.ranked', { count: String(collegeRankedPollSize[leagueId]) })
);

const maxNamedConferences = 2;

// One line under the league's name on the Leagues page: what the picker currently lets through.
export const collegeFilterSummary = (leagueId: CollegeLeagueId, filter: CollegeFilter, directory?: ConferenceDirectory): string => {
	const divisions = collegeDivisions[leagueId];
	if (divisions.length === 1 && filter.divisions.length > 0) return i18n.t('collegeFilter.summaryAll');

	const parts = divisions
		.filter(division => filter.divisions.includes(division.key))
		.map(division => collegeDivisionShortLabel(division.name));
	if (filter.ranked) parts.push(collegeRankedLabel(leagueId));

	const conferences = filter.conferences
		.map(id => ({ id, entry: directory?.conferences.find(conference => conference.id === id) }))
		.filter(({ entry }) => !entry || !isConferenceCovered(leagueId, filter, entry.divisionKey));
	if (parts.length === 0 && conferences.length === 0) return i18n.t('collegeFilter.summaryNothing');

	const names = conferences.map(({ id, entry }) => (id === otherConferenceKey ? i18n.t('collegeFilter.otherConferences') : entry?.shortName));
	if (parts.length === 0 && names.length <= maxNamedConferences && names.every(name => name !== undefined)) {
		return names.join(', ');
	}
	if (conferences.length > 0) parts.push(i18n.t('collegeFilter.summaryConferences', conferences.length));
	return parts.join(', ');
};

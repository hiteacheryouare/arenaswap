import type { ReactNode } from 'react';
import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/core';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import SettingsGroup from './settingControls';
import TeamPickerRow from './teamPickerRow';
import { matchesTeamQuery } from '../../../utils/favoriteTeams';
import { leagueLabels, leagueOrder } from '../popupHelpers';

interface teamPickerListProps {
	teams: EspnTeamEntry[];
	// Held by the caller so a pinned section can filter on the same text the league groups do.
	query: string;
	onQueryChange: (query: string) => void;
	isLoading: boolean;
	hasError: boolean;
	selectedFavorites: ReadonlySet<string>;
	onToggleFavorite: (team: EspnTeamEntry) => void;
	onRetry: () => void;
	// Scrolls away with the list. The search box is what has to stay put.
	leading?: ReactNode;
	// Sits above the league groups. Callers drop it while a search runs rather than filtering it.
	pinned?: ReactNode;
}

// A fragment, so the search box and the scrolling list are both children of the caller's column and
// only the list scrolls.
const teamPickerList = ({
	teams, query, onQueryChange, isLoading, hasError, selectedFavorites, onToggleFavorite, onRetry, leading, pinned,
}: teamPickerListProps) => {
	const filteredTeams = teams.filter(team => matchesTeamQuery(team, query));

	const grouped = filteredTeams.reduce<Partial<Record<LeagueId, EspnTeamEntry[]>>>((acc, team) => {
		(acc[team.leagueId] ??= []).push(team);
		return acc;
	}, {});

	const sortedLeagues = (Object.keys(grouped) as LeagueId[]).toSorted(
		(a, b) => (leagueOrder[a] ?? 99) - (leagueOrder[b] ?? 99)
	);

	return (
		<>
			<div className='st-search'>
				<i className='bi bi-search st-search-icon' aria-hidden='true' />
				<input
					type='search'
					className='form-control'
					placeholder={i18n.t('teamPicker.searchPlaceholder')}
					aria-label={i18n.t('teamPicker.searchPlaceholder')}
					autoComplete='off'
					value={query}
					onChange={e => onQueryChange(e.target.value)}
				/>
			</div>

			{/* Always mounted, so what the caller puts above the list survives a failed roster fetch. */}
			<div className='overflow-auto team-pick-scroll'>
				{leading}

				{isLoading && (
					<div className='as-loading' role='status'>
						<div className='spinner-border' aria-hidden='true' />
						<span>{i18n.t('teamPicker.loading')}</span>
					</div>
				)}

				{hasError && !isLoading && (
					<div className='as-empty team-pick-error'>
						<p>{i18n.t('teamPicker.loadError')}</p>
						<div className='as-empty-actions'>
							<button type='button' className='btn btn-quiet btn-sm' onClick={onRetry}>{i18n.t('teamPicker.retry')}</button>
						</div>
					</div>
				)}

				{!isLoading && !hasError && (
					<>
						{pinned}
						{sortedLeagues.map(leagueId => (
							<SettingsGroup key={leagueId} title={leagueLabels[leagueId] ?? leagueId.toUpperCase()}>
								{(grouped[leagueId] ?? []).map(team => (
									<TeamPickerRow
										key={team.id}
										team={team}
										isFavorite={selectedFavorites.has(createFavoriteTeamKey(team.leagueId, team.id))}
										onToggle={() => onToggleFavorite(team)}
									/>
								))}
							</SettingsGroup>
						))}
						{sortedLeagues.length === 0 && query && (
							<p className='st-empty'>{i18n.t('teamPicker.noMatch', { query })}</p>
						)}
					</>
				)}
			</div>
		</>
	);
};

export default teamPickerList;

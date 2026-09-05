import type { ReactNode } from 'react';
import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/core';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
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
	// Onboarding can walk away from a failed load; settings has nowhere to walk to.
	onSkip?: () => void;
	// Scrolls away with the list. The search box is what has to stay put.
	leading?: ReactNode;
	// Sits above the league groups. Callers drop it while a search is running rather than filtering
	// it, so it never competes with the results.
	pinned?: ReactNode;
}

// A fragment rather than a wrapper, so the search box and the scrolling list stay siblings of
// whatever chrome the caller puts around them — onboarding pins its footer against that column.
const teamPickerList = ({
	teams, query, onQueryChange, isLoading, hasError, selectedFavorites, onToggleFavorite, onRetry, onSkip, leading, pinned,
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
			<input
				type='search'
				className='form-control form-control-sm mb-2'
				placeholder={i18n.t('teamPicker.searchPlaceholder')}
				value={query}
				onChange={e => onQueryChange(e.target.value)}
			/>

			{/* The scroll region is always mounted, so whatever the caller puts above the list
			    survives a failed roster fetch — the favorite team bonus has nothing to do with
			    whether ESPN answered. */}
			<div className='overflow-auto'>
				{leading}

				{isLoading && (
					<div className='d-flex justify-content-center align-items-center mt-4 gap-2'>
						<div className='spinner-border spinner-border-sm' role='status'>
							<span className='visually-hidden'>{i18n.t('teamPicker.loading')}</span>
						</div>
						<span className='small text-body-secondary'>{i18n.t('teamPicker.loading')}</span>
					</div>
				)}

				{hasError && !isLoading && (
					<div className='text-center mt-3'>
						<div className='small text-danger mb-2'>{i18n.t('teamPicker.loadError')}</div>
						<div className='d-flex justify-content-center gap-2'>
							<button type='button' className='btn btn-sm btn-outline-secondary' onClick={onRetry}>{i18n.t('teamPicker.retry')}</button>
							{onSkip && <button type='button' className='btn btn-sm btn-link p-0 text-body-secondary' onClick={onSkip}>{i18n.t('teamPicker.skipForNow')}</button>}
						</div>
					</div>
				)}

				{!isLoading && !hasError && (
					<>
						{pinned}
						{sortedLeagues.map(leagueId => (
							<div key={leagueId}>
								<div className='fw-bold text-uppercase popup-section-label mt-2'>
									{leagueLabels[leagueId] ?? leagueId.toUpperCase()}
								</div>
								{(grouped[leagueId] ?? []).map(team => (
									<TeamPickerRow
										key={team.id}
										team={team}
										isFavorite={selectedFavorites.has(createFavoriteTeamKey(team.leagueId, team.id))}
										onToggle={() => onToggleFavorite(team)}
									/>
								))}
							</div>
						))}
						{sortedLeagues.length === 0 && query && (
							<div className='small text-body-secondary text-center mt-3'>
								{i18n.t('teamPicker.noMatch', { query })}
							</div>
						)}
					</>
				)}
			</div>
		</>
	);
};

export default teamPickerList;

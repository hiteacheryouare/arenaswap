import { useMemo, type ReactNode } from 'react';
import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/sideline';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import TeamPickerRow from './teamPickerRow';
import { matchesTeamQuery } from '../../../utils/favoriteTeams';
import { leagueLabels, leagueOrder } from '../popupHelpers';
import { useDisplayLocale } from '@arenaswap/ui/src/components/i18nContext';

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
	// Sits above the league groups. Callers drop it while a search is running rather than filtering
	// it, so it never competes with the results.
	pinned?: ReactNode;
}

// A fragment rather than a wrapper, so the search box and the scrolling list stay siblings of
// whatever chrome the caller puts around them — onboarding pins its footer against that column.
const teamPickerList = ({
	teams, query, onQueryChange, isLoading, hasError, selectedFavorites, onToggleFavorite, onRetry, pinned,
}: teamPickerListProps) => {
	const locale = useDisplayLocale();
	// Kept across renders: with the college leagues on this is well over a thousand teams, and the
	// popup re-renders on every broadcast while Settings is open.
	const groups = useMemo(() => {
		// Our sources list a league's teams in their own order, which reads as no order at all.
		const collator = new Intl.Collator(locale);
		const grouped = teams
			.filter(team => matchesTeamQuery(team, query))
			.reduce<Partial<Record<LeagueId, EspnTeamEntry[]>>>((acc, team) => {
				(acc[team.leagueId] ??= []).push(team);
				return acc;
			}, {});
		return (Object.keys(grouped) as LeagueId[])
			.toSorted((a, b) => (leagueOrder[a] ?? 99) - (leagueOrder[b] ?? 99))
			.map(leagueId => ({
				leagueId,
				teams: (grouped[leagueId] ?? []).toSorted((a, b) => collator.compare(a.name ?? '', b.name ?? '')),
			}));
	}, [teams, query, locale]);

	return (
		<>
			<input
				type='search'
				className='form-control form-control-sm mb-2'
				placeholder={i18n.t('teamPicker.searchPlaceholder')}
				aria-label={i18n.t('teamPicker.searchPlaceholder')}
				value={query}
				onChange={e => onQueryChange(e.target.value)}
			/>

			<div className='overflow-auto'>
				{isLoading && (
					<div className='d-flex flex-column justify-content-center align-items-center mt-4 popup-loading-wrap'>
						<div className='spinner-border popup-loading-spinner' role='status'>
							<span className='visually-hidden'>{i18n.t('teamPicker.loading')}</span>
						</div>
						<div className='mt-2 text-center popup-loading-text'>{i18n.t('teamPicker.loading')}</div>
					</div>
				)}

				{hasError && !isLoading && (
					<div className='text-center mt-3'>
						<div className='small text-danger mb-2'>{i18n.t('teamPicker.loadError')}</div>
						<button type='button' className='btn btn-sm btn-outline-secondary' onClick={onRetry}>{i18n.t('teamPicker.retry')}</button>
					</div>
				)}

				{!isLoading && !hasError && (
					<>
						{pinned}
						{groups.map(({ leagueId, teams: leagueTeams }) => (
							<div key={leagueId}>
								<div className='fw-bold text-uppercase popup-section-label mt-2'>
									{leagueLabels[leagueId] ?? leagueId.toUpperCase()}
								</div>
								{leagueTeams.map(team => (
									<TeamPickerRow
										key={team.id}
										team={team}
										isFavorite={selectedFavorites.has(createFavoriteTeamKey(team.leagueId, team.id))}
										onToggle={() => onToggleFavorite(team)}
									/>
								))}
							</div>
						))}
						{groups.length === 0 && query && (
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

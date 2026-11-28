import { useMemo, type ReactNode } from 'react';
import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/sideline';
import { createFavoriteTeamKey, leagueLabels } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import TeamPickerRow, { type teamList } from './teamPickerRow';
import { matchesTeamQuery } from '../../../utils/favoriteTeams';
import { leagueOrder } from '../../../utils/leagueOrder';
import { useDisplayLocale } from '@arenaswap/ui/src/components/i18nContext';
import LoadingMessage from '@arenaswap/ui/src/components/loadingMessage';

interface teamPickerListProps {
	teams: EspnTeamEntry[];
	query: string;
	onQueryChange: (query: string) => void;
	isLoading: boolean;
	hasError: boolean;
	list?: teamList;
	selected: ReadonlySet<string>;
	otherListSelected?: ReadonlySet<string>;
	onToggle: (team: EspnTeamEntry) => void;
	onRetry: () => void;
	pinned?: ReactNode;
}

const teamPickerList = ({
	teams, query, onQueryChange, isLoading, hasError, list = 'favorites', selected, otherListSelected, onToggle, onRetry, pinned,
}: teamPickerListProps) => {
	const locale = useDisplayLocale();
	const groups = useMemo(() => {
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
			<label className='form-control form-control-sm form-adorn mb-3'>
				<span className='form-adorn-icon' aria-hidden='true'><i className='bi bi-search' /></span>
				<input
					type='search'
					className='form-ghost'
					placeholder={i18n.t('teamPicker.searchPlaceholder')}
					aria-label={i18n.t('teamPicker.searchPlaceholder')}
					value={query}
					onChange={e => onQueryChange(e.target.value)}
				/>
			</label>

			<div className='overflow-auto'>
				{isLoading && <LoadingMessage message={i18n.t('teamPicker.loading')} label={i18n.t('teamPicker.loading')} />}

				{hasError && !isLoading && (
					<div className='text-center mt-5'>
						<div className='small fg-danger mb-3'>{i18n.t('teamPicker.loadError')}</div>
						<button type='button' className='btn btn-sm btn-outline theme-accent' onClick={onRetry}>{i18n.t('teamPicker.retry')}</button>
					</div>
				)}

				{!isLoading && !hasError && (
					<>
						{pinned}
						{groups.map(({ leagueId, teams: leagueTeams }) => (
							<div key={leagueId}>
								<div className='fw-bold popup-section-label mt-3'>
									{leagueLabels[leagueId] ?? leagueId.toUpperCase()}
								</div>
								{leagueTeams.map(team => {
									const key = createFavoriteTeamKey(team.leagueId, team.id);
									return (
										<TeamPickerRow
											key={team.id}
											team={team}
											list={list}
											isSelected={selected.has(key)}
											isOnOtherList={otherListSelected?.has(key)}
											onToggle={() => onToggle(team)}
										/>
									);
								})}
							</div>
						))}
						{groups.length === 0 && query && (
							<div className='small fg-secondary text-center text-break mt-5'>
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

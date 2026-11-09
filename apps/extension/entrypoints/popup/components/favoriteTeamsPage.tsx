import { useEffect, useState } from 'react';
import { i18n } from '#i18n';
import { fetchTeamsForLeagues } from '@arenaswap/sideline';
import type { EspnTeamEntry } from '@arenaswap/sideline';
import type { LeagueId } from '@arenaswap/core/types';
import TeamListTabs, { teamListTabId } from './teamListTabs';
import TeamPickerList from './teamPickerList';
import TeamPickerRow, { type teamList } from './teamPickerRow';
import { favoriteTeamRows, leaguesForFavoritePicker } from '../../../utils/favoriteTeams';
import { leagueLabels } from '../popupHelpers';

interface favoriteTeamsPageProps {
	enabledLeagues: readonly LeagueId[];
	favoriteTeamIds: ReadonlySet<string>;
	rivalTeamIds: ReadonlySet<string>;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
	onToggleRivalTeam: (leagueId: LeagueId, teamId: string) => void;
}

const panelId = 'teamListPanel';

const favoriteTeamsPage = ({
	enabledLeagues, favoriteTeamIds, rivalTeamIds, onToggleFavoriteTeam, onToggleRivalTeam,
}: favoriteTeamsPageProps) => {
	const [list, setList] = useState<teamList>('favorites');
	const [query, setQuery] = useState('');
	const [teams, setTeams] = useState<EspnTeamEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [attempt, setAttempt] = useState(0);

	// Fixed when the page opens. Recomputing it as teams are starred would refetch every league's
	// roster on each click, and the answer only changes when the leagues themselves do.
	const [leagues] = useState(() => leaguesForFavoritePicker(enabledLeagues, [...favoriteTeamIds, ...rivalTeamIds]));

	useEffect(() => {
		let cancelled = false;
		setIsLoading(true);
		setHasError(false);

		fetchTeamsForLeagues(leagues)
			.then(fetched => { if (!cancelled) setTeams(fetched); })
			.catch(() => { if (!cancelled) setHasError(true); })
			.finally(() => { if (!cancelled) setIsLoading(false); });

		return () => { cancelled = true; };
	}, [leagues, attempt]);

	const isRivals = list === 'rivals';
	const selected = isRivals ? rivalTeamIds : favoriteTeamIds;
	const otherListSelected = isRivals ? favoriteTeamIds : rivalTeamIds;
	const toggle = (team: EspnTeamEntry) => (isRivals ? onToggleRivalTeam : onToggleFavoriteTeam)(team.leagueId, team.id);

	const trackedLeagues = new Set(enabledLeagues);
	const trackedTeams = teams.filter(team => trackedLeagues.has(team.leagueId));

	// Searching hides this section rather than filtering it. Filtered, it moved the league groups
	// up and down on every keystroke, and a starred team answering the search twice — once here and
	// once in its league — read as a duplicate rather than as a shortcut.
	const pinnedRows = query.trim() ? [] : favoriteTeamRows(teams, selected, enabledLeagues);

	const pinned = pinnedRows.length > 0 ? (
		<div>
			<div className='fw-bold popup-section-label mt-3'>{isRivals ? i18n.t('teamPicker.yourRivals') : i18n.t('teamPicker.yourFavorites')}</div>
			{pinnedRows.map(row => (
				<TeamPickerRow
					key={row.key}
					team={row.team}
					list={list}
					isSelected
					sublabel={row.isTracked
						? leagueLabels[row.team.leagueId]
						: i18n.t('teamPicker.leagueNotTracked', { league: leagueLabels[row.team.leagueId] })}
					onToggle={() => toggle(row.team)}
				/>
			))}
		</div>
	) : null;

	// A column rather than a fragment, so the list below the search box is what scrolls. The roster
	// runs to a few hundred rows once a college league is on, and a search box that scrolls away
	// with them is the one thing that makes a list that long unusable.
	return (
		<div className='d-flex flex-column min-h-0 flex-grow-1'>
			<TeamListTabs list={list} panelId={panelId} onChange={setList} />
			<div id={panelId} role='tabpanel' aria-labelledby={teamListTabId(list)} className='d-flex flex-column min-h-0 flex-grow-1'>
				{isRivals && <div className='setting-explainer mb-3'>{i18n.t('teamPicker.rivalsExplainer')}</div>}
				<TeamPickerList
					teams={trackedTeams}
					query={query}
					onQueryChange={setQuery}
					isLoading={isLoading}
					hasError={hasError}
					list={list}
					selected={selected}
					otherListSelected={otherListSelected}
					onToggle={toggle}
					onRetry={() => setAttempt(previous => previous + 1)}
					pinned={pinned}
				/>
			</div>
		</div>
	);
};

export default favoriteTeamsPage;

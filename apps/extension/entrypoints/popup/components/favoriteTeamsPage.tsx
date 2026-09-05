import { useEffect, useState } from 'react';
import { i18n } from '#i18n';
import { fetchTeamsForLeagues } from '@arenaswap/core';
import type { EspnTeamEntry } from '@arenaswap/core';
import type { LeagueId } from '@arenaswap/core/types';
import FavoriteTeamBonusInput from './favoriteTeamBonusInput';
import TeamPickerList from './teamPickerList';
import TeamPickerRow from './teamPickerRow';
import { favoriteTeamRows, leaguesForFavoritePicker } from '../../../utils/favoriteTeams';
import { leagueLabels } from '../popupHelpers';

interface favoriteTeamsPageProps {
	enabledLeagues: readonly LeagueId[];
	favoriteTeamIds: ReadonlySet<string>;
	favoriteTeamBonusPoints: number;
	onFavoriteTeamBonusChange: (val: number) => void;
	onToggleFavoriteTeam: (leagueId: LeagueId, teamId: string) => void;
}

const favoriteTeamsPage = ({
	enabledLeagues, favoriteTeamIds, favoriteTeamBonusPoints, onFavoriteTeamBonusChange, onToggleFavoriteTeam,
}: favoriteTeamsPageProps) => {
	const [query, setQuery] = useState('');
	const [teams, setTeams] = useState<EspnTeamEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [attempt, setAttempt] = useState(0);

	// Fixed when the page opens. Recomputing it as teams are starred would refetch every league's
	// roster on each click, and the answer only changes when the leagues themselves do.
	const [leagues] = useState(() => leaguesForFavoritePicker(enabledLeagues, [...favoriteTeamIds]));

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

	const trackedLeagues = new Set(enabledLeagues);
	const trackedTeams = teams.filter(team => trackedLeagues.has(team.leagueId));

	// Searching hides this section rather than filtering it. Filtered, it moved the league groups
	// up and down on every keystroke, and a starred team answering the search twice — once here and
	// once in its league — read as a duplicate rather than as a shortcut.
	const pinnedRows = query.trim() ? [] : favoriteTeamRows(teams, favoriteTeamIds, enabledLeagues);

	const pinned = pinnedRows.length > 0 ? (
		<div>
			<div className='fw-bold text-uppercase popup-section-label mt-2'>{i18n.t('teamPicker.yourFavorites')}</div>
			{pinnedRows.map(row => (
				<TeamPickerRow
					key={row.key}
					team={row.team}
					isFavorite
					sublabel={row.isTracked
						? leagueLabels[row.team.leagueId]
						: i18n.t('teamPicker.leagueNotTracked', { league: leagueLabels[row.team.leagueId] })}
					onToggle={() => onToggleFavoriteTeam(row.team.leagueId, row.team.id)}
				/>
			))}
		</div>
	) : null;

	// A column rather than a fragment, so the list below the search box is what scrolls. The roster
	// runs to a few hundred rows once a college league is on, and a search box that scrolls away
	// with them is the one thing that makes a list that long unusable.
	return (
		<div className='d-flex flex-column min-h-0 flex-grow-1'>
			<TeamPickerList
				teams={trackedTeams}
				query={query}
				onQueryChange={setQuery}
				isLoading={isLoading}
				hasError={hasError}
				selectedFavorites={favoriteTeamIds}
				onToggleFavorite={team => onToggleFavoriteTeam(team.leagueId, team.id)}
				onRetry={() => setAttempt(previous => previous + 1)}
				leading={(
					<div className='mb-3'>
						<FavoriteTeamBonusInput value={favoriteTeamBonusPoints} onChange={onFavoriteTeamBonusChange} />
					</div>
				)}
				pinned={pinned}
			/>
		</div>
	);
};

export default favoriteTeamsPage;

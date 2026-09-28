import { useEffect, useState } from 'react';
import { i18n } from '#i18n';
import { fetchTeamsForLeagues } from '@arenaswap/core';
import type { EspnTeamEntry } from '@arenaswap/core';
import type { LeagueId } from '@arenaswap/core/types';
import FavoriteTeamBonusInput from './favoriteTeamBonusInput';
import SettingsGroup from './settingControls';
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

	// Fixed when the page opens: recomputed on every star, it would refetch every roster per click.
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

	// Searching hides this group rather than filtering it: filtered, it moved the league groups on
	// every keystroke, and a starred team answering twice read as a duplicate.
	const pinnedRows = query.trim() ? [] : favoriteTeamRows(teams, favoriteTeamIds, enabledLeagues);

	const pinned = pinnedRows.length > 0 ? (
		<SettingsGroup title={i18n.t('teamPicker.yourFavorites')}>
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
		</SettingsGroup>
	) : null;

	return (
		<div className='st-favorites d-flex flex-column min-h-0 flex-grow-1'>
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
					<SettingsGroup>
						<FavoriteTeamBonusInput value={favoriteTeamBonusPoints} onChange={onFavoriteTeamBonusChange} />
					</SettingsGroup>
				)}
				pinned={pinned}
			/>
		</div>
	);
};

export default favoriteTeamsPage;

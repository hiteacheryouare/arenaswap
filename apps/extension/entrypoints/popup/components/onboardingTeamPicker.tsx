import { useState } from 'react';
import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/core';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId, Team } from '@arenaswap/core/types';
import BoardCrest from '@arenaswap/ui/src/components/boardCrest';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';
import { TileCheck } from './onboardingLeaguePicker';
import OnboardingStep from './onboardingStep';
import { matchesTeamQuery } from '../../../utils/favoriteTeams';
import { leagueLabels, leagueOrder } from '../popupHelpers';

interface onboardingTeamPickerProps {
	teams: EspnTeamEntry[];
	isLoading: boolean;
	hasError: boolean;
	selectedFavorites: Set<string>;
	onToggleFavorite: (key: string) => void;
	onBack: () => void;
	onRetry: () => void;
	onSkip: () => void;
	onDone: () => void;
}

// The tile's own surface, which is what the crest's legibility check has to be made against.
const tileSurface = { dark: '#1a1d22', light: '#ffffff' } as const;
const monogramColor = '#5a6370';

const asTeam = (entry: EspnTeamEntry): Team => ({
	id: entry.id,
	name: entry.name,
	abbreviation: entry.abbreviation,
	logo: entry.logo,
	score: 0,
});

const groupByLeague = (teams: EspnTeamEntry[]) => {
	const grouped = new Map<LeagueId, EspnTeamEntry[]>();
	for (const team of teams) grouped.set(team.leagueId, [...(grouped.get(team.leagueId) ?? []), team]);
	return [...grouped.entries()].toSorted(([a], [b]) => (leagueOrder[a] ?? 99) - (leagueOrder[b] ?? 99));
};

const onboardingTeamPicker = ({
	teams,
	isLoading,
	hasError,
	selectedFavorites,
	onToggleFavorite,
	onBack,
	onRetry,
	onSkip,
	onDone,
}: onboardingTeamPickerProps) => {
	const [query, setQuery] = useState('');
	const theme = useDocumentTheme();
	const groups = groupByLeague(teams.filter(team => matchesTeamQuery(team, query)));
	const ready = !isLoading && !hasError;

	return (
		<OnboardingStep
			step={3}
			total={3}
			stepLabel={i18n.t('teamPicker.step', [3, 3])}
			aside={<button type='button' className='btn btn-link ob-skip' onClick={onSkip}>{i18n.t('teamPicker.skip')}</button>}
			title={i18n.t('teamPicker.title')}
			lede={i18n.t('teamPicker.explainer')}
			footer={(
				<>
					<button type='button' className='btn btn-quiet' onClick={onBack}>{i18n.t('teamPicker.back')}</button>
					<span className='ob-count num'>{i18n.t('teamPicker.count', selectedFavorites.size)}</span>
					<button type='button' className='btn btn-primary' onClick={onDone}>{i18n.t('teamPicker.done')}</button>
				</>
			)}
		>
			<div className='ob-search'>
				<i className='bi bi-search' aria-hidden='true' />
				<input
					type='search'
					className='form-control'
					placeholder={i18n.t('teamPicker.searchPlaceholder')}
					aria-label={i18n.t('teamPicker.searchPlaceholder')}
					value={query}
					onChange={event => setQuery(event.target.value)}
				/>
			</div>

			{isLoading && (
				<div className='as-loading' role='status'>
					<div className='spinner-border' aria-hidden='true' />
					<span>{i18n.t('teamPicker.loading')}</span>
				</div>
			)}

			{hasError && !isLoading && (
				<div className='as-empty ob-error'>
					<p>{i18n.t('teamPicker.loadError')}</p>
					<div className='as-empty-actions'>
						<button type='button' className='btn btn-quiet btn-sm' onClick={onRetry}>{i18n.t('teamPicker.retry')}</button>
						<button type='button' className='btn btn-link btn-sm ob-skip' onClick={onSkip}>{i18n.t('teamPicker.skipForNow')}</button>
					</div>
				</div>
			)}

			{ready && groups.map(([leagueId, leagueTeams]) => (
				<section key={leagueId} className='ob-sport' aria-labelledby={`ob-league-${leagueId}`}>
					<h3 id={`ob-league-${leagueId}`}>{leagueLabels[leagueId] ?? leagueId.toUpperCase()}</h3>
					<div className='ob-grid'>
						{leagueTeams.map(team => {
							const key = createFavoriteTeamKey(team.leagueId, team.id);
							const on = selectedFavorites.has(key);
							return (
								<button
									key={key}
									type='button'
									className={`ob-tile ob-team${on ? ' is-on' : ''}`}
									aria-pressed={on}
									aria-label={on ? i18n.t('teamPicker.removeFavorite', { team: team.name }) : i18n.t('teamPicker.addFavorite', { team: team.name })}
									onClick={() => onToggleFavorite(key)}
								>
									<BoardCrest team={asTeam(team)} size={32} surface={tileSurface[theme]} color={monogramColor} loading='lazy' />
									<span className='ob-tile-name'>{team.name}</span>
									<TileCheck />
								</button>
							);
						})}
					</div>
				</section>
			))}

			{ready && groups.length === 0 && query && (
				<p className='ob-empty'>{i18n.t('teamPicker.noMatch', { query })}</p>
			)}
		</OnboardingStep>
	);
};

export default onboardingTeamPicker;

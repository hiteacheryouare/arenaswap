import { useState } from 'react';
import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/core';
import type { LeagueId } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
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
	const lowerQuery = query.toLowerCase();

	const filteredTeams = query
		? teams.filter(t =>
			(t.name ?? '').toLowerCase().includes(lowerQuery)
			|| (t.abbreviation ?? '').toLowerCase().includes(lowerQuery)
		)
		: teams;

	const grouped = filteredTeams.reduce<Partial<Record<LeagueId, EspnTeamEntry[]>>>((acc, team) => {
		(acc[team.leagueId] ??= []).push(team);
		return acc;
	}, {});

	const sortedLeagues = (Object.keys(grouped) as LeagueId[]).toSorted(
		(a, b) => (leagueOrder[a] ?? 99) - (leagueOrder[b] ?? 99)
	);

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='d-flex align-items-center mb-1'>
				<button className='btn btn-link btn-sm p-0 text-body-secondary small' onClick={onBack}>
					<i className='bi bi-arrow-left me-1' />{i18n.t('teamPicker.back')}
				</button>
				<span className='small text-body-secondary text-uppercase ms-auto'>{i18n.t('teamPicker.step', [3, 3])}</span>
			</div>

			<div className='fw-bold lh-sm mb-1 fs-5'>{i18n.t('teamPicker.title')}</div>
			<div className='setting-explainer mb-2'>
				{i18n.t('teamPicker.explainer')}
			</div>

			<input
				type='search'
				className='form-control form-control-sm mb-2'
				placeholder={i18n.t('teamPicker.searchPlaceholder')}
				value={query}
				onChange={e => setQuery(e.target.value)}
	
			/>

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
						<button type='button' className='btn btn-sm btn-link p-0 text-body-secondary' onClick={onSkip}>{i18n.t('teamPicker.skipForNow')}</button>
					</div>
				</div>
			)}

			{!isLoading && !hasError && (
				<div className='overflow-auto grow'>
					{sortedLeagues.map(leagueId => (
						<div key={leagueId}>
							<div className='fw-bold text-uppercase popup-section-label mt-2'>
								{leagueLabels[leagueId] ?? leagueId.toUpperCase()}
							</div>
							{(grouped[leagueId] ?? []).map(team => {
								const key = `${leagueId}:${team.id}`;
								const isFav = selectedFavorites.has(key);
								return (
									<div key={team.id} className='d-flex align-items-center justify-content-between gap-2 mt-1 py-1'>
										<div className='d-flex align-items-center gap-2 min-w-0'>
											<Crest
												logo={team.logo}
												abbreviation={(team.abbreviation ?? team.name ?? '?').slice(0, 3)}
												className='onb-league-logo'
												loading='lazy'
											/>
											<span className='fw-semibold text-body lh-sm small'>{team.name}</span>
										</div>
										<button
											type='button'
											className={`btn btn-link btn-sm p-0 ${isFav ? 'text-warning' : 'text-body-secondary'}`}
											onClick={() => onToggleFavorite(key)}
											aria-label={isFav ? i18n.t('teamPicker.removeFavorite', { team: team.name }) : i18n.t('teamPicker.addFavorite', { team: team.name })}
										>
											<i className={`bi ${isFav ? 'bi-star-fill' : 'bi-star'} fs-6`} />
										</button>
									</div>
								);
							})}
						</div>
					))}
					{sortedLeagues.length === 0 && query && (
						<div className='small text-body-secondary text-center mt-3'>
							{i18n.t('teamPicker.noMatch', { query })}
						</div>
					)}
				</div>
			)}

			<div className='d-flex align-items-center justify-content-between mt-3 pt-2 border-top'>
				<button type='button' className='btn btn-link btn-sm p-0 text-body-secondary' onClick={onSkip}>
					{i18n.t('teamPicker.skip')}
				</button>
				<button type='button' className='btn btn-primary btn-sm' onClick={onDone}>
					{i18n.t('teamPicker.done')} <i className='bi bi-check-lg' />
				</button>
			</div>
		</div>
	);
};

export default onboardingTeamPicker;

import { useState } from 'react';
import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/core';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import TeamPickerList from './teamPickerList';

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

			<TeamPickerList
				teams={teams}
				query={query}
				onQueryChange={setQuery}
				isLoading={isLoading}
				hasError={hasError}
				selectedFavorites={selectedFavorites}
				onToggleFavorite={team => onToggleFavorite(createFavoriteTeamKey(team.leagueId, team.id))}
				onRetry={onRetry}
				onSkip={onSkip}
			/>

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

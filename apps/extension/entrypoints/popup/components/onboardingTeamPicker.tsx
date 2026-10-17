import { useState } from 'react';
import { i18n } from '#i18n';
import type { EspnTeamEntry } from '@arenaswap/sideline';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import TeamPickerList from './teamPickerList';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';

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
				<button className='btn btn-link btn-sm p-0 fg-secondary small' onClick={onBack}>
					<i className='bi bi-arrow-left me-1' />{i18n.t('teamPicker.back')}
				</button>
				<FlowStepper step={3} total={3} className='ms-auto' />
			</div>

			<div className='fw-bold lh-xs mb-1 fs-lg popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('teamPicker.title')}</div>
			<div className='setting-explainer mb-3'>
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
			/>

			<div className='d-flex align-items-center justify-content-between mt-5 pt-3 border-top'>
				<button type='button' className='btn btn-link btn-sm p-0 fg-secondary' onClick={onSkip}>
					{i18n.t('teamPicker.skip')}
				</button>
				<button type='button' className='btn btn-solid theme-primary btn-sm' onClick={onDone}>
					{i18n.t('teamPicker.done')} <i className='bi bi-check-lg' />
				</button>
			</div>
		</div>
	);
};

export default onboardingTeamPicker;

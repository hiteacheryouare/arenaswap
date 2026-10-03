import { useState } from 'react';
import { i18n } from '#i18n';
import { leagueShortLabels } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import { cooldownSteps, formatCooldownSeconds } from './cooldownSlider';
import focusStepTitle from './stepTitleFocus';

interface walkthroughStepSettingsProps {
	onNext: () => void;
	onBack: () => void;
	// The leagues just picked in onboarding, so the preview shows the user's own rather than four
	// that may not be among them.
	leagues?: readonly LeagueId[];
}

const fallbackLeagues: readonly LeagueId[] = ['nfl', 'nba', 'nhl', 'mlb'];
const previewLeagueCount = 4;

const sensitivityLabels: Record<number, string> = {
	1: i18n.t('stepSettings.sensitivity1'), 2: i18n.t('stepSettings.sensitivity2'), 3: i18n.t('stepSettings.sensitivity3'),
	4: i18n.t('stepSettings.sensitivity4'), 5: i18n.t('stepSettings.sensitivity5'), 6: i18n.t('stepSettings.sensitivity6'), 7: i18n.t('stepSettings.sensitivity7'),
};

const walkthroughStepSettings = ({ onNext, onBack, leagues = fallbackLeagues }: walkthroughStepSettingsProps) => {
	const shownLeagues = (leagues.length > 0 ? leagues : fallbackLeagues).slice(0, previewLeagueCount);
	const [sensitivity, setSensitivity] = useState(4);
	const [cooldownIdx, setCooldownIdx] = useState(2);

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='small text-body-secondary text-uppercase text-center pt-3 pb-2'>{i18n.t('stepSettings.step', [5, 8])}</div>

			<div className='fw-bold fs-5 text-center mb-1 popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('stepSettings.title')}</div>
			<div className='text-body-secondary small text-center mb-3 lh-base'>
				{i18n.t('stepSettings.subtitle')}
			</div>

			<div className='border border-secondary-subtle rounded p-2 mb-3'>
				<div className='mb-3'>
					<div className='d-flex justify-content-between align-items-center mb-1'>
						<span className='text-body-secondary setting-toggle-label'>
							<i className='bi bi-sliders me-1 text-primary' />
							{i18n.t('stepSettings.sensitivityLabel')}
						</span>
						<span className={`fw-semibold setting-value-label${sensitivity === 7 ? ' ludicrous-speed' : ''}`}>
							{sensitivityLabels[sensitivity]}
						</span>
					</div>
					<input
						type='range'
						className='form-range w-100'
						min={1} max={7} step={1}
						value={sensitivity}
						onChange={e => setSensitivity(Number(e.target.value))}
					/>
					<div className='text-body-secondary small lh-base' style={{ fontSize: '0.7rem' }}>
						{i18n.t('stepSettings.sensitivityHelp')}
					</div>
				</div>

				<div>
					<div className='d-flex justify-content-between align-items-center mb-1'>
						<span className='text-body-secondary setting-toggle-label'>
							<i className='bi bi-clock me-1 text-primary' />
							{i18n.t('stepSettings.cooldownLabel')}
						</span>
						<span className='fw-semibold setting-value-label'>
							{formatCooldownSeconds(cooldownSteps[cooldownIdx]!)}
						</span>
					</div>
					<input
						type='range'
						className='form-range w-100'
						min={0} max={cooldownSteps.length - 1} step={1}
						value={cooldownIdx}
						onChange={e => setCooldownIdx(Number(e.target.value))}
					/>
					<div className='text-body-secondary small lh-base' style={{ fontSize: '0.7rem' }}>
						{i18n.t('stepSettings.cooldownHelp')}
					</div>
				</div>

				<div className='d-flex gap-1 flex-wrap mt-3'>
					{shownLeagues.map(league => (
						<span key={league} className='badge text-bg-primary'>{leagueShortLabels[league]}</span>
					))}
					<span className='badge border border-secondary-subtle text-body-secondary'>{i18n.t('stepSettings.moreLeagues')}</span>
				</div>
			</div>

			<div className='d-flex gap-2 mt-auto'>
				<button type='button' className='btn btn-secondary flex-grow-1' onClick={onBack}>
					<i className='bi bi-arrow-left' /> {i18n.t('stepSettings.back')}
				</button>
				<button type='button' className='btn btn-primary flex-grow-1' onClick={onNext}>
					{i18n.t('stepSettings.next')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepSettings;

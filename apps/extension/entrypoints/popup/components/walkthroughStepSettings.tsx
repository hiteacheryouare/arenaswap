import { useState } from 'react';
import { i18n } from '#i18n';
import { resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { cooldownSteps, formatCooldownSeconds } from './cooldownSlider';
import WalkthroughFrame from './walkthroughFrame';

interface walkthroughStepSettingsProps {
	onNext: () => void;
	onBack: () => void;
}

const sensitivityLabels: Record<number, string> = {
	1: i18n.t('stepSettings.sensitivity1'), 2: i18n.t('stepSettings.sensitivity2'), 3: i18n.t('stepSettings.sensitivity3'),
	4: i18n.t('stepSettings.sensitivity4'), 5: i18n.t('stepSettings.sensitivity5'), 6: i18n.t('stepSettings.sensitivity6'), 7: i18n.t('stepSettings.sensitivity7'),
};

const tourLeagues: { id: LeagueId; label: string }[] = [
	{ id: 'nfl', label: 'NFL' },
	{ id: 'nba', label: 'NBA' },
	{ id: 'nhl', label: 'NHL' },
	{ id: 'mlb', label: 'MLB' },
];

const walkthroughStepSettings = ({ onNext, onBack }: walkthroughStepSettingsProps) => {
	const [sensitivity, setSensitivity] = useState(4);
	const [cooldownIdx, setCooldownIdx] = useState(2);

	return (
		<WalkthroughFrame
			step={5}
			stepLabel={i18n.t('stepSettings.step', [5, 8])}
			title={i18n.t('stepSettings.title')}
			lede={i18n.t('stepSettings.subtitle')}
			backLabel={i18n.t('stepSettings.back')}
			onBack={onBack}
			nextLabel={i18n.t('stepSettings.next')}
			onNext={onNext}
		>
			<div className='wt-card'>
				<div className='wt-control'>
					<div className='wt-range-head'>
						<label className='wt-label' htmlFor='wt-sensitivity'>{i18n.t('stepSettings.sensitivityLabel')}</label>
						<output className={`wt-value${sensitivity === 7 ? ' ludicrous-speed' : ''}`} htmlFor='wt-sensitivity'>
							{sensitivityLabels[sensitivity]}
						</output>
					</div>
					<input
						type='range'
						className='form-range'
						id='wt-sensitivity'
						min={1} max={7} step={1}
						value={sensitivity}
						onChange={event => setSensitivity(Number(event.target.value))}
					/>
					<p className='wt-note'>{i18n.t('stepSettings.sensitivityHelp')}</p>
				</div>
				<div className='wt-control'>
					<div className='wt-range-head'>
						<label className='wt-label' htmlFor='wt-cooldown'>{i18n.t('stepSettings.cooldownLabel')}</label>
						<output className='wt-value num' htmlFor='wt-cooldown'>{formatCooldownSeconds(cooldownSteps[cooldownIdx]!)}</output>
					</div>
					<input
						type='range'
						className='form-range'
						id='wt-cooldown'
						min={0} max={cooldownSteps.length - 1} step={1}
						value={cooldownIdx}
						onChange={event => setCooldownIdx(Number(event.target.value))}
					/>
					<p className='wt-note'>{i18n.t('stepSettings.cooldownHelp')}</p>
				</div>
			</div>

			<div className='wt-leagues'>
				{tourLeagues.map(league => (
					<span key={league.id} className='wt-disc' title={league.label}>
						<Crest logo={resolveLeagueLogoUrl(league.id, undefined, 'light')} abbreviation={league.label} label={league.label} className='wt-league-logo' />
					</span>
				))}
				<span className='wt-more'>{i18n.t('stepSettings.moreLeagues')}</span>
			</div>
		</WalkthroughFrame>
	);
};

export default walkthroughStepSettings;

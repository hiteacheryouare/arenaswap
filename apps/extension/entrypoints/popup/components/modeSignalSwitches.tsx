import { i18n } from '#i18n';
import { modesInUse } from '@arenaswap/core';
import type { BuiltInModeId, SignalName, UserPreferences } from '@arenaswap/core/types';
import { modeNameKeys, modeSignalIds, signalPresentation, type ModeSignalId } from '@arenaswap/ui/src/components/scoringModeMeta';
import SettingTooltipIcon from './settingTooltipIcon';
import { disabledSignalsOf } from '../../../utils/scoringPrefs';

interface modeSignalSwitchesProps {
	prefs: Pick<UserPreferences, 'scoringMode' | 'leagueModes' | 'enabledLeagues' | 'disabledSignals' | 'modeDisabledSignals'>;
	disabled: boolean;
	onToggleSignal: (signal: SignalName) => void;
	onToggleModeSignal: (mode: BuiltInModeId, signal: string) => void;
}

// Classic's switches keep the ids they have always had, so a search result or a saved link still lands on them.
const switchId = (mode: BuiltInModeId, signal: string) => (mode === 'classic' ? `signal-${signal}` : `signal-${mode}-${signal}`);
const lastActiveNoteId = (mode: BuiltInModeId) => (mode === 'classic' ? 'signalLastActiveNote' : `signalLastActiveNote-${mode}`);

const modeSignalSwitches = ({ prefs, disabled, onToggleSignal, onToggleModeSignal }: modeSignalSwitchesProps) => {
	// Blowouts and Fantasy both lean on a Classic score, so Classic's switches matter whenever either
	// is in use, even with Classic itself picked nowhere.
	const inUse = modesInUse(prefs);
	const modes: BuiltInModeId[] = inUse.includes('classic') || inUse.length === 0 ? inUse : ['classic', ...inUse];
	const headed = modes.length > 1;

	return (
		<>
			<div className='fw-bold popup-section-label mt-3'>
				<i className='bi bi-sliders' />
				{i18n.t('setup.signalsSection')}
				<SettingTooltipIcon text={i18n.t('setup.signalsExplainer')} label={i18n.t('setup.signalsSection')} />
			</div>
			{modes.map((mode, index) => {
				const signals: readonly ModeSignalId[] = modeSignalIds[mode];
				const off = disabledSignalsOf(prefs, mode);
				const oneLeft = off.length === signals.length - 1;
				return (
					<div key={mode} className={headed && index > 0 ? 'mt-3' : undefined} data-mode={mode}>
						{headed && (
							<div className='fw-semibold text-body-secondary setting-toggle-label mode-signals-heading'>{i18n.t(modeNameKeys[mode])}</div>
						)}
						{signals.map(signal => {
							const isOff = off.includes(signal);
							const isLastOn = !isOff && oneLeft;
							const id = switchId(mode, signal);
							return (
								<div key={signal} className='d-flex justify-content-between align-items-center mt-2'>
									<label className='text-body-secondary setting-toggle-label' htmlFor={id}>
										<span
											className='d-inline-block rounded-circle me-1'
											style={{ width: '8px', height: '8px', backgroundColor: isOff ? '#6c757d' : signalPresentation[signal].color, verticalAlign: 'middle' }}
										/>
										{i18n.t(signalPresentation[signal].labelKey)}
									</label>
									<div className='form-check form-switch mb-0'>
										<input
											className='form-check-input'
											type='checkbox'
											id={id}
											checked={!isOff}
											onChange={() => (mode === 'classic' ? onToggleSignal(signal as SignalName) : onToggleModeSignal(mode, signal))}
											disabled={disabled || isLastOn}
											aria-describedby={isLastOn ? lastActiveNoteId(mode) : undefined}
										/>
									</div>
								</div>
							);
						})}
						{oneLeft && <div id={lastActiveNoteId(mode)} className='setting-explainer mt-2'>{i18n.t('setup.signalLastActive')}</div>}
					</div>
				);
			})}
		</>
	);
};

export default modeSignalSwitches;

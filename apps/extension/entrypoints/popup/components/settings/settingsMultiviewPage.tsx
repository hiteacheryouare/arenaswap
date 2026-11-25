import { i18n } from '#i18n';
import { multiviewMaxBoxesMax, multiviewMaxBoxesMin } from '@arenaswap/core/constants';
import ToggleSwitch from '@arenaswap/ui/src/components/toggleSwitch';
import FormRange from '../formRange';
import SelectDropdown from '../selectDropdown';
import type { setupViewProps } from '../setupView';

interface settingsMultiviewPageProps extends Pick<setupViewProps, 'prefs' | 'prefsLoaded' | 'multiviewOn' | 'onMultiviewThresholdChange' | 'onMultiviewGamesChange' | 'onMultiviewMaxBoxesChange'> {
	handleToggleMultiview: () => void;
}

const settingsMultiviewPage = ({
	prefs, prefsLoaded, multiviewOn, onMultiviewThresholdChange, onMultiviewGamesChange, onMultiviewMaxBoxesChange,
	handleToggleMultiview,
}: settingsMultiviewPageProps) => (
	<>
		<div className='d-flex justify-content-between align-items-center'>
			<label className='fg-secondary setting-toggle-label' htmlFor='multiviewToggle'>{i18n.t('setup.enableMultiview')}</label>
			<ToggleSwitch id='multiviewToggle' checked={multiviewOn} onChange={handleToggleMultiview} disabled={!prefsLoaded} />
		</div>

		{multiviewOn && (
			<div className='mt-5 d-flex flex-column gap-5'>
				<div>
					<div className='d-flex justify-content-between align-items-baseline mb-1'>
						<label className='fg-secondary setting-toggle-label' htmlFor='multiviewThresholdSlider'>
							{i18n.t('setup.multiviewHotAt')}
						</label>
						<span className='fw-semibold setting-value-label'>{prefs.multiviewThreshold}</span>
					</div>
					<FormRange
						id='multiviewThresholdSlider'
						min={0}
						max={100}
						step={5}
						value={prefs.multiviewThreshold}
						onChange={e => onMultiviewThresholdChange(Number(e.target.value))}
						disabled={!prefsLoaded}
					/>
					<div className='d-flex justify-content-between'>
						<span className='setting-explainer'>{i18n.t('setup.multiviewMoreOften')}</span>
						<span className='setting-explainer'>{i18n.t('setup.multiviewBigMomentsOnly')}</span>
					</div>
				</div>

				<div>
					<div className='fg-secondary setting-toggle-label mb-1'>{i18n.t('setup.multiviewGames')}</div>
					<SelectDropdown
						id='multiviewGamesSelect'
						value={prefs.multiviewGames}
						onChange={value => onMultiviewGamesChange(value === 'all' ? 'all' : 'hot')}
						disabled={!prefsLoaded}
						ariaLabel={i18n.t('setup.multiviewGames')}
						options={[
							{ value: 'hot', label: i18n.t('setup.multiviewGamesHot') },
							{ value: 'all', label: i18n.t('setup.multiviewGamesAll') },
						]}
					/>
				</div>

				<div>
					<div className='d-flex justify-content-between align-items-baseline mb-1'>
						<label className='fg-secondary setting-toggle-label' htmlFor='multiviewMaxBoxesSlider'>
							{i18n.t('setup.multiviewMaxBoxes')}
						</label>
						<span className='fw-semibold setting-value-label'>{prefs.multiviewMaxBoxes}</span>
					</div>
					<FormRange
						id='multiviewMaxBoxesSlider'
						min={multiviewMaxBoxesMin}
						max={multiviewMaxBoxesMax}
						step={1}
						value={prefs.multiviewMaxBoxes}
						onChange={e => onMultiviewMaxBoxesChange(Number(e.target.value))}
						disabled={!prefsLoaded}
					/>
				</div>
			</div>
		)}
	</>
);

export default settingsMultiviewPage;

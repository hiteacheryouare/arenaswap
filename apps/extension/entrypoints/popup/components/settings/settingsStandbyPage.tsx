import { i18n } from '#i18n';
import ToggleSwitch from '@arenaswap/ui/src/components/toggleSwitch';
import TabFavicon from '@arenaswap/ui/src/components/tabFavicon';
import FormRange from '../formRange';
import SelectDropdown from '../selectDropdown';
import type { setupViewProps } from '../setupView';

interface settingsStandbyPageProps extends Pick<setupViewProps, 'prefs' | 'prefsLoaded' | 'standbyStreamTabId' | 'openTabs' | 'formatTabLabel' | 'onStandbyThresholdChange' | 'onSetStandbyTab'>, Required<Pick<setupViewProps, 'registry' | 'standbyTabElsewhere'>> {
	handleToggleStandbyStream: () => void;
}

const settingsStandbyPage = ({
	prefs, prefsLoaded, standbyStreamTabId, openTabs, formatTabLabel, onStandbyThresholdChange,
	onSetStandbyTab, registry, standbyTabElsewhere, handleToggleStandbyStream,
}: settingsStandbyPageProps) => (
	<>
		<div className='d-flex justify-content-between align-items-center'>
			<label className='fg-secondary setting-toggle-label' htmlFor='standbyStreamToggle'>{i18n.t('setup.enableStandby')}</label>
			<ToggleSwitch id='standbyStreamToggle' checked={prefs.standbyStreamEnabled} onChange={handleToggleStandbyStream} disabled={!prefsLoaded} />
		</div>

		{prefs.standbyStreamEnabled && (
			<div className='mt-5 d-flex flex-column gap-5'>
				<div>
					<div className='d-flex justify-content-between align-items-baseline mb-1'>
						<label className='fg-secondary setting-toggle-label' htmlFor='standbyThresholdSlider'>
							{i18n.t('setup.standbyBelow')}
						</label>
						<span className='fw-semibold setting-value-label'>{prefs.standbyStreamThreshold}</span>
					</div>
					<FormRange
						id='standbyThresholdSlider'
						min={0}
						max={100}
						step={5}
						value={prefs.standbyStreamThreshold}
						onChange={e => onStandbyThresholdChange(Number(e.target.value))}
						disabled={!prefsLoaded}
					/>
					<div className='d-flex justify-content-between'>
						<span className='setting-explainer'>{i18n.t('setup.morePatient')}</span>
						<span className='setting-explainer'>{i18n.t('setup.switchesSooner')}</span>
					</div>
				</div>

				<div>
					<div className='fg-secondary setting-toggle-label mb-1'>
						{i18n.t('setup.standbyTab')}
					</div>
					<SelectDropdown
						id='standbyTabSelect'
						value={standbyStreamTabId === null ? '' : String(standbyStreamTabId)}
						onChange={value => onSetStandbyTab(value ? Number(value) : null)}
						disabled={!prefsLoaded}
						ariaLabel={i18n.t('setup.standbyTab')}
						options={[
							{ value: '', label: i18n.t('setup.selectTab') },
							...[...openTabs, ...(standbyTabElsewhere?.id === standbyStreamTabId && !openTabs.some(openTab => openTab.id === standbyStreamTabId) ? [standbyTabElsewhere] : [])].filter(openTab => openTab.id !== undefined).map(openTab => {
								const holdsGame = registry.some(reg => reg.tabId === openTab.id);
								return {
									value: String(openTab.id),
									label: formatTabLabel(openTab),
									hint: holdsGame ? i18n.t('tabAssign.hasGame').trim() : undefined,
									image: <TabFavicon url={openTab.favIconUrl} />,
									disabled: holdsGame,
								};
							}),
						]}
					/>
				</div>
			</div>
		)}
	</>
);

export default settingsStandbyPage;

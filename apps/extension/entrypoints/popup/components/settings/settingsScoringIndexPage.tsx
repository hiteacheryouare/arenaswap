import { i18n } from '#i18n';
import FavoriteTeamBonusInput from '../favoriteTeamBonusInput';
import FantasySettingsSection from '../fantasy/fantasySettingsSection';
import ModeSignalSwitches from '../modeSignalSwitches';
import PostseasonBoostInput from '../postseasonBoostInput';
import ScoringModeSection from '../scoringModeSection';
import { changedFantasyRuleCount } from '../../../../utils/scoringPrefs';
import type { setupViewProps, scoringSubPage } from '../setupView';

interface settingsScoringIndexPageProps extends Pick<setupViewProps, 'prefs' | 'prefsLoaded' | 'leagueLogos' | 'fantasyRoster' | 'onScoringModeChange' | 'onLeagueModeChange' | 'onFantasyBlendChange' | 'onToggleSignal' | 'onToggleModeSignal' | 'onPostseasonBoostChange' | 'onFavoriteTeamBonusChange'> {
	fantasyInUse: boolean;
	openScoringPage: (subPage: scoringSubPage) => void;
}

const settingsScoringIndexPage = ({
	prefs, prefsLoaded, leagueLogos, fantasyRoster, onScoringModeChange, onLeagueModeChange,
	onFantasyBlendChange, onToggleSignal, onToggleModeSignal, onPostseasonBoostChange, onFavoriteTeamBonusChange, fantasyInUse,
	openScoringPage,
}: settingsScoringIndexPageProps) => (
	<>
		<ScoringModeSection
			prefs={prefs}
			leagueLogos={leagueLogos}
			disabled={!prefsLoaded}
			onScoringModeChange={onScoringModeChange}
			onLeagueModeChange={onLeagueModeChange}
		/>

		{fantasyInUse && (
			<FantasySettingsSection
				blend={prefs.fantasyBlend}
				rosterSize={fantasyRoster.length}
				changedRules={changedFantasyRuleCount(prefs.fantasyScoring)}
				disabled={!prefsLoaded}
				onBlendChange={onFantasyBlendChange}
				onOpenRoster={() => openScoringPage('roster')}
				onOpenRules={() => openScoringPage('rules')}
			/>
		)}

		<ModeSignalSwitches
			prefs={prefs}
			disabled={!prefsLoaded}
			onToggleSignal={onToggleSignal}
			onToggleModeSignal={onToggleModeSignal}
		/>

		<div className='fw-bold popup-section-label mt-5'><i className='bi bi-plus-slash-minus' />{i18n.t('setup.bonusesSection')}</div>
		<div className='settings-stack'>
			<PostseasonBoostInput value={prefs.postseasonBoostPoints} onChange={onPostseasonBoostChange} />
			<FavoriteTeamBonusInput value={prefs.favoriteTeamBonusPoints} onChange={onFavoriteTeamBonusChange} />
		</div>
	</>
);

export default settingsScoringIndexPage;

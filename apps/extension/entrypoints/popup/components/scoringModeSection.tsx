import { i18n } from '#i18n';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { BuiltInModeId, LeagueId, LeagueLogoMap, ScoringModeChoice, UserPreferences } from '@arenaswap/core/types';
import { modeIcons, modeNameKeys } from '@arenaswap/ui/src/components/scoringModeMeta';
import LeagueLogo from './leagueLogo';
import SelectDropdown from './selectDropdown';
import { canUseFantasy } from '../../../utils/scoringPrefs';

interface scoringModeSectionProps {
	prefs: Pick<UserPreferences, 'scoringMode' | 'leagueModes' | 'enabledLeagues'>;
	leagueLogos: LeagueLogoMap;
	disabled: boolean;
	onScoringModeChange: (mode: ScoringModeChoice) => void;
	onLeagueModeChange: (league: LeagueId, mode: BuiltInModeId) => void;
}

const modeChoices: readonly ScoringModeChoice[] = ['classic', 'blowouts', 'fantasy', 'custom'];
const leagueModeChoices: readonly BuiltInModeId[] = ['classic', 'blowouts', 'fantasy'];

const modeExplainerKeys = {
	classic: 'setup.modeExplainerClassic',
	blowouts: 'setup.modeExplainerBlowouts',
	fantasy: 'setup.modeExplainerFantasy',
	custom: 'setup.modeExplainerCustom',
} as const satisfies Record<ScoringModeChoice, string>;

const scoringModeSection = ({ prefs, leagueLogos, disabled, onScoringModeChange, onLeagueModeChange }: scoringModeSectionProps) => {
	const isCustom = prefs.scoringMode === 'custom';
	const someLeagueLacksFantasy = prefs.enabledLeagues.some(league => !canUseFantasy(league));

	return (
		<>
			<div className='fw-bold popup-section-label'><i className='bi bi-compass' />{i18n.t('setup.scoringModeSection')}</div>
			<label className='text-body-secondary setting-toggle-label d-block mb-1' id='scoringModeSelectLabel' htmlFor='scoringModeSelect'>
				{i18n.t('setup.scoringMode')}
			</label>
			<SelectDropdown<ScoringModeChoice>
				id='scoringModeSelect'
				labelId='scoringModeSelectLabel'
				value={prefs.scoringMode}
				onChange={onScoringModeChange}
				disabled={disabled}
				options={modeChoices.map(mode => ({ value: mode, label: i18n.t(modeNameKeys[mode]), icon: modeIcons[mode] }))}
			/>
			<div className='setting-explainer mt-1'>{i18n.t(modeExplainerKeys[prefs.scoringMode])}</div>

			{isCustom && (
				<div id='leagueModeList' className='league-order-list mt-2'>
					{prefs.enabledLeagues.length === 0 && <div className='setting-explainer'>{i18n.t('setup.noLeaguesWarning')}</div>}
					{prefs.enabledLeagues.map(leagueId => {
						const league = leagueConfigMap[leagueId];
						if (!league) return null;
						const fantasyAllowed = canUseFantasy(leagueId);
						const mode = prefs.leagueModes[leagueId] ?? 'classic';
						return (
							<div key={leagueId} className='league-order-row league-mode-row'>
								<LeagueLogo league={league} logos={leagueLogos} />
								<span className='league-order-label fw-semibold text-body'>{league.label}</span>
								<div className='league-mode-select'>
									<SelectDropdown<BuiltInModeId>
										id={`leagueMode-${leagueId}`}
										value={mode === 'fantasy' && !fantasyAllowed ? 'classic' : mode}
										onChange={next => onLeagueModeChange(leagueId, next)}
										disabled={disabled}
										ariaLabel={i18n.t('setup.leagueModeLabel', { league: league.label })}
										options={leagueModeChoices.map(choice => ({
											value: choice,
											label: i18n.t(modeNameKeys[choice]),
											icon: modeIcons[choice],
											disabled: choice === 'fantasy' && !fantasyAllowed,
										}))}
									/>
								</div>
							</div>
						);
					})}
					{someLeagueLacksFantasy && <div className='setting-explainer'>{i18n.t('setup.modeFantasyLeagues')}</div>}
				</div>
			)}
		</>
	);
};

export default scoringModeSection;

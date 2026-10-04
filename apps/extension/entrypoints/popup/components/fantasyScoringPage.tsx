import { useState } from 'react';
import { i18n } from '#i18n';
import { defaultFantasyScoring, type FantasySport } from 'powerscore';
import { fantasyRulesRead } from '@arenaswap/core';
import type { UserPreferences } from '@arenaswap/core/types';
import { useDisplayLocale } from '@arenaswap/ui/src/components/i18nContext';
import FantasyRuleInput from './fantasyRuleInput';
import { fantasyRuleGroups, fantasySportLabelKeys, fantasySports, ruleStep } from './fantasyScoringLabels';
import SelectDropdown from './selectDropdown';
import { fantasyRulePoints } from '../../../utils/scoringPrefs';

interface fantasyScoringPageProps {
	scoring: UserPreferences['fantasyScoring'];
	initialSport: FantasySport;
	disabled: boolean;
	onRuleChange: (sport: FantasySport, rule: string, points: number) => void;
	onResetSport: (sport: FantasySport) => void;
}

const fantasyScoringPage = ({ scoring, initialSport, disabled, onRuleChange, onResetSport }: fantasyScoringPageProps) => {
	const [sport, setSport] = useState<FantasySport>(initialSport);
	const format = new Intl.NumberFormat(useDisplayLocale(), { maximumFractionDigits: 2 });
	const changed = Object.keys(scoring[sport] ?? {}).length > 0;

	return (
		<>
			<label className='text-body-secondary setting-toggle-label d-block mb-1' id='fantasySportSelectLabel' htmlFor='fantasySportSelect'>
				{i18n.t('fantasy.sportLabel')}
			</label>
			<SelectDropdown<FantasySport>
				id='fantasySportSelect'
				labelId='fantasySportSelectLabel'
				value={sport}
				onChange={setSport}
				options={fantasySports.map(value => ({ value, label: i18n.t(fantasySportLabelKeys[value]) }))}
			/>

			{fantasyRuleGroups[sport]
				// A rule the box score never fills would change nothing, so it isn't offered.
				.map(group => ({ ...group, rules: group.rules.filter(({ rule }) => fantasyRulesRead[sport].includes(rule)) }))
				.filter(group => group.rules.length > 0)
				.map((group, index) => (
				<div key={group.rules[0]!.rule} className={index === 0 ? 'mt-3' : 'mt-4'}>
					{'headingKey' in group && (
						<div className='fw-semibold text-body-secondary setting-toggle-label fantasy-rule-heading'>{i18n.t(group.headingKey)}</div>
					)}
					{group.rules.map(({ rule, labelKey }) => {
						const id = `fantasyRule-${sport}-${rule}`;
						const defaults = defaultFantasyScoring[sport][rule]!;
						return (
							<div key={id} className='fantasy-rule-row'>
								<label className='fantasy-rule-label' htmlFor={id}>
									<span className='d-block text-body-secondary setting-toggle-label'>{i18n.t(labelKey)}</span>
									<span id={`${id}-default`} className='d-block setting-explainer'>
										{i18n.t('fantasy.ruleDefault', { points: format.format(defaults.points) })}
									</span>
								</label>
								<FantasyRuleInput
									id={id}
									value={fantasyRulePoints(scoring, sport, rule)}
									min={defaults.min}
									max={defaults.max}
									step={ruleStep(defaults.points)}
									onChange={points => onRuleChange(sport, rule, points)}
									ariaLabel={i18n.t(labelKey)}
									ariaDescribedBy={`${id}-default`}
								/>
							</div>
						);
					})}
				</div>
			))}

			<button
				type='button'
				id='fantasyRulesReset'
				className='btn btn-sm btn-link league-order-reset mt-3'
				onClick={() => onResetSport(sport)}
				disabled={disabled || !changed}
			>
				<i className='bi bi-arrow-counterclockwise me-1' aria-hidden='true' />
				{i18n.t('fantasy.resetSport', { sport: i18n.t(fantasySportLabelKeys[sport]) })}
			</button>
		</>
	);
};

export default fantasyScoringPage;

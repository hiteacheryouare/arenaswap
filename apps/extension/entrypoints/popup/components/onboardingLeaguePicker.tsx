import { i18n } from '#i18n';
import { resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap, SportType } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { toLeagueInitials } from './leagueLogo';
import OnboardingStep from './onboardingStep';
import { leaguesBySportType, sportTypeLabels, sportTypeOrder } from '../popupHelpers';

interface onboardingLeaguePickerProps {
	selectedLeagues: Set<LeagueId>;
	leagueLogos: LeagueLogoMap;
	onToggleLeague: (id: LeagueId) => void;
	onToggleSport: (sport: SportType, selectAll: boolean) => void;
	onBack: () => void;
	onNext: () => void;
}

const sports = (Object.keys(sportTypeOrder) as SportType[]).toSorted((a, b) => sportTypeOrder[a] - sportTypeOrder[b]);

// A tile sits under its sport's heading, so "Olympic Men's Ice Hockey" can say "Olympic Men's" and
// fit a third of the popup. The full name stays the checkbox's accessible name.
const sportNouns: Record<SportType, string[]> = {
	basketball: ['Basketball'],
	football: ['Football'],
	hockey: ['Ice Hockey', 'Hockey'],
	baseball: ['Baseball'],
	softball: ['Softball'],
	soccer: ['Soccer'],
};

export const tileLeagueName = (label: string, sportType: SportType): string => {
	const noun = sportNouns[sportType].find(word => label.endsWith(` ${word}`));
	return noun ? label.slice(0, -noun.length - 1) : label;
};

export const TileCheck = () => (
	<i className='ob-check' aria-hidden='true'>
		<i className='bi bi-check-lg' />
	</i>
);

const onboardingLeaguePicker = ({
	selectedLeagues,
	leagueLogos,
	onToggleLeague,
	onToggleSport,
	onBack,
	onNext,
}: onboardingLeaguePickerProps) => (
	<OnboardingStep
		step={2}
		total={3}
		stepLabel={i18n.t('leaguePicker.step', [2, 3])}
		title={i18n.t('leaguePicker.title')}
		lede={i18n.t('leaguePicker.lede')}
		footer={(
			<>
				<button type='button' className='btn btn-quiet' onClick={onBack}>{i18n.t('leaguePicker.back')}</button>
				<span className='ob-count num'>{i18n.t('leaguePicker.count', selectedLeagues.size)}</span>
				<button type='button' className='btn btn-primary' onClick={onNext} disabled={selectedLeagues.size === 0}>
					{i18n.t('leaguePicker.next')}
				</button>
			</>
		)}
	>
		{sports.map(sportType => {
			const leagues = leaguesBySportType[sportType];
			const allSelected = leagues.every(league => selectedLeagues.has(league.id));
			return (
				<section key={sportType} className='ob-sport' aria-labelledby={`ob-sport-${sportType}`}>
					<div className='ob-sport-head'>
						<h3 id={`ob-sport-${sportType}`}>{sportTypeLabels[sportType]}</h3>
						<label className='ob-all' htmlFor={`sport-all-${sportType}`}>
							<input
								className='form-check-input'
								type='checkbox'
								id={`sport-all-${sportType}`}
								checked={allSelected}
								onChange={() => onToggleSport(sportType, !allSelected)}
							/>
							{i18n.t('leaguePicker.all')}
						</label>
					</div>
					<div className='ob-grid'>
						{leagues.map(league => {
							const on = selectedLeagues.has(league.id);
							return (
								<label key={league.id} className={`ob-tile${on ? ' is-on' : ''}`} htmlFor={`onb-league-${league.id}`}>
									<input
										className='visually-hidden'
										type='checkbox'
										id={`onb-league-${league.id}`}
										aria-label={league.label}
										checked={on}
										onChange={() => onToggleLeague(league.id)}
									/>
									<span className='ob-disc'>
										<Crest
											logo={resolveLeagueLogoUrl(league.id, leagueLogos[league.id], 'light')}
											abbreviation={toLeagueInitials(league)}
											className='ob-league-logo'
											loading='eager'
										/>
									</span>
									<span className='ob-tile-name' aria-hidden='true'>{tileLeagueName(league.label, sportType)}</span>
									<TileCheck />
								</label>
							);
						})}
					</div>
				</section>
			);
		})}
	</OnboardingStep>
);

export default onboardingLeaguePicker;

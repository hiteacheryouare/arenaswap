import { useState } from 'react';
import { i18n } from '#i18n';
import { resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, Team } from '@arenaswap/core/types';
import BoardCrest from '@arenaswap/ui/src/components/boardCrest';
import Crest from '@arenaswap/ui/src/components/crest';
import useDocumentTheme from '@arenaswap/ui/src/components/useDocumentTheme';
import WalkthroughFrame from './walkthroughFrame';
import { bucks, chiefs, eagles } from './walkthroughMocks';

interface walkthroughStepLeaguesFavoritesProps {
	onNext: () => void;
	onBack: () => void;
}

type tab = 'leagues' | 'favorites';

const tourLeagues: { id: LeagueId; label: string }[] = [
	{ id: 'nfl', label: 'NFL' },
	{ id: 'nba', label: 'NBA' },
	{ id: 'nhl', label: 'NHL' },
	{ id: 'mlb', label: 'MLB' },
];

const tourTeams = [
	{ key: 'eagles', team: eagles, league: 'NFL' },
	{ key: 'chiefs', team: chiefs, league: 'NFL' },
	{ key: 'bucks', team: bucks, league: 'NBA' },
] as const;

const cardSurface = { dark: '#1a1d22', light: '#ffffff' } as const;

const walkthroughStepLeaguesFavorites = ({ onNext, onBack }: walkthroughStepLeaguesFavoritesProps) => {
	const theme = useDocumentTheme();
	const [tab, setTab] = useState<tab>('leagues');
	const [leagues, setLeagues] = useState<Record<string, boolean>>({ nfl: true, nba: true, nhl: false, mlb: false });
	const [starred, setStarred] = useState<Record<string, boolean>>({ eagles: false, chiefs: false, bucks: false });
	const anyStarred = Object.values(starred).some(Boolean);

	const tabButton = (value: tab, label: string) => (
		<li className='nav-item' role='presentation'>
			<button
				type='button'
				role='tab'
				id={`wt-tab-${value}`}
				aria-controls='wt-tab-panel'
				aria-selected={tab === value}
				className={`nav-link${tab === value ? ' active' : ''}`}
				onClick={() => setTab(value)}
			>
				{label}
			</button>
		</li>
	);

	return (
		<WalkthroughFrame
			step={7}
			stepLabel={i18n.t('stepLeaguesFavorites.step', [7, 8])}
			title={i18n.t('stepLeaguesFavorites.title')}
			lede={i18n.t('stepLeaguesFavorites.subtitle')}
			backLabel={i18n.t('stepLeaguesFavorites.back')}
			onBack={onBack}
			nextLabel={i18n.t('stepLeaguesFavorites.next')}
			onNext={onNext}
		>
			<ul className='nav nav-underline wt-tabs' role='tablist'>
				{tabButton('leagues', i18n.t('stepLeaguesFavorites.tabLeagues'))}
				{tabButton('favorites', i18n.t('stepLeaguesFavorites.tabFavorites'))}
			</ul>

			<div id='wt-tab-panel' role='tabpanel' aria-labelledby={`wt-tab-${tab}`} className='wt-panel'>
				<p className='wt-note'>
					{tab === 'leagues' ? i18n.t('stepLeaguesFavorites.leaguesExplain') : i18n.t('stepLeaguesFavorites.favoritesExplain')}
				</p>
				{tab === 'leagues' ? (
					<div className='wt-card'>
						{tourLeagues.map(league => (
							<div key={league.id} className='wt-control wt-line'>
								<span className='wt-disc'>
									<Crest logo={resolveLeagueLogoUrl(league.id, undefined, 'light')} abbreviation={league.label} className='wt-league-logo' />
								</span>
								<span className='wt-label'>{league.label}</span>
								<div className='form-check form-switch m-0'>
									<input
										className='form-check-input'
										type='checkbox'
										role='switch'
										checked={leagues[league.id]}
										aria-checked={leagues[league.id]}
										onChange={() => setLeagues(previous => ({ ...previous, [league.id]: !previous[league.id] }))}
										aria-label={i18n.t('stepLeaguesFavorites.toggleAriaLabel', { label: league.label })}
									/>
								</div>
							</div>
						))}
					</div>
				) : (
					<>
						<div className='wt-card'>
							{tourTeams.map(({ key, team, league }) => (
								<div key={key} className='wt-control wt-line'>
									<BoardCrest team={{ ...team, score: 0 } as Team} size={28} surface={cardSurface[theme]} color={team.color} />
									<span className='wt-label'>
										{team.name}
										<small>{league}</small>
									</span>
									<button
										type='button'
										className={`as-icon wt-star${starred[key] ? ' is-on' : ''}`}
										aria-pressed={starred[key]}
										onClick={() => setStarred(previous => ({ ...previous, [key]: !previous[key] }))}
										aria-label={starred[key] ? i18n.t('stepLeaguesFavorites.unstarAriaLabel', { team: team.name }) : i18n.t('stepLeaguesFavorites.starAriaLabel', { team: team.name })}
									>
										<i className={`bi ${starred[key] ? 'bi-star-fill' : 'bi-star'}`} aria-hidden='true' />
									</button>
								</div>
							))}
						</div>
						{anyStarred && (
							<div className='as-notice is-quiet wt-bonus'>
								<i className='bi bi-star-fill as-notice-icon' aria-hidden='true' />
								<span className='as-notice-copy'>{i18n.t('stepLeaguesFavorites.favoritesBonusHint')}</span>
							</div>
						)}
					</>
				)}
			</div>

			<p className='wt-body'>
				{tab === 'leagues' ? i18n.t('stepLeaguesFavorites.leaguesBody') : i18n.t('stepLeaguesFavorites.favoritesBody')}
			</p>
		</WalkthroughFrame>
	);
};

export default walkthroughStepLeaguesFavorites;

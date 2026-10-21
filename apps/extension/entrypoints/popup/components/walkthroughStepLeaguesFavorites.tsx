import { useState } from 'react';
import { i18n } from '#i18n';
import ToggleSwitch from '@arenaswap/ui/src/components/toggleSwitch';
import FlowStepper from './flowStepper';
import focusStepTitle from './stepTitleFocus';

interface walkthroughStepLeaguesFavoritesProps {
	onNext: () => void;
	onBack: () => void;
}

interface LeagueRowProps {
	label: string;
	color: string;
	enabled: boolean;
	onToggle: () => void;
}

const LeagueRow = ({ label, color, enabled, onToggle }: LeagueRowProps) => (
	<div className='d-flex align-items-center justify-content-between py-1'>
		<div className='d-flex align-items-center gap-3'>
			<span
				className='badge fw-bold motion-tint'
				style={{ backgroundColor: enabled ? color : 'transparent', color: enabled ? '#fff' : 'var(--as-fg-3)', border: `1px solid ${enabled ? color : 'var(--as-fg-3)'}`, minWidth: '3rem' }}
			>
				{label}
			</span>
		</div>
		<ToggleSwitch
			checked={enabled}
			onChange={onToggle}
			aria-label={i18n.t('stepLeaguesFavorites.toggleAriaLabel', { label })}
		/>
	</div>
);

interface TeamRowProps {
	name: string;
	abbr: string;
	color: string;
	starred: boolean;
	onStar: () => void;
}

const TeamRow = ({ name, abbr, color, starred, onStar }: TeamRowProps) => (
	<div className='d-flex align-items-center justify-content-between py-1'>
		<div className='d-flex align-items-center gap-3'>
			<div
				className='d-flex align-items-center justify-content-center rounded fw-bold'
				style={{ backgroundColor: color, color: '#fff', width: '2rem', height: '2rem', fontSize: '0.6rem' }}
			>
				{abbr}
			</div>
			<span className='fg-body small'>{name}</span>
		</div>
		<button
			type='button'
			className='btn btn-sm p-0 motion-tint'
			style={{ background: 'none', border: 'none', color: starred ? 'var(--as-warning-ink)' : 'var(--as-fg-3)', fontSize: '1rem', lineHeight: 1 }}
			onClick={onStar}
			aria-label={starred ? i18n.t('stepLeaguesFavorites.unstarAriaLabel', { team: name }) : i18n.t('stepLeaguesFavorites.starAriaLabel', { team: name })}
		>
			<i className={starred ? 'bi bi-star-fill' : 'bi bi-star'} />
		</button>
	</div>
);

const walkthroughStepLeaguesFavorites = ({ onNext, onBack }: walkthroughStepLeaguesFavoritesProps) => {
	const [tab, setTab] = useState<'leagues' | 'favorites'>('leagues');
	const [leagues, setLeagues] = useState({ nfl: true, nba: true, nhl: false, mlb: false });
	const [starred, setStarred] = useState({ eagles: false, chiefs: false, bucks: false });

	const toggleLeague = (key: keyof typeof leagues) =>
		setLeagues(prev => ({ ...prev, [key]: !prev[key] }));
	const toggleStar = (key: keyof typeof starred) =>
		setStarred(prev => ({ ...prev, [key]: !prev[key] }));

	return (
		<div className='popup-container d-flex flex-column'>
			<FlowStepper step={8} total={9} className='pt-5 pb-3' />

			<div className='fw-bold fs-lg text-center mb-1 popup-step-title' role='heading' aria-level={1} tabIndex={-1} ref={focusStepTitle} data-step-title>{i18n.t('stepLeaguesFavorites.title')}</div>
			<div className='fg-secondary small text-center mb-5 lh-md'>
				{i18n.t('stepLeaguesFavorites.subtitle')}
			</div>

			<div className='d-flex gap-1 mb-3'>
				<button
					type='button'
					className={`btn btn-sm flex-grow-1 ${tab === 'leagues' ? 'btn-solid theme-primary' : 'btn-outline theme-accent'}`}
					onClick={() => setTab('leagues')}
				>
					<i className='bi bi-trophy me-1' />
					{i18n.t('stepLeaguesFavorites.tabLeagues')}
				</button>
				<button
					type='button'
					className={`btn btn-sm flex-grow-1 ${tab === 'favorites' ? 'btn-solid theme-warning' : 'btn-outline theme-accent'}`}
					onClick={() => setTab('favorites')}
				>
					<i className='bi bi-star me-1' />
					{i18n.t('stepLeaguesFavorites.tabFavorites')}
				</button>
			</div>

			<div className='border border-subtle-accent rounded p-3 mb-5' style={{ minHeight: '9rem' }}>
				{tab === 'leagues' ? (
					<>
						<p className='fg-secondary mb-3 lh-md' style={{ fontSize: '0.72rem' }}>
							{i18n.t('stepLeaguesFavorites.leaguesExplain')}
						</p>
						<LeagueRow label='NFL' color='#013369' enabled={leagues.nfl} onToggle={() => toggleLeague('nfl')} />
						<LeagueRow label='NBA' color='#C9082A' enabled={leagues.nba} onToggle={() => toggleLeague('nba')} />
						<LeagueRow label='NHL' color='#000099' enabled={leagues.nhl} onToggle={() => toggleLeague('nhl')} />
						<LeagueRow label='MLB' color='#002D72' enabled={leagues.mlb} onToggle={() => toggleLeague('mlb')} />
					</>
				) : (
					<>
						<p className='fg-secondary mb-3 lh-md' style={{ fontSize: '0.72rem' }}>
							{i18n.t('stepLeaguesFavorites.favoritesExplain')}
						</p>
						<TeamRow name='Philadelphia Eagles' abbr='PHI' color='#004C54' starred={starred.eagles} onStar={() => toggleStar('eagles')} />
						<TeamRow name='Kansas City Chiefs' abbr='KC' color='#E31837' starred={starred.chiefs} onStar={() => toggleStar('chiefs')} />
						<TeamRow name='Milwaukee Bucks' abbr='MIL' color='#00471B' starred={starred.bucks} onStar={() => toggleStar('bucks')} />
						{(starred.eagles || starred.chiefs || starred.bucks) && (
							<div
								className='mt-3 rounded px-3 py-1 small'
								style={{ backgroundColor: 'color-mix(in srgb, var(--as-warning-base) 12%, transparent)', color: 'var(--as-warning-ink)', fontSize: '0.68rem' }}
							>
								<i className='bi bi-star-fill me-1' />
								{i18n.t('stepLeaguesFavorites.favoritesBonusHint')}
							</div>
						)}
					</>
				)}
			</div>

			<p className='fg-secondary small lh-md'>
				{tab === 'leagues'
					? i18n.t('stepLeaguesFavorites.leaguesBody')
					: i18n.t('stepLeaguesFavorites.favoritesBody')}
			</p>

			<div className='d-flex gap-3 mt-auto'>
				<button type='button' className='btn btn-solid theme-accent flex-grow-1' onClick={onBack}>
					<i className='bi bi-arrow-left' /> {i18n.t('stepLeaguesFavorites.back')}
				</button>
				<button type='button' className='btn btn-solid theme-primary flex-grow-1' onClick={onNext}>
					{i18n.t('stepLeaguesFavorites.next')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepLeaguesFavorites;

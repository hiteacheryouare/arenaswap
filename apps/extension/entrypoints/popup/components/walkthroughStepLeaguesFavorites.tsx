import { useState } from 'react';
import { i18n } from '#i18n';

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
		<div className='d-flex align-items-center gap-2'>
			<span
				className='badge fw-bold'
				style={{ backgroundColor: enabled ? color : 'transparent', color: enabled ? '#fff' : '#6c757d', border: `1px solid ${enabled ? color : '#6c757d'}`, minWidth: '3rem', transition: 'all 0.2s' }}
			>
				{label}
			</span>
		</div>
		<div className='form-check form-switch mb-0'>
			<input
				className='form-check-input'
				type='checkbox'
				checked={enabled}
				onChange={onToggle}
				aria-label={`Toggle ${label}`}
			/>
		</div>
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
		<div className='d-flex align-items-center gap-2'>
			<div
				className='d-flex align-items-center justify-content-center rounded fw-bold'
				style={{ backgroundColor: color, color: '#fff', width: '2rem', height: '2rem', fontSize: '0.6rem' }}
			>
				{abbr}
			</div>
			<span className='text-body small'>{name}</span>
		</div>
		<button
			type='button'
			className='btn btn-sm p-0'
			style={{ background: 'none', border: 'none', color: starred ? '#f1c40f' : '#6c757d', fontSize: '1rem', lineHeight: 1, transition: 'color 0.2s' }}
			onClick={onStar}
			aria-label={`${starred ? 'Unstar' : 'Star'} ${name}`}
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
			<div className='small text-body-secondary text-uppercase text-center pt-3 pb-2'>
				{i18n.t('stepLeaguesFavorites.step', [7, 8])}
			</div>

			<div className='fw-bold fs-5 text-center mb-1'>{i18n.t('stepLeaguesFavorites.title')}</div>
			<div className='text-body-secondary small text-center mb-3 lh-base'>
				{i18n.t('stepLeaguesFavorites.subtitle')}
			</div>

			<div className='d-flex gap-1 mb-2'>
				<button
					type='button'
					className={`btn btn-sm flex-grow-1 ${tab === 'leagues' ? 'btn-primary' : 'btn-outline-secondary'}`}
					onClick={() => setTab('leagues')}
				>
					<i className='bi bi-trophy me-1' />
					{i18n.t('stepLeaguesFavorites.tabLeagues')}
				</button>
				<button
					type='button'
					className={`btn btn-sm flex-grow-1 ${tab === 'favorites' ? 'btn-warning' : 'btn-outline-secondary'}`}
					onClick={() => setTab('favorites')}
				>
					<i className='bi bi-star me-1' />
					{i18n.t('stepLeaguesFavorites.tabFavorites')}
				</button>
			</div>

			<div className='border border-secondary-subtle rounded p-2 mb-3' style={{ minHeight: '9rem' }}>
				{tab === 'leagues' ? (
					<>
						<p className='text-body-secondary mb-2 lh-base' style={{ fontSize: '0.72rem' }}>
							{i18n.t('stepLeaguesFavorites.leaguesExplain')}
						</p>
						<LeagueRow label='NFL' color='#013369' enabled={leagues.nfl} onToggle={() => toggleLeague('nfl')} />
						<LeagueRow label='NBA' color='#C9082A' enabled={leagues.nba} onToggle={() => toggleLeague('nba')} />
						<LeagueRow label='NHL' color='#000099' enabled={leagues.nhl} onToggle={() => toggleLeague('nhl')} />
						<LeagueRow label='MLB' color='#002D72' enabled={leagues.mlb} onToggle={() => toggleLeague('mlb')} />
					</>
				) : (
					<>
						<p className='text-body-secondary mb-2 lh-base' style={{ fontSize: '0.72rem' }}>
							{i18n.t('stepLeaguesFavorites.favoritesExplain')}
						</p>
						<TeamRow name='Philadelphia Eagles' abbr='PHI' color='#004C54' starred={starred.eagles} onStar={() => toggleStar('eagles')} />
						<TeamRow name='Kansas City Chiefs' abbr='KC' color='#E31837' starred={starred.chiefs} onStar={() => toggleStar('chiefs')} />
						<TeamRow name='Milwaukee Bucks' abbr='MIL' color='#00471B' starred={starred.bucks} onStar={() => toggleStar('bucks')} />
						{(starred.eagles || starred.chiefs || starred.bucks) && (
							<div
								className='mt-2 rounded px-2 py-1 small'
								style={{ backgroundColor: 'rgba(241,196,15,0.12)', color: '#f1c40f', fontSize: '0.68rem' }}
							>
								<i className='bi bi-star-fill me-1' />
								{i18n.t('stepLeaguesFavorites.favoritesBonusHint')}
							</div>
						)}
					</>
				)}
			</div>

			<p className='text-body-secondary small lh-base'>
				{tab === 'leagues'
					? i18n.t('stepLeaguesFavorites.leaguesBody')
					: i18n.t('stepLeaguesFavorites.favoritesBody')}
			</p>

			<div className='d-flex gap-2 mt-auto'>
				<button type='button' className='btn btn-secondary flex-grow-1' onClick={onBack}>
					<i className='bi bi-arrow-left' /> {i18n.t('stepLeaguesFavorites.back')}
				</button>
				<button type='button' className='btn btn-primary flex-grow-1' onClick={onNext}>
					{i18n.t('stepLeaguesFavorites.next')} <i className='bi bi-arrow-right' />
				</button>
			</div>
		</div>
	);
};

export default walkthroughStepLeaguesFavorites;

import { useState } from 'react';
import type { EspnTeamEntry } from '@arenaswap/core';
import type { LeagueId } from '@arenaswap/core/types';
import { leagueOrder } from '../popupHelpers';

interface onboardingTeamPickerProps {
	teams: EspnTeamEntry[];
	isLoading: boolean;
	hasError: boolean;
	selectedFavorites: Set<string>;
	onToggleFavorite: (key: string) => void;
	onBack: () => void;
	onSkip: () => void;
	onDone: () => void;
}

const collegeLeagues = new Set<LeagueId>(['ncaab', 'ncaaw', 'ncaaf', 'ncaamh']);

const TeamLogo = ({ team }: { team: EspnTeamEntry }) => {
	const [failed, setFailed] = useState(false);
	if (!team.logo || failed) {
		return (
			<span className='league-toggle-logo league-toggle-logo-fallback d-inline-flex align-items-center justify-content-center fw-bold' style={{ fontSize: '0.55rem' }}>
				{team.abbreviation.slice(0, 3)}
			</span>
		);
	}
	return (
		<img
			src={team.logo}
			alt={team.name}
			className='league-toggle-logo'
			loading='lazy'
			onError={() => setFailed(true)}
		/>
	);
};

const onboardingTeamPicker = ({
	teams,
	isLoading,
	hasError,
	selectedFavorites,
	onToggleFavorite,
	onBack,
	onSkip,
	onDone,
}: onboardingTeamPickerProps) => {
	const [query, setQuery] = useState('');
	const lowerQuery = query.toLowerCase();

	const filteredTeams = query
		? teams.filter(t => t.name.toLowerCase().includes(lowerQuery) || t.abbreviation.toLowerCase().includes(lowerQuery))
		: teams;

	const grouped = filteredTeams.reduce<Partial<Record<LeagueId, EspnTeamEntry[]>>>((acc, team) => {
		(acc[team.leagueId] ??= []).push(team);
		return acc;
	}, {});

	const sortedLeagues = (Object.keys(grouped) as LeagueId[]).sort(
		(a, b) => (leagueOrder[a] ?? 99) - (leagueOrder[b] ?? 99)
	);

	const hasCollegeLeague = teams.some(t => collegeLeagues.has(t.leagueId));

	return (
		<div className='popup-container d-flex flex-column' style={{ minHeight: 0 }}>
			<div className='d-flex align-items-center gap-2 mb-1'>
				<button className='btn btn-link btn-sm p-0 text-body-secondary' onClick={onBack} style={{ fontSize: '0.8rem' }}>
					← Back
				</button>
				<span className='text-body-secondary ms-auto' style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>STEP 2 OF 2</span>
			</div>
			<h2 className='fw-bold lh-sm mb-2' style={{ fontSize: '1.1rem' }}>Pick your teams</h2>
			<p className='text-body-secondary mb-2' style={{ fontSize: '0.78rem' }}>
				Optional — favorites get a scoring bonus so ArenaSwap favors them.
			</p>

			<input
				type='search'
				className='form-control form-control-sm mb-2'
				placeholder={hasCollegeLeague ? 'Search teams (required for college leagues)…' : 'Search teams…'}
				value={query}
				onChange={e => setQuery(e.target.value)}
				autoFocus
			/>

			{isLoading && (
				<div className='d-flex justify-content-center align-items-center mt-4'>
					<div className='spinner-border spinner-border-sm' role='status'>
						<span className='visually-hidden'>Loading teams…</span>
					</div>
					<span className='ms-2 text-body-secondary' style={{ fontSize: '0.8rem' }}>Loading teams…</span>
				</div>
			)}

			{hasError && !isLoading && (
				<div className='text-body-secondary text-center mt-3' style={{ fontSize: '0.8rem' }}>
					Couldn't load teams. You can skip and add favorites later via game cards.
				</div>
			)}

			{!isLoading && !hasError && (
				<div className='overflow-auto flex-grow-1'>
					{sortedLeagues.map(leagueId => (
						<div key={leagueId}>
							<div className='fw-bold text-uppercase popup-section-label mt-2'>{leagueId.toUpperCase()}</div>
							{(grouped[leagueId] ?? []).map(team => {
								const key = `${leagueId}:${team.id}`;
								const isFav = selectedFavorites.has(key);
								return (
									<div key={team.id} className='d-flex align-items-center justify-content-between gap-2 mt-1 league-toggle-row'>
										<div className='d-flex align-items-center gap-2 min-w-0'>
											<TeamLogo team={team} />
											<span className='fw-semibold text-body lh-sm' style={{ fontSize: '0.82rem' }}>{team.name}</span>
										</div>
										<button
											type='button'
											className={`btn btn-link btn-sm p-0 ${isFav ? 'text-warning' : 'text-body-secondary'}`}
											onClick={() => onToggleFavorite(key)}
											aria-label={isFav ? `Remove ${team.name} from favorites` : `Add ${team.name} to favorites`}
										>
											<i className={isFav ? 'bi bi-star-fill' : 'bi bi-star'} style={{ fontSize: '1rem' }} />
										</button>
									</div>
								);
							})}
						</div>
					))}
					{sortedLeagues.length === 0 && query && (
						<div className='text-body-secondary text-center mt-3' style={{ fontSize: '0.8rem' }}>No teams match "{query}"</div>
					)}
				</div>
			)}

			<div className='d-flex align-items-center justify-content-between mt-3 pt-2' style={{ borderTop: '1px solid var(--bs-border-color)' }}>
				<button type='button' className='btn btn-link btn-sm p-0 text-body-secondary' onClick={onSkip}>
					Skip
				</button>
				<button type='button' className='btn btn-primary btn-sm' onClick={onDone}>
					Done →
				</button>
			</div>
		</div>
	);
};

export default onboardingTeamPicker;

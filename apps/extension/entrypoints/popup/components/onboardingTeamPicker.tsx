import { useState } from 'react';
import type { EspnTeamEntry } from '@arenaswap/core';
import type { LeagueId } from '@arenaswap/core/types';
import { leagueLabels, leagueOrder } from '../popupHelpers';

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

const TeamLogo = ({ team }: { team: EspnTeamEntry }) => {
	const [failed, setFailed] = useState(false);
	const abbr = (team.abbreviation ?? team.name ?? '?').slice(0, 3);
	if (!team.logo || failed) {
		return (
			<span className='league-toggle-logo league-toggle-logo-fallback d-inline-flex align-items-center justify-content-center fw-bold small'>
				{abbr}
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
		? teams.filter(t =>
			(t.name ?? '').toLowerCase().includes(lowerQuery)
			|| (t.abbreviation ?? '').toLowerCase().includes(lowerQuery)
		)
		: teams;

	const grouped = filteredTeams.reduce<Partial<Record<LeagueId, EspnTeamEntry[]>>>((acc, team) => {
		(acc[team.leagueId] ??= []).push(team);
		return acc;
	}, {});

	const sortedLeagues = (Object.keys(grouped) as LeagueId[]).sort(
		(a, b) => (leagueOrder[a] ?? 99) - (leagueOrder[b] ?? 99)
	);

	return (
		<div className='popup-container d-flex flex-column'>
			<div className='d-flex align-items-center mb-1'>
				<button className='btn btn-link btn-sm p-0 text-body-secondary small' onClick={onBack}>
					<i className='bi bi-arrow-left me-1' />Back
				</button>
				<span className='small text-body-secondary text-uppercase ms-auto'>Step 2 of 2</span>
			</div>

			<div className='fw-bold lh-sm mb-1 fs-5'>Pick your teams</div>
			<div className='setting-explainer mb-2'>
				Favorites get a scoring bonus so ArenaSwap favors those games.
			</div>

			<input
				type='search'
				className='form-control form-control-sm mb-2'
				placeholder='Search teams…'
				value={query}
				onChange={e => setQuery(e.target.value)}
				autoFocus
			/>

			{isLoading && (
				<div className='d-flex justify-content-center align-items-center mt-4 gap-2'>
					<div className='spinner-border spinner-border-sm' role='status'>
						<span className='visually-hidden'>Loading teams…</span>
					</div>
					<span className='small text-body-secondary'>Loading teams…</span>
				</div>
			)}

			{hasError && !isLoading && (
				<div className='small text-body-secondary text-center mt-3'>
					Couldn't load teams. You can skip and add favorites later via game cards.
				</div>
			)}

			{!isLoading && !hasError && (
				<div className='overflow-auto flex-grow-1'>
					{sortedLeagues.map(leagueId => (
						<div key={leagueId}>
							<div className='fw-bold text-uppercase popup-section-label mt-2'>
								{leagueLabels[leagueId] ?? leagueId.toUpperCase()}
							</div>
							{(grouped[leagueId] ?? []).map(team => {
								const key = `${leagueId}:${team.id}`;
								const isFav = selectedFavorites.has(key);
								return (
									<div key={team.id} className='d-flex align-items-center justify-content-between gap-2 mt-1 league-toggle-row'>
										<div className='d-flex align-items-center gap-2 min-w-0'>
											<TeamLogo team={team} />
											<span className='fw-semibold text-body lh-sm small'>{team.name}</span>
										</div>
										<button
											type='button'
											className={`btn btn-link btn-sm p-0 ${isFav ? 'text-warning' : 'text-body-secondary'}`}
											onClick={() => onToggleFavorite(key)}
											aria-label={isFav ? `Remove ${team.name} from favorites` : `Add ${team.name} to favorites`}
										>
											<i className={`bi ${isFav ? 'bi-star-fill' : 'bi-star'} fs-6`} />
										</button>
									</div>
								);
							})}
						</div>
					))}
					{sortedLeagues.length === 0 && query && (
						<div className='small text-body-secondary text-center mt-3'>
							No teams match &ldquo;{query}&rdquo;
						</div>
					)}
				</div>
			)}

			<div className='d-flex align-items-center justify-content-between mt-3 pt-2 border-top'>
				<button type='button' className='btn btn-link btn-sm p-0 text-body-secondary' onClick={onSkip}>
					Skip
				</button>
				<button type='button' className='btn btn-primary btn-sm' onClick={onDone}>
					Done <i className='bi bi-check-lg' />
				</button>
			</div>
		</div>
	);
};

export default onboardingTeamPicker;

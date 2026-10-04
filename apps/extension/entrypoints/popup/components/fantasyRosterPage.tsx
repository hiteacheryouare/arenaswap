import { useEffect, useState, type ReactNode } from 'react';
import { i18n } from '#i18n';
import {
	defenseRosterEntry,
	fantasyLeagues,
	fantasyRosterLimit,
	fetchTeamsForLeagues,
	foldName,
	logWarn,
	resolveRosterEntry,
	searchPlayers,
} from '@arenaswap/core';
import type { EspnTeamEntry, FantasyRosterEntry, PlayerSearchResult } from '@arenaswap/core';
import type { FantasyPosition } from 'powerscore';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';
import PlayerShot from './playerShot';
import { leagueLabels } from '../popupHelpers';
import { matchesTeamQuery } from '../../../utils/favoriteTeams';
import { addToRoster, groupRosterByLeague, isRosterFull, removeFromRoster, rosterHeadshot, rosterKey } from '../../../utils/fantasyRoster';

export interface fantasyRosterServices {
	searchPlayers: (query: string, init?: { signal?: AbortSignal }) => Promise<PlayerSearchResult[]>;
	resolveRosterEntry: (result: PlayerSearchResult) => Promise<FantasyRosterEntry>;
	fetchTeams: () => Promise<EspnTeamEntry[]>;
}

const liveServices: fantasyRosterServices = {
	searchPlayers,
	resolveRosterEntry,
	fetchTeams: () => fetchTeamsForLeagues([...fantasyLeagues]),
};

interface fantasyRosterPageProps {
	roster: readonly FantasyRosterEntry[];
	onRosterChange: (update: (current: FantasyRosterEntry[]) => FantasyRosterEntry[]) => void;
	services?: fantasyRosterServices;
}

interface searchOutcome {
	query: string;
	results?: PlayerSearchResult[];
	failed?: boolean;
}

export const searchDebounceMs = 250;

const shotColor = '#e5e7eb';

const without = (set: ReadonlySet<string>, key: string) => new Set([...set].filter(item => item !== key));

const positionLabelKeys: Partial<Record<FantasyPosition, 'fantasy.positionDst' | 'fantasy.positionPitcher' | 'fantasy.positionHitter'>> = {
	DST: 'fantasy.positionDst',
	P: 'fantasy.positionPitcher',
	H: 'fantasy.positionHitter',
};

const positionLabel = (position: FantasyPosition): string => {
	const key = positionLabelKeys[position];
	if (key) return i18n.t(key);
	return position === 'player' ? '' : position;
};

const joinDetail = (first: string | undefined, second: string | undefined): string => (
	first && second ? i18n.t('fantasy.detailPair', { first, second }) : first || second || ''
);

interface pickRowProps {
	shot: ReactNode;
	name: string;
	detail: string;
	error?: string;
	state: 'add' | 'added' | 'pending';
	disabled: boolean;
	onClick: () => void;
}

const PickRow = ({ shot, name, detail, error, state, disabled, onClick }: pickRowProps) => (
	<button
		type='button'
		className='d-flex align-items-center justify-content-between gap-2 mt-1 py-1 team-pick-row fantasy-pick-row'
		onClick={onClick}
		disabled={disabled}
		aria-busy={state === 'pending' ? 'true' : undefined}
		aria-label={state === 'added' ? i18n.t('fantasy.removePlayer', { name }) : i18n.t('fantasy.addPlayer', { name })}
	>
		<span className='d-flex align-items-center gap-2 min-w-0'>
			{shot}
			<span className='d-block min-w-0'>
				<span className='d-block fw-semibold text-body lh-sm small text-truncate'>{name}</span>
				{error
					? <span className='d-block setting-explainer lh-sm text-danger'>{error}</span>
					: detail && <span className='d-block setting-explainer lh-sm text-truncate'>{detail}</span>}
			</span>
		</span>
		{state === 'pending'
			? <span className='spinner-border spinner-border-sm flex-shrink-0 fantasy-pick-spinner' aria-hidden='true' />
			: <i className={`bi ${state === 'added' ? 'bi-check2' : 'bi-plus-lg'} flex-shrink-0 fantasy-pick-icon`} data-added={state === 'added'} aria-hidden='true' />}
	</button>
);

const playerShot = (name: string, headshot: string | undefined) => (
	<PlayerShot url={headshot} name={name} color={shotColor} className='fantasy-player-shot' />
);

const teamShot = (team: EspnTeamEntry | undefined, name: string) => (
	<CrestDisc
		logo={team?.logo}
		abbreviation={(team?.abbreviation ?? name).slice(0, 3)}
		discClassName='team-pick-crest flex-shrink-0'
		crestClassName='team-pick-crest-logo'
		loading='lazy'
	/>
);

const fantasyRosterPage = ({ roster, onRosterChange, services = liveServices }: fantasyRosterPageProps) => {
	const [query, setQuery] = useState('');
	const [outcome, setOutcome] = useState<searchOutcome>();
	const [attempt, setAttempt] = useState(0);
	const [teams, setTeams] = useState<EspnTeamEntry[]>([]);
	const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
	const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

	const searchable = foldName(query).length >= 2;
	const current = searchable && outcome?.query === query ? outcome : undefined;
	const searching = searchable && !current;

	useEffect(() => {
		let cancelled = false;
		services.fetchTeams()
			.then(fetched => { if (!cancelled) setTeams(fetched); })
			.catch(err => logWarn('Could not load teams for the fantasy roster.', err));
		return () => { cancelled = true; };
	}, [services]);

	useEffect(() => {
		if (!searchable) return;
		const controller = new AbortController();
		const timer = setTimeout(() => {
			services.searchPlayers(query, { signal: controller.signal })
				.then(results => setOutcome({ query, results }))
				.catch(err => {
					if (controller.signal.aborted) return;
					logWarn('Player search failed.', err);
					setOutcome({ query, failed: true });
				});
		}, searchDebounceMs);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [query, searchable, attempt, services]);

	const full = isRosterFull(roster);
	const rostered = new Set(roster.map(rosterKey));
	const teamById = new Map(teams.map(team => [`${team.leagueId}:${team.id}`, team]));

	const remove = (key: string) => onRosterChange(currentRoster => removeFromRoster(currentRoster, key));

	const addPlayer = (result: PlayerSearchResult) => {
		const key = rosterKey(result);
		setPending(previous => new Set(previous).add(key));
		setFailed(previous => without(previous, key));
		services.resolveRosterEntry(result)
			.then(entry => onRosterChange(currentRoster => addToRoster(currentRoster, entry)))
			.catch(err => {
				logWarn(`Could not add ${result.name} to the fantasy roster.`, err);
				setFailed(previous => new Set(previous).add(key));
			})
			.finally(() => setPending(previous => without(previous, key)));
	};

	const togglePlayer = (result: PlayerSearchResult) => {
		const key = rosterKey(result);
		if (rostered.has(key)) remove(key);
		else addPlayer(result);
	};

	const toggleDefense = (team: EspnTeamEntry) => {
		const entry = defenseRosterEntry('nfl', team);
		const key = rosterKey(entry);
		if (rostered.has(key)) remove(key);
		else onRosterChange(currentRoster => addToRoster(currentRoster, entry));
	};

	const defenses = searchable
		? teams.filter(team => team.leagueId === 'nfl' && matchesTeamQuery(team, query.trim()))
		: [];
	const players = current?.results ?? [];

	const searchResults = (
		<>
			{full && <div className='setting-explainer mt-1 mb-2'>{i18n.t('fantasy.rosterFull')}</div>}

			{searching && (
				<div className='d-flex align-items-center gap-2 mt-2 setting-explainer' role='status'>
					<span className='spinner-border spinner-border-sm fantasy-pick-spinner' aria-hidden='true' />
					{i18n.t('fantasy.searching')}
				</div>
			)}

			{current?.failed && (
				<div className='text-center mt-3'>
					<div className='small text-danger mb-2'>{i18n.t('fantasy.searchError')}</div>
					<button type='button' className='btn btn-sm btn-outline-secondary' onClick={() => {
						setOutcome(undefined);
						setAttempt(previous => previous + 1);
					}}>{i18n.t('teamPicker.retry')}</button>
				</div>
			)}

			{players.length > 0 && (
				<div>
					<div className='fw-bold popup-section-label mt-2'>{i18n.t('fantasy.playersHeading')}</div>
					{players.map(result => {
						const key = rosterKey(result);
						const isPending = pending.has(key);
						const isAdded = rostered.has(key);
						return (
							<PickRow
								key={key}
								shot={playerShot(result.name, result.headshot)}
								name={result.name}
								detail={joinDetail(result.teamName, leagueLabels[result.league])}
								error={failed.has(key) ? i18n.t('fantasy.addFailed') : undefined}
								state={isPending ? 'pending' : isAdded ? 'added' : 'add'}
								disabled={isPending || (full && !isAdded)}
								onClick={() => togglePlayer(result)}
							/>
						);
					})}
				</div>
			)}

			{defenses.length > 0 && (
				<div>
					<div className='fw-bold popup-section-label mt-2'>{i18n.t('fantasy.defensesHeading')}</div>
					{defenses.map(team => {
						const key = rosterKey(defenseRosterEntry('nfl', team));
						const isAdded = rostered.has(key);
						return (
							<PickRow
								key={key}
								shot={teamShot(team, team.name)}
								name={team.name}
								detail={joinDetail(i18n.t('fantasy.positionDst'), leagueLabels.nfl)}
								state={isAdded ? 'added' : 'add'}
								disabled={full && !isAdded}
								onClick={() => toggleDefense(team)}
							/>
						);
					})}
				</div>
			)}

			{current?.results && players.length === 0 && defenses.length === 0 && (
				<div className='small text-body-secondary text-center mt-3'>{i18n.t('fantasy.noMatch', { query: query.trim() })}</div>
			)}
		</>
	);

	const rosterList = roster.length === 0 ? (
		<div className='setting-explainer mt-2'>{i18n.t('fantasy.rosterEmpty')}</div>
	) : (
		groupRosterByLeague(roster).map(group => (
			<div key={group.league}>
				<div className='fw-bold popup-section-label mt-2'>{leagueLabels[group.league]}</div>
				{group.entries.map(entry => {
					const key = rosterKey(entry);
					const team = teamById.get(`${entry.league}:${entry.teamId}`);
					return (
						<div key={key} className='d-flex align-items-center justify-content-between gap-2 mt-1 py-1 fantasy-roster-row'>
							<span className='d-flex align-items-center gap-2 min-w-0'>
								{entry.position === 'DST' ? teamShot(team, entry.name) : playerShot(entry.name, rosterHeadshot(entry))}
								<span className='d-block min-w-0'>
									<span className='d-block fw-semibold text-body lh-sm small text-truncate'>{entry.name}</span>
									<span className='d-block setting-explainer lh-sm text-truncate'>{joinDetail(positionLabel(entry.position), team?.name)}</span>
								</span>
							</span>
							<button
								type='button'
								className='btn btn-sm btn-link fantasy-roster-remove'
								onClick={() => remove(key)}
								aria-label={i18n.t('fantasy.removePlayer', { name: entry.name })}
							>
								<i className='bi bi-x-lg' aria-hidden='true' />
							</button>
						</div>
					);
				})}
			</div>
		))
	);

	return (
		<div className='d-flex flex-column min-h-0 flex-grow-1'>
			<input
				type='search'
				id='fantasyPlayerSearch'
				className='form-control form-control-sm mb-2'
				placeholder={i18n.t('fantasy.searchPlaceholder')}
				aria-label={i18n.t('fantasy.searchPlaceholder')}
				value={query}
				onChange={e => setQuery(e.target.value)}
				autoComplete='off'
			/>

			{!searchable && (
				<div className='d-flex justify-content-between align-items-baseline'>
					<span className='text-body-secondary setting-toggle-label'>{i18n.t('fantasy.rosterHeading')}</span>
					<span id='fantasyRosterCount' className='fw-semibold setting-value-label'>
						{i18n.t('fantasy.rosterCount', { count: roster.length, limit: fantasyRosterLimit })}
					</span>
				</div>
			)}

			<div className='overflow-auto fantasy-roster-scroll'>
				{searchable ? searchResults : rosterList}
			</div>
		</div>
	);
};

export default fantasyRosterPage;

import { useState } from 'react';
import type { Tabs } from 'webextension-polyfill';
import { SCORE_MAX_TOTAL } from '@arenaswap/core/constants';
import type { ExcitementResult, Game, TabRegistration, Team } from '@arenaswap/core/types';
import TabAssignSelect from './TabAssignSelect';

interface Props {
	game: Game | undefined;
	excitementResult: ExcitementResult | undefined;
	openTabs: Tabs.Tab[];
	registry: TabRegistration[];
	onRegistryChange: (updated: TabRegistration[]) => void;
	formatTabLabel: (tab: Tabs.Tab) => string;
}

const REGULAR_PERIODS: Record<string, number> = { nba: 4, nfl: 4, ncaaf: 4, nhl: 3, mlb: 9, ncaab: 2 };

const formatPeriod = (period: number, sport: string): string => {
	const regular = REGULAR_PERIODS[sport] ?? 2;
	if (period > regular) {
		if (sport === 'nhl') return 'OT';
		return `OT${period - regular}`;
	}
	if (sport === 'ncaab') return period === 1 ? '1H' : '2H';
	if (sport === 'nhl') return `P${period}`;
	if (sport === 'mlb') return `Inn ${period}`;
	return `Q${period}`;
};

const formatClock = (seconds: number): string => {
	const m = Math.floor(seconds / 60);
	const s = String(seconds % 60).padStart(2, '0');
	return `${m}:${s}`;
};

const formatStartTime = (iso: string): string => {
	const d = new Date(iso);
	return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const powerScoreColor = (score: number, max: number): string => {
	const ratio = Math.min(score / max, 1);
	// #8b949e (139,148,158) → #F75C03 (247,92,3)
	const r = Math.round(139 + (247 - 139) * ratio);
	const g = Math.round(148 + (92 - 148) * ratio);
	const b = Math.round(158 + (3 - 158) * ratio);
	return `rgb(${r},${g},${b})`;
};

const LOGO_SIZE = 56;

const TeamLogo = ({ team }: { team: Team }) => {
	const [failed, setFailed] = useState(false);

	if (team.logo && !failed) {
		return (
			<img
				src={team.logo}
				alt={team.abbreviation}
				width={LOGO_SIZE}
				height={LOGO_SIZE}
				onError={() => setFailed(true)}
				className='game-card__team-logo'
			/>
		);
	}

	return (
		<div className='game-card__team-logo-fallback'>
			{team.abbreviation.slice(0, 3)}
		</div>
	);
};

const TeamColumn = ({ team }: { team: Team }) => (
	<div className='game-card__team'>
		<TeamLogo team={team} />
		<span className='game-card__team-name'>{team.abbreviation}</span>
	</div>
);

const GameCard = ({ game, excitementResult, openTabs, registry, onRegistryChange, formatTabLabel }: Props) => {
	if (!game) return null;

	if (game.status === 'pre') {
		return (
			<div className='game-card game-card--pre'>
				<div className='game-card__teams'>
					<TeamColumn team={game.awayTeam} />
					<div className='game-card__scores'>
						<span style={{ fontSize: '0.8rem', color: '#8b949e' }}>vs</span>
						{game.startTime && (
							<span className='game-card__start-time'>
								{formatStartTime(game.startTime)}
							</span>
						)}
					</div>
					<TeamColumn team={game.homeTeam} />
				</div>
				{game.venueName && (
					<div className='game-card__venue'>{game.venueName}</div>
				)}
				<TabAssignSelect
					gameId={game.id}
					openTabs={openTabs}
					registry={registry}
					onChange={onRegistryChange}
					formatTabLabel={formatTabLabel}
				/>
			</div>
		);
	}

	const isOt = game.period > (REGULAR_PERIODS[game.sport] ?? 2);

	return (
		<div className={`game-card${isOt ? ' is-ot' : ''}`}>
			{/* LIVE badge + PowerScore */}
			<div className='game-card__header'>
				<div className='game-card__live-badge'>
					<span className='live-dot' />
					LIVE
				</div>
				{excitementResult && (
					<div
						className='game-card__powerscore'
						style={{ backgroundColor: powerScoreColor(excitementResult.total, SCORE_MAX_TOTAL) }}
					>
						PowerScore: {excitementResult.total} / {SCORE_MAX_TOTAL}
					</div>
				)}
			</div>

			{/* Teams + scores */}
			<div className='game-card__teams'>
				<TeamColumn team={game.awayTeam} />
				<div className='game-card__scores'>
					<div className='game-card__score-row'>
						<span className='game-card__score'>{game.awayTeam.score}</span>
						<span className='game-card__score'>{game.homeTeam.score}</span>
					</div>
					{game.sport !== 'mlb' && (
						<span className='game-card__clock'>
							{formatClock(game.clockSeconds)}
						</span>
					)}
					<span className='game-card__period'>
						{formatPeriod(game.period, game.sport)}
					</span>
				</div>
				<TeamColumn team={game.homeTeam} />
			</div>

			{game.venueName && (
				<div className='game-card__venue'>{game.venueName}</div>
			)}

			{/* Tab assignment */}
			<TabAssignSelect
				gameId={game.id}
				openTabs={openTabs}
				registry={registry}
				onChange={onRegistryChange}
				formatTabLabel={formatTabLabel}
			/>
		</div>
	);
};

export default GameCard;

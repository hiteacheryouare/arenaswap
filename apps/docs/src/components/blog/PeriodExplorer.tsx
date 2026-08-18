import { useState } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';
import { formatPeriod } from '@arenaswap/ui/src/components/gameCardShared';

// One league per period format ArenaSwap actually renders, so the same picker shows quarters,
// halves, periods, and soccer's own extra-time/shootout vocabulary side by side.
const LEAGUES: LeagueId[] = ['nba', 'ncaab', 'nhl', 'epl'];

const buildGame = (league: LeagueId, period: number): Game => ({
	id: 'period-explorer',
	league,
	sportType: leagueConfigMap[league].sportType,
	homeTeam: { id: 'home', name: 'Home', abbreviation: 'HOME', score: 0 },
	awayTeam: { id: 'away', name: 'Away', abbreviation: 'AWAY', score: 0 },
	period,
	clockSeconds: 0,
	status: 'in',
});

const PeriodExplorer = () => {
	const [league, setLeague] = useState<LeagueId>('epl');
	const [period, setPeriod] = useState(5);

	const config = leagueConfigMap[league];
	// The real function every game card and the detail screen call, not a copy of its logic.
	const label = formatPeriod(buildGame(league, period));

	return (
		<div className='period-explorer'>
			<div className='signal-breakdown-controls'>
				<label className='signal-breakdown-control'>
					League
					<select value={league} onChange={e => { setLeague(e.target.value as LeagueId); }}>
						{LEAGUES.map(id => (
							<option key={id} value={id}>{leagueConfigMap[id].label}</option>
						))}
					</select>
				</label>
				<label className='signal-breakdown-control'>
					Period
					<input
						type='number'
						min={1}
						max={config.regularPeriods + 3}
						value={period}
						onChange={e => setPeriod(Number(e.target.value))}
					/>
				</label>
			</div>

			<div className='period-explorer-output'>
				<span className='period-explorer-label'>{label}</span>
				<span className='period-explorer-caption'>
					{config.label} plays {config.regularPeriods} regulation {config.periodFormat}. This is what <code>formatPeriod</code> returns past that point: try it on more periods than the sport has.
				</span>
			</div>
		</div>
	);
};

export default PeriodExplorer;

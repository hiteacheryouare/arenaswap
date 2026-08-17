import { useState } from 'react';
import {
	computePowerScore,
	isPlayFrozen,
	leagueConfigMap,
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
} from 'powerscore';
import type { Game } from 'powerscore';

// Fixed to NBA so the clock and period controls have one concrete shape to react against. The
// point of this demo is the engine's behavior, not league breadth (the Leagues section above
// already covers that). periodSeconds sets the "seconds left" slider's range to a real quarter.
const league = leagueConfigMap.nba;
const periodSeconds = league.periodDurationSecs;
const favoriteBonusPoints = 10; // the extension's own default Favorite Team Bonus

const SIGNALS = [
	{ key: 'closeness', name: 'Closeness', max: scoreMaxCloseness, color: '#22c55e' },
	{ key: 'lateGame', name: 'Late-Game Pressure', max: scoreMaxLateGame, color: '#F75C03' },
	{ key: 'momentum', name: 'Momentum', max: scoreMaxMomentum, color: '#2274A5' },
	{ key: 'leadChanges', name: 'Lead Changes', max: scoreMaxLeadChanges, color: '#F1C40F' },
	{ key: 'comeback', name: 'Comeback Factor', max: scoreMaxComeback, color: '#D90368' },
] as const;

interface SandboxState {
	awayScore: number;
	homeScore: number;
	period: number;
	secondsLeft: number;
	frozen: boolean;
	favorite: boolean;
}

// Named after real calibration targets and the frozen-boost bug, not invented examples.
const PRESETS: Record<string, SandboxState> = {
	'Tied at the buzzer': { awayScore: 96, homeScore: 96, period: 4, secondsLeft: 0, frozen: false, favorite: false },
	'Down to the wire': { awayScore: 101, homeScore: 100, period: 4, secondsLeft: 40, frozen: false, favorite: false },
	'Blowout': { awayScore: 88, homeScore: 118, period: 4, secondsLeft: 20, frozen: false, favorite: false },
	'Halftime, favorite team': { awayScore: 49, homeScore: 54, period: 2, secondsLeft: 0, frozen: true, favorite: true },
};

const DEFAULT_PRESET = 'Tied at the buzzer';

const SignalBreakdown = () => {
	const [state, setState] = useState<SandboxState>(PRESETS[DEFAULT_PRESET]!);

	const game: Game = {
		id: 'sandbox',
		league: 'nba',
		sportType: 'basketball',
		awayTeam: { score: state.awayScore },
		homeTeam: { score: state.homeScore },
		period: state.period,
		clockSeconds: state.secondsLeft,
		intermission: state.frozen,
		status: 'in',
	};

	// The real engine: the same function the background scorer calls on every poll. No history is
	// passed, so momentum, lead changes, and comeback stay at 0: they spike off a run of scoring
	// snapshots across polls, which one live game state can't fake.
	const result = computePowerScore(game);
	// The real predicate the extension gates every boost behind, not a re-implementation of it.
	const frozen = isPlayFrozen(game);
	const favoriteBonus = state.favorite ? favoriteBonusPoints : 0;
	const paidFavoriteBonus = frozen ? 0 : favoriteBonus;
	const total = Math.min(scoreMaxTotal, result.total + paidFavoriteBonus);

	const values: Record<string, number> = {
		closeness: result.closeness,
		lateGame: result.lateGame,
		momentum: result.momentum,
		leadChanges: result.leadChanges,
		comeback: result.comeback,
	};

	return (
		<div className='signal-breakdown'>
			<div className='signal-breakdown-header'>
				<div>
					<span className='signal-breakdown-total' style={{ color: frozen ? 'var(--color-muted)' : '#F75C03' }}>
						{total}
					</span>
					<span className='signal-breakdown-total-max'>/ {scoreMaxTotal}</span>
				</div>
				<div className='signal-breakdown-presets'>
					{Object.keys(PRESETS).map(label => (
						<button
							key={label}
							type='button'
							className='signal-breakdown-preset-btn'
							onClick={() => setState(PRESETS[label]!)}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			<div className='signal-breakdown-controls'>
				<label className='signal-breakdown-control'>
					Away score
					<input
						type='number'
						value={state.awayScore}
						onChange={e => setState(s => ({ ...s, awayScore: Number(e.target.value) }))}
					/>
				</label>
				<label className='signal-breakdown-control'>
					Home score
					<input
						type='number'
						value={state.homeScore}
						onChange={e => setState(s => ({ ...s, homeScore: Number(e.target.value) }))}
					/>
				</label>
				<label className='signal-breakdown-control'>
					Period
					<input
						type='number'
						min={1}
						max={6}
						value={state.period}
						onChange={e => setState(s => ({ ...s, period: Number(e.target.value) }))}
					/>
				</label>
				<label className='signal-breakdown-control signal-breakdown-control-wide'>
					Seconds left in period
					<input
						type='range'
						min={0}
						max={periodSeconds}
						value={state.secondsLeft}
						onChange={e => setState(s => ({ ...s, secondsLeft: Number(e.target.value) }))}
					/>
				</label>
				<button
					type='button'
					className={`signal-breakdown-preset-btn${state.frozen ? ' active' : ''}`}
					onClick={() => setState(s => ({ ...s, frozen: !s.frozen }))}
				>
					Halftime: {state.frozen ? 'on' : 'off'}
				</button>
				<button
					type='button'
					className={`signal-breakdown-preset-btn${state.favorite ? ' active' : ''}`}
					onClick={() => setState(s => ({ ...s, favorite: !s.favorite }))}
				>
					Favorite team: {state.favorite ? 'on' : 'off'}
				</button>
			</div>

			{frozen && (
				<p className='signal-breakdown-cap-note'>
					Every signal above just zeroed out, from the same <code>isPlayFrozen</code> check the
					scorer runs before anything else.
					{favoriteBonus > 0 && ` The +${favoriteBonus} favorite bonus is held, not lost. Flip Halftime back off and it pays out again.`}
				</p>
			)}

			<div className='signal-breakdown-rows'>
				{SIGNALS.map(signal => (
					<div key={signal.key} className='signal-breakdown-row'>
						<div className='signal-breakdown-row-head'>
							<span className='signal-breakdown-row-name'>{signal.name}</span>
							<span className='signal-breakdown-row-value' style={{ color: signal.color }}>
								{values[signal.key]} <span className='signal-breakdown-row-max'>/ {signal.max}</span>
							</span>
						</div>
						<div className='ps-bar-track'>
							<div
								className='ps-bar-fill'
								style={{ background: signal.color, width: `${(values[signal.key]! / signal.max) * 100}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default SignalBreakdown;

import { useState } from 'react';
import { computePowerScore } from 'powerscore';
import type { Game } from '@arenaswap/core/types';
import GameCard from '@arenaswap/ui/src/components/gameCard';

// One preset per card feature this post's deep dive actually describes, so trying them proves
// the claim instead of illustrating it: field position on a down-and-distance line, a shootout
// tally under a frozen 120-minute score, a delayed game's badge and its zeroed PowerScore, and
// the weather chip on a card that hasn't kicked off yet. Every field below is a real Game field;
// nothing here is a prop this component invents for the demo.
const PRESETS: Record<string, Game> = {
	'NBA, live': {
		id: 'demo-nba',
		league: 'nba',
		sportType: 'basketball',
		awayTeam: { id: 'bos', name: 'Boston Celtics', abbreviation: 'BOS', score: 96, logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', color: '#007A33', alternateColor: '#BA9653' },
		homeTeam: { id: 'lal', name: 'Los Angeles Lakers', abbreviation: 'LAL', score: 98, logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png', color: '#552583', alternateColor: '#FDB927' },
		period: 4,
		clockSeconds: 24,
		status: 'in',
		broadcasts: ['ESPN'],
	},
	'NFL, 4th & Goal': {
		id: 'demo-nfl',
		league: 'nfl',
		sportType: 'football',
		awayTeam: { id: 'dal', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 17, logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', color: '#003594', alternateColor: '#869397' },
		homeTeam: { id: 'phi', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 21, logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', color: '#004C54', alternateColor: '#A5ACAF' },
		period: 4,
		clockSeconds: 95,
		status: 'in',
		downDistance: '4th & Goal',
		fieldPosition: 'PHI 3',
		down: 4,
		distance: 3,
		isGoalToGo: true,
		isRedZone: true,
		odds: { details: 'PHI -3.5', overUnder: 47.5, provider: { name: 'ESPN BET' } },
	},
	'World Cup, shootout': {
		id: 'demo-wc',
		league: 'fifawc',
		sportType: 'soccer',
		awayTeam: { id: 'arg', name: 'Argentina', abbreviation: 'ARG', score: 3, shootoutScore: 4 },
		homeTeam: { id: 'fra', name: 'France', abbreviation: 'FRA', score: 3, shootoutScore: 2 },
		period: 5,
		clockSeconds: 0,
		status: 'in',
		venueName: 'Lusail Stadium',
	},
	'MLB, rain delay': {
		id: 'demo-mlb',
		league: 'mlb',
		sportType: 'baseball',
		awayTeam: { id: 'atl', name: 'Atlanta Braves', abbreviation: 'ATL', score: 2, logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png', color: '#CE1141', alternateColor: '#13274F' },
		homeTeam: { id: 'nyy', name: 'New York Yankees', abbreviation: 'NYY', score: 4, logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png', color: '#0C2340', alternateColor: '#C4CED4' },
		period: 6,
		clockSeconds: 0,
		status: 'in',
		delayed: true,
		delayDescription: 'Rain Delay',
		bso: { balls: 2, strikes: 1, outs: 1 },
		baseRunners: { first: true, second: false, third: true },
	},
	'NFL, kickoff in 2 days': {
		id: 'demo-pre',
		league: 'nfl',
		sportType: 'football',
		awayTeam: { id: 'kc', name: 'Kansas City Chiefs', abbreviation: 'KC', score: 0, logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', color: '#E31837', alternateColor: '#FFB81C' },
		homeTeam: { id: 'buf', name: 'Buffalo Bills', abbreviation: 'BUF', score: 0, logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', color: '#00338D', alternateColor: '#C60C30' },
		period: 1,
		clockSeconds: 0,
		status: 'pre',
		startTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
		weather: { temperatureF: 28, conditionLabel: 'Snow' },
	},
};

const CAPTIONS: Record<string, string> = {
	'NBA, live': 'A plain live card: same dispatcher, same PowerScore bar, no special-case fields set.',
	'NFL, 4th & Goal': '`downDistance` and `fieldPosition` are two separate fields, joined through the locale file so the line stays translatable. `odds` and `provider` render the same row the card would show for any bettable game.',
	'World Cup, shootout': '`shootoutScore` is set on both teams; the frozen 120-minute score stays on top and the tally renders as its own line. `period: 5` is what makes `formatPeriod` resolve to PENS instead of a fictional third overtime.',
	'MLB, rain delay': '`delayed: true` earns the amber badge and dims the score, and it also reaches the real `computePowerScore` this page already uses above: a delayed game scores 0, so its bar reads empty no matter what the box score says.',
	'NFL, kickoff in 2 days': 'status is `pre`, so the dispatcher renders `PreGameCard` instead of `LiveGameCard` — a different component, not a mode of this one. Weather only shows because a game field, not a prop on this demo, carries it.',
};

const DEFAULT_PRESET = 'NBA, live';

const GameCardExplorer = () => {
	const [label, setLabel] = useState(DEFAULT_PRESET);
	const game = PRESETS[label]!;
	// The real engine, same as the sandbox above — a delayed game's total comes out zero from this
	// call, not from anything specific to the card.
	const excitementResult = computePowerScore(game);

	return (
		<div className='signal-breakdown'>
			<div className='signal-breakdown-presets'>
				{Object.keys(PRESETS).map(name => (
					<button
						key={name}
						type='button'
						className={`signal-breakdown-preset-btn${name === label ? ' active' : ''}`}
						onClick={() => setLabel(name)}
					>
						{name}
					</button>
				))}
			</div>
			<div className='game-card-explorer-stage'>
				<GameCard
					game={game}
					excitementResult={excitementResult}
					favoriteTeamIds={new Set()}
					onToggleFavoriteTeam={() => {}}
					onOpenGameDetail={() => {}}
					bettingPrefs={{ bettingEnabled: true }}
					weatherPrefs={{ temperatureUnit: 'F' }}
				/>
			</div>
			<p className='signal-breakdown-cap-note'>{CAPTIONS[label]}</p>
		</div>
	);
};

export default GameCardExplorer;

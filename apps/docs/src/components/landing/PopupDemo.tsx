import { computePowerScore } from 'powerscore';
import type { ScoreSnapshot } from 'powerscore';
import type { Game, LeagueId } from '@arenaswap/core/types';
import GameCard from '@arenaswap/ui/src/components/gameCard';
import { LeagueSectionHeader, PopupHeader, PopupSectionTitle } from '@arenaswap/ui/src/components/popupChrome';
import { useT } from '@arenaswap/ui/src/components/i18nContext';

// The popup, at its real size, with its real three sections. Assigned tabs, then the rest of
// tonight, then what has not started yet — the order mainView renders them in.
//
// The PowerScores are computed here rather than written down, for the same reason as the hero:
// a number on a marketing page that the algorithm would not produce is a number that will
// eventually be wrong.

const espnTeamLogo = (path: string) => `https://a.espncdn.com/i/teamlogos/${path}.png`;
const emptyLeagueLogos = {} as Record<LeagueId, string>;
const noFavorites = new Set<string>(['nba:18']);
const base = import.meta.env.BASE_URL;
const noop = () => {};

const assigned: { game: Game; history: ScoreSnapshot[]; tab: string }[] = [
	{
		tab: 'Tab 1: espn.com',
		game: {
			id: 'demo-nba',
			league: 'nba',
			sportType: 'basketball',
			status: 'in',
			period: 4,
			clockSeconds: 152,
			venueName: 'Madison Square Garden',
			broadcasts: ['ESPN'],
			awayTeam: { id: '2', name: 'Boston Celtics', abbreviation: 'BOS', score: 100, logo: espnTeamLogo('nba/500/bos'), color: '#007A33', alternateColor: '#BA9653' },
			homeTeam: { id: '18', name: 'New York Knicks', abbreviation: 'NYK', score: 100, logo: espnTeamLogo('nba/500/nyk'), color: '#006BB6', alternateColor: '#F58426' },
		},
		history: [
			{ gameId: 'demo-nba', timestamp: 0, homeScore: 92, awayScore: 90 },
			{ gameId: 'demo-nba', timestamp: 60_000, homeScore: 95, awayScore: 93 },
			{ gameId: 'demo-nba', timestamp: 120_000, homeScore: 98, awayScore: 97 },
			{ gameId: 'demo-nba', timestamp: 180_000, homeScore: 100, awayScore: 100 },
		],
	},
	{
		tab: 'Tab 2: espn.com',
		game: {
			id: 'demo-mlb',
			league: 'mlb',
			sportType: 'baseball',
			status: 'in',
			period: 8,
			clockSeconds: 0,
			topOfInning: true,
			bso: { balls: 3, strikes: 2, outs: 1 },
			baseRunners: { first: true, second: true, third: false },
			venueName: 'Citizens Bank Park',
			broadcasts: ['ESPN+'],
			awayTeam: { id: '28', name: 'Miami Marlins', abbreviation: 'MIA', score: 4, logo: espnTeamLogo('mlb/500/mia'), color: '#00A3E0', alternateColor: '#EF3340' },
			homeTeam: { id: '22', name: 'Philadelphia Phillies', abbreviation: 'PHI', score: 5, logo: espnTeamLogo('mlb/500/phi'), color: '#E81828', alternateColor: '#002D72' },
		},
		history: [
			{ gameId: 'demo-mlb', timestamp: 0, homeScore: 4, awayScore: 3 },
			{ gameId: 'demo-mlb', timestamp: 90_000, homeScore: 5, awayScore: 3 },
			{ gameId: 'demo-mlb', timestamp: 180_000, homeScore: 5, awayScore: 4 },
		],
	},
];

const otherLive: { game: Game; history: ScoreSnapshot[] }[] = [
	{
		game: {
			id: 'demo-nhl',
			league: 'nhl',
			sportType: 'hockey',
			status: 'in',
			period: 3,
			clockSeconds: 642,
			venueName: 'Rogers Place',
			broadcasts: ['TNT'],
			awayTeam: { id: '17', name: 'Colorado Avalanche', abbreviation: 'COL', score: 3, logo: espnTeamLogo('nhl/500/col'), color: '#6F263D', alternateColor: '#236192' },
			homeTeam: { id: '6', name: 'Edmonton Oilers', abbreviation: 'EDM', score: 5, logo: espnTeamLogo('nhl/500/edm'), color: '#041E42', alternateColor: '#FF4C00' },
		},
		history: [
			{ gameId: 'demo-nhl', timestamp: 0, homeScore: 3, awayScore: 3 },
			{ gameId: 'demo-nhl', timestamp: 200_000, homeScore: 4, awayScore: 3 },
			{ gameId: 'demo-nhl', timestamp: 400_000, homeScore: 5, awayScore: 3 },
		],
	},
];

// A start time relative to render rather than a fixed date, so the card never advertises a game
// that started last year. This component is client-only, so there is no server render to
// disagree with.
const upcoming: Game = {
	id: 'demo-nfl',
	league: 'nfl',
	sportType: 'football',
	status: 'pre',
	period: 1,
	clockSeconds: 0,
	startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
	venueName: 'Lincoln Financial Field',
	awayTeam: { id: '6', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 0, logo: espnTeamLogo('nfl/500/dal'), color: '#003594', alternateColor: '#869397' },
	homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 0, logo: espnTeamLogo('nfl/500/phi'), color: '#004C54', alternateColor: '#A5ACAF' },
};

const TabSlot = ({ label }: { label?: string }) => {
	const t = useT();
	return (
		<div className='game-card-tab-assign' data-card-control='true'>
			<select className='form-select form-select-sm' value={label ?? ''} disabled aria-label={label ?? t('tabAssign.placeholder')} onChange={noop}>
				<option value=''>{t('tabAssign.placeholder')}</option>
				{label && <option value={label}>{label}</option>}
			</select>
		</div>
	);
};

const PopupDemo = () => {
	const t = useT();
	const shared = {
		favoriteTeamIds: noFavorites,
		onToggleFavoriteTeam: noop,
		onOpenGameDetail: noop,
		bettingPrefs: { bettingEnabled: false },
	};

	return (
		<div className='popup-frame'>
			<div className='popup-container'>
				<PopupHeader
					logoSrc={`${base}images/full_logo_white_on_transparent.svg`}
					enabled
					interactive={false}
					toggleId='popup-demo-enable-toggle'
					onToggleEnabled={noop}
					onOpenSettings={noop}
					onStartTour={noop}
				/>

				<PopupSectionTitle first>{t('main.sectionActiveLiveTabs')}</PopupSectionTitle>
				{assigned.map(({ game, history, tab }) => (
					<div key={game.id}>
						<LeagueSectionHeader league={game.league} logos={emptyLeagueLogos} />
						<GameCard
							{...shared}
							game={game}
							excitementResult={computePowerScore(game, history)}
							tabSlot={<TabSlot label={tab} />}
						/>
					</div>
				))}

				<PopupSectionTitle>{t('main.sectionOtherLiveGames')}</PopupSectionTitle>
				{otherLive.map(({ game, history }) => (
					<div key={game.id}>
						<LeagueSectionHeader league={game.league} logos={emptyLeagueLogos} />
						<GameCard
							{...shared}
							game={game}
							excitementResult={computePowerScore(game, history)}
							tabSlot={<TabSlot />}
						/>
					</div>
				))}

				<PopupSectionTitle>{t('main.sectionUpNext')}</PopupSectionTitle>
				<LeagueSectionHeader league={upcoming.league} logos={emptyLeagueLogos} />
				<GameCard {...shared} game={upcoming} excitementResult={undefined} tabSlot={<TabSlot />} />
			</div>
		</div>
	);
};

export default PopupDemo;

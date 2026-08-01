import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

// The missing page as a game the extension would never switch you to: clock
// expired, nobody broadcasting it, PowerScore of zero.
const game: Game = {
	id: 'not-found',
	league: 'nba',
	sportType: 'basketball',
	awayTeam: { id: '404', name: 'Not Found', abbreviation: '404', score: 404, color: '#F75C03', alternateColor: '#ff6a1a' },
	homeTeam: { id: 'you', name: 'You', abbreviation: 'YOU', score: 0, color: '#2274A5', alternateColor: '#1b5c84' },
	period: 4,
	clockSeconds: 0,
	status: 'in',
	venueName: 'The Void',
	broadcasts: ['Nowhere'],
};

const excitementResult: PowerScoreResult = {
	gameId: 'not-found',
	total: 0,
	closeness: 0,
	lateGame: 0,
	momentum: 0,
	leadChanges: 0,
	comeback: 0,
	reason: '',
};

const NotFoundCard = () => (
	<LiveGameCard
		game={game}
		excitementResult={excitementResult}
		favoriteTeamIds={new Set()}
		onToggleFavoriteTeam={() => {}}
		onOpenGameDetail={() => {}}
		bettingPrefs={{ bettingEnabled: false }}
	/>
);

export default NotFoundCard;

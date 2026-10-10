import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';
import { TranslationContext, islandTranslator } from '../i18n/islandStrings';

// The missing page as a game the extension would never switch you to.
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

// The two team names are the joke rather than copy, so they stay as they are. What the card puts
// around them — the LIVE flag, the labels a screen reader reads out — comes off the same string map
// the rest of the site's demo popups use.
const NotFoundCard = ({ strings }: { strings?: Record<string, string> }) => (
	<TranslationContext.Provider value={islandTranslator(strings)}>
		<LiveGameCard
			game={game}
			excitementResult={excitementResult}
			favoriteTeamIds={new Set()}
			onToggleFavoriteTeam={() => {}}
			onOpenGameDetail={() => {}}
			interactive={false}
			bettingPrefs={{ bettingEnabled: false }}
		/>
	</TranslationContext.Provider>
);

export default NotFoundCard;

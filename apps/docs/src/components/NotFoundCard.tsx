import type { Game } from '@arenaswap/core/types';
import GameStage from '@arenaswap/ui/src/components/gameStage';
import { stageNote } from '@arenaswap/ui/src/components/boardSituation';
import { useT } from '@arenaswap/ui/src/components/i18nContext';
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

// The two team names, the venue and the network are the joke rather than copy, so they stay as they
// are. Everything the stage puts around them comes off the site's shared string map.
const NotFoundStage = () => {
	const t = useT();
	return (
		<GameStage
			game={game}
			note={stageNote(game, { bettingEnabled: false }, t as Parameters<typeof stageNote>[2])}
			power={0}
		/>
	);
};

const NotFoundCard = ({ strings }: { strings?: Record<string, string> }) => (
	<TranslationContext.Provider value={islandTranslator(strings)}>
		<NotFoundStage />
	</TranslationContext.Provider>
);

export default NotFoundCard;

import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { LeagueId } from '@arenaswap/core/types';
import GameCard from '@arenaswap/ui/src/components/gameCard';
import LeagueMark from '@arenaswap/ui/src/components/leagueMark';
import { leagueMarkOnColor } from '@arenaswap/ui/src/components/gameCardShared';
import { celticsKnicks, chiefsBills, michiganOhioState } from './demoGames';
import DemoTabSlot from './DemoTabSlot';
import { islandTranslator, TranslationContext } from '../../i18n/islandStrings';

export type GameCardDemoStatus = 'live' | 'upcoming' | 'final';

interface GameCardDemoProps {
	status: GameCardDemoStatus;
	tab?: boolean;
	favorite?: boolean;
	strings: Record<string, string>;
}

const noop = () => {};
const noLeagueLogos = {} as Record<LeagueId, string>;

const games = {
	live: celticsKnicks.game,
	upcoming: chiefsBills,
	final: michiganOhioState,
};

const GameCardDemo = ({ status, tab = false, favorite = false, strings }: GameCardDemoProps) => {
	const game = games[status];
	const favorites = new Set(favorite ? [createFavoriteTeamKey(game.league, game.awayTeam.id)] : []);
	return (
		<TranslationContext.Provider value={islandTranslator(strings)}>
			<div className='popup-container doc-demo-popup-frame doc-demo-card-frame'>
				<GameCard
					game={game}
					excitementResult={status === 'live' ? celticsKnicks.result : undefined}
					favoriteTeamIds={favorites}
					onToggleFavoriteTeam={noop}
					onOpenGameDetail={noop}
					interactive={false}
					bettingPrefs={{ bettingEnabled: false }}
					tabSlot={tab && status === 'live' ? <DemoTabSlot entry={celticsKnicks} /> : undefined}
					leagueSlot={<LeagueMark league={game.league} logos={noLeagueLogos} onColor={leagueMarkOnColor(game)} />}
				/>
			</div>
		</TranslationContext.Provider>
	);
};

export default GameCardDemo;

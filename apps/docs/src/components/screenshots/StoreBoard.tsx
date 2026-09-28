import type { Game } from '@arenaswap/core/types';
import SiteBoard, { type SiteBoardMenu, type SiteBoardTab } from '../board/SiteBoard';
import { TranslationContext, islandTranslator } from '../../i18n/islandStrings';

// The popup for a store screenshot: the site's board, with its scores written out rather than
// computed, because each still is posed.
interface StoreBoardProps {
	games: Game[];
	scores: Record<string, number>;
	tabs?: Record<string, SiteBoardTab>;
	watchedId?: string;
	menu?: SiteBoardMenu;
	strings?: Record<string, string>;
	id: string;
}

const StoreBoard = ({ games, scores, tabs, watchedId, menu, strings, id }: StoreBoardProps) => (
	<TranslationContext.Provider value={islandTranslator(strings)}>
		<SiteBoard
			games={games}
			scores={new Map(Object.entries(scores))}
			tabs={tabs}
			watchedId={watchedId}
			menu={menu}
			toggleId={`${id}-enable-toggle`}
		/>
	</TranslationContext.Provider>
);

export default StoreBoard;

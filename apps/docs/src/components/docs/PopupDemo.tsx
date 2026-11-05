import type { LeagueId } from '@arenaswap/core/types';
import GameCard from '@arenaswap/ui/src/components/gameCard';
import LeagueMark from '@arenaswap/ui/src/components/leagueMark';
import { leagueMarkOnColor } from '@arenaswap/ui/src/components/gameCardShared';
import { PopupHeader, PopupSectionTitle } from '@arenaswap/ui/src/components/popupChrome';
import { useT } from '@arenaswap/ui/src/components/i18nContext';
import { liveEntries } from './demoGames';
import DemoTabSlot from './DemoTabSlot';
import { islandTranslator, TranslationContext } from '../../i18n/islandStrings';

const noop = () => {};
const noFavorites = new Set<string>();
const noLeagueLogos = {} as Record<LeagueId, string>;

const PopupList = ({ tabs }: { tabs: boolean }) => {
	const t = useT();
	return (
		<div className='popup-container doc-demo-popup-frame'>
			<PopupHeader
				enabled
				interactive={false}
				toggleId='doc-demo-popup-toggle'
				onToggleEnabled={noop}
				onOpenSettings={noop}
				onStartTour={noop}
				onOpenGuide={noop}
				onBossButton={noop}
			/>
			<PopupSectionTitle first>{t(tabs ? 'main.sectionActiveLiveTabs' : 'main.sectionOtherLiveGames')}</PopupSectionTitle>
			{liveEntries.map(entry => (
				<GameCard
					key={entry.game.id}
					game={entry.game}
					excitementResult={entry.result}
					favoriteTeamIds={noFavorites}
					onToggleFavoriteTeam={noop}
					onOpenGameDetail={noop}
					interactive={false}
					bettingPrefs={{ bettingEnabled: false }}
					tabSlot={tabs ? <DemoTabSlot entry={entry} /> : undefined}
					leagueSlot={<LeagueMark league={entry.game.league} logos={noLeagueLogos} onColor={leagueMarkOnColor(entry.game)} />}
				/>
			))}
		</div>
	);
};

const PopupDemo = ({ tabs = false, strings }: { tabs?: boolean; strings: Record<string, string> }) => (
	<TranslationContext.Provider value={islandTranslator(strings)}>
		<PopupList tabs={tabs} />
	</TranslationContext.Provider>
);

export default PopupDemo;

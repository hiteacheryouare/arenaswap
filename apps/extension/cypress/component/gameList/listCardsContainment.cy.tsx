import type { Browser } from 'wxt/browser';
import type { Game, LeagueId, TabRegistration } from '@arenaswap/core/types';
import LeagueMark from '@arenaswap/ui/src/components/leagueMark';
import { leagueMarkOnColor } from '@arenaswap/ui/src/components/gameCardShared';
import { LeagueSectionHeader, PopupSectionTitle } from '@arenaswap/ui/src/components/popupChrome';
import { StaleLeaguesProvider } from '@arenaswap/ui/src/components/staleLeagueNote';
import GameCard from '../../../entrypoints/popup/components/gameCard';
import { groupByLeague, formatTabLabel } from '../../../entrypoints/popup/popupHelpers';
import { makeScore } from '../../support/fixtures';
import { english, inEveryLocale } from '../../support/safetyNet/locales';
import { mountInPopup, popupSurface } from '../../support/safetyNet/mountInPopup';
import { busiestSlateSize, slateOf, worstCaseGames, worstUserText } from '../../support/safetyNet/worstCase';

// The popup's list renders the real card under mainView's own wrappers, which the stubbed card in
// the mainView specs never exercises. This lays the same wrappers around the same real cards.

const hour = 60 * 60 * 1000;

const asUpcoming = (game: Game, index: number): Game => ({
	...game,
	id: `${game.id}-pre`,
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	startTime: new Date(Date.now() + (index + 1) * hour).toISOString(),
});

const asFinal = (game: Game): Game => ({ ...game, id: `${game.id}-post`, status: 'post', finalPeriodSuffix: 'OT' });
const asDelayed = (game: Game): Game => ({ ...game, id: `${game.id}-delayed`, delayed: true });

// The list sorts league-first when it groups, so one league is never split across two headers.
const byLeague = (games: Game[]): Game[] => games.toSorted((a, b) => a.league.localeCompare(b.league));

const everyState = (): Game[] => byLeague(worstCaseGames.flatMap(({ game }, index) => [game, asDelayed(game), asUpcoming(game, index), asFinal(game)]));

const openTabsFor = (games: Game[]): Browser.tabs.Tab[] => games.map((game, index) => ({
	id: index + 1,
	title: index % 2 === 0 ? worstUserText.tabTitle : worstUserText.tabTitleUrl,
	url: worstUserText.tabTitleUrl,
} as Browser.tabs.Tab));

const cardsList = ({ games, grouped, assignTabs }: { games: Game[]; grouped: boolean; assignTabs: boolean }) => {
	const openTabs = openTabsFor(games);
	const registry: TabRegistration[] = assignTabs
		? games.flatMap((game, index) => (game.status === 'in' ? [{ tabId: index + 1, gameId: game.id }] : []))
		: [];
	const card = (game: Game) => (
		<div key={game.id} data-glide-key={game.id}>
			<GameCard
				game={game}
				excitementResult={game.status === 'in' ? makeScore(game.id, 100) : undefined}
				favoriteTeamIds={new Set([game.homeTeam.id])}
				onToggleFavoriteTeam={() => {}}
				gameBoosts={{}}
				openTabs={openTabs}
				registry={registry}
				standbyStreamTabId={null}
				onRegistryChange={() => {}}
				formatTabLabel={tab => formatTabLabel(tab, openTabs)}
				onOpenGameDetail={() => {}}
				bettingPrefs={{ bettingEnabled: true }}
				weatherPrefs={{ temperatureUnit: 'F' }}
				dayNamedAbove={game.status === 'pre'}
				leagueSlot={grouped ? undefined : <LeagueMark league={game.league} logos={{}} onColor={leagueMarkOnColor(game)} />}
			/>
		</div>
	);
	const leagues = [...new Set(games.map(game => game.league))] as LeagueId[];
	return (
		<StaleLeaguesProvider shedLeagues={leagues} lastGoodAt={Object.fromEntries(leagues.map(league => [league, Date.now() - 4000 * 60_000]))}>
			<div className='mt-3'>
				<PopupSectionTitle first>{english.messages.main.sectionActiveLiveTabs}</PopupSectionTitle>
				{grouped
					? groupByLeague(games).map(({ league, games: leagueGames }) => (
						<div key={league}>
							<LeagueSectionHeader league={league} logos={{}} />
							{leagueGames.map(card)}
						</div>
					))
					: games.map(card)}
			</div>
		</StaleLeaguesProvider>
	);
};

// Forces the 15px classic scrollbar a Windows or Linux popup, or a Mac with a mouse attached, draws
// down the right side of the list.
const withClassicScrollbar = () => {
	cy.document().then(doc => {
		const style = doc.createElement('style');
		style.textContent = '.popup-container::-webkit-scrollbar { width: 15px; }';
		doc.head.append(style);
	});
};

describe('real cards inside the list containment', () => {
	const states = everyState();

	for (const grouped of [true, false]) {
		inEveryLocale(`keeps every worst-case card state inside the popup (${grouped ? 'grouped by league' : 'one list with league marks'})`, locale => {
			mountInPopup(cardsList({ games: states, grouped, assignTabs: true }), locale);
			cy.get(popupSurface).assertContained({ exempt: ['.menu'] });
		});
	}

	inEveryLocale('keeps a card with no tab assigned inside the popup', locale => {
		mountInPopup(cardsList({ games: states, grouped: false, assignTabs: false }), locale);
		cy.get(popupSurface).assertContained({ exempt: ['.menu'] });
	});

	it(`keeps ${busiestSlateSize} cards inside the popup beside a classic scrollbar`, () => {
		withClassicScrollbar();
		mountInPopup(cardsList({ games: byLeague(slateOf(busiestSlateSize)), grouped: true, assignTabs: true }));
		cy.get('.popup-container').should($container => {
			const [element] = $container.get();
			expect(element.offsetWidth - element.clientWidth, 'the scrollbar takes its width').to.be.at.least(10);
		});
		cy.get(popupSurface).assertContained({ exempt: ['.menu'] });
	});
});

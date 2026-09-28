import { useRef, useState } from 'react';
import MainView from '../../entrypoints/popup/components/mainView';
import type { UserPreferences } from '@arenaswap/core/types';

const defaultPrefs: UserPreferences = {
	enabled: true,
	enabledLeagues: ['nba'],
	sensitivity: 4,
	cooldownSeconds: 45,
	switchDelaySeconds: 0,
	showUpcomingGames: true,
	keepFinalGames: false,
	finishedTabAction: 'keep' as const,
	proTipsEnabled: true,
	notificationsEnabled: false,
	favoriteTeamBonusPoints: 0,
	favoriteTeamIds: [],
	standbyStreamEnabled: false,
	standbyStreamThreshold: 20,
	bettingEnabled: false,
	temperatureUnit: 'F',
	romerUnlocked: false,
	openRevealEnabled: true,
	theme: 'dark',
	holidayDecorationsEnabled: true,
	holidaySnowEnabled: true,
	holidayLightsEnabled: true,
	holidayLeavesEnabled: true,
	postseasonBoostPoints: 0,
	upcomingGamesDays: 14,
	disabledSignals: [],
};

const makeGame = (
	id: string,
	status: 'in' | 'pre' | 'post' = 'in',
	overrides: Partial<{ league: 'nba' | 'wnba'; startTime: string }> = {},
) => ({
	id,
	status,
	league: overrides.league ?? ('nba' as const),
	sportType: 'basketball' as const,
	startTime: overrides.startTime,
	period: 2,
	clockSeconds: 300,
	homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 50, color: '#1D428A' },
	awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 48, color: '#CE1141' },
});

const gameEl = (id: string) => cy.get(`[data-game="${id}"]`);

const defaultProps = {
	prefs: defaultPrefs,
	prefsLoaded: true,
	isLoading: false,
	hasError: false,
	games: [] as ReturnType<typeof makeGame>[],
	scores: [],
	leagueLogos: {},
	registry: [],
	favoriteTeamIds: new Set<string>(),
	gameBoosts: {},
	openTabs: [],
	onStandbyStream: false,
	onOpenGameDetail: () => {},
	onOpenSetup: () => {},
	onRefresh: () => {},
	showReviewPrompt: false,
	onToggleEnabled: () => {},
	onDismissReviewPrompt: () => {},
	onLeaveReview: () => {},
	onToggleFavoriteTeam: () => {},
	onRegistryChange: () => {},
	onStartWalkthrough: () => {},
	onOpenGuide: () => {},
	formatTabLabel: () => 'Tab',
	suggestionCount: 0,
	onReviewSuggestions: () => {},
	onDismissSuggestions: () => {},
	scrollOffsetRef: { current: 0 },
	selectedDayKey: null,
	onSelectDay: () => {},
};

// The day page and the scroll offset both live in `app.tsx` now, so a bare `cy.mount(<MainView/>)`
// has no state behind the pager. This stands in for the part of the app the view no longer owns.
const StatefulMainView = ({ games, prefs = defaultPrefs }: { games: ReturnType<typeof makeGame>[]; prefs?: UserPreferences }) => {
	const scrollOffsetRef = useRef(0);
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	return (
		<MainView
			{...defaultProps}
			prefs={prefs}
			games={games}
			scrollOffsetRef={scrollOffsetRef}
			selectedDayKey={selectedDayKey}
			onSelectDay={setSelectedDayKey}
		/>
	);
};

// Two live games whose order depends on their PowerScores, and a button that swaps them the way a
// pushed `SCORES_UPDATED` would.
const score = (gameId: string, total: number) => ({ gameId, total } as never);

const ResortingMainView = () => {
	const scrollOffsetRef = useRef(0);
	const [flipped, setFlipped] = useState(false);
	return (
		<>
			<button type='button' data-testid='fake-score-push' onClick={() => setFlipped(true)}>Push</button>
			<MainView
				{...defaultProps}
				games={[makeGame('slow'), makeGame('fast')]}
				scores={flipped
					? [score('slow', 10), score('fast', 90)]
					: [score('slow', 90), score('fast', 10)]}
				scrollOffsetRef={scrollOffsetRef}
				selectedDayKey={null}
				onSelectDay={() => {}}
				revealMode='full'
			/>
		</>
	);
};

// Mirrors the `key={view}` remount in `app.tsx`: leaving the list unmounts it outright, so anything
// the view owned itself would be gone by the time you came back.
const NavigatingMainView = ({ games }: { games: ReturnType<typeof makeGame>[] }) => {
	const scrollOffsetRef = useRef(0);
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	const [view, setView] = useState<'main' | 'detail'>('main');
	return (
		<div key={view}>
			{view === 'main' && (
				<>
					<button type='button' data-testid='fake-open-detail' onClick={() => setView('detail')}>Open</button>
					<MainView
						{...defaultProps}
						games={games}
						scrollOffsetRef={scrollOffsetRef}
						selectedDayKey={selectedDayKey}
						onSelectDay={setSelectedDayKey}
					/>
				</>
			)}
			{view === 'detail' && (
				<button type='button' data-testid='fake-back' onClick={() => setView('main')}>Back</button>
			)}
		</div>
	);
};

// The plate is read off the banner's own computed style rather than hardcoded, so a surface token
// that moves cannot leave the ink measured against a colour it no longer sits on.
const channelsOf = (color: string): number[] => (
	(color.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number)
);

const relativeLuminance = (color: string): number => {
	const [red, green, blue] = channelsOf(color).map(value => {
		const channel = value / 255;
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return (0.2126 * red!) + (0.7152 * green!) + (0.0722 * blue!);
};

const contrastRatio = (a: string, b: string): number => {
	const [high, low] = [relativeLuminance(a), relativeLuminance(b)].toSorted((x, y) => y - x);
	return (high! + 0.05) / (low! + 0.05);
};

// The standby strip is the only thing in the extension that reaches for .bg-body-secondary. That
// token was Bootstrap's light #e9ecef for as long as the strip has existed, while .text-body-
// secondary is this theme's own dim #8b949e — dark-theme ink printed on a light slab, at 2.59:1.
describe('mainView standby banner', () => {
	it('sets its label on its own plate at the small-text bar', () => {
		cy.viewport(320, 480);
		cy.mount(<MainView {...defaultProps} onStandbyStream={true} />);
		cy.get('[data-testid="standby-banner"]').then($banner => {
			const style = getComputedStyle($banner[0]!);
			expect(
				contrastRatio(style.color, style.backgroundColor),
				`${style.color} on ${style.backgroundColor}`,
			).to.be.at.least(4.5);
		});
	});

	// A surface, not a slab: above the popup so the strip has an edge, below its own ink so it still
	// reads as part of a dark theme. Either bound alone passes on a colour that is wrong.
	it('sits between the popup and its own ink', () => {
		cy.viewport(320, 480);
		cy.mount(<MainView {...defaultProps} onStandbyStream={true} />);
		cy.get('[data-testid="standby-banner"]').then($banner => {
			const style = getComputedStyle($banner[0]!);
			const popup = getComputedStyle(document.body).backgroundColor;
			const plate = relativeLuminance(style.backgroundColor);
			expect(plate, 'plate above the popup').to.be.greaterThan(relativeLuminance(popup));
			expect(plate, 'plate below its own ink').to.be.lessThan(relativeLuminance(style.color));
		});
	});
});

describe('mainView review prompt', () => {
	it('shows review banner when review prompt is enabled', () => {
		cy.mount(<MainView {...defaultProps} showReviewPrompt={true} />);
		cy.get('[data-testid="review-prompt"]').should('exist');
	});

	// Eligibility comes out of storage.local rather than the fetch, so it is true well before the
	// slate lands. Both selectors are asserted present as well as absent: an absence test against a
	// state the component never reaches passes whether or not the gate exists.
	it('stays off the loading screen', () => {
		cy.mount(<MainView {...defaultProps} isLoading={true} showReviewPrompt={true} />);
		cy.get('.popup-loading-spinner').should('exist');
		cy.get('[data-testid="review-prompt"]').should('not.exist');
	});

	it('stays off the error banner', () => {
		cy.mount(<MainView {...defaultProps} hasError={true} showReviewPrompt={true} />);
		cy.get('.popup-error-banner').should('exist');
		cy.get('[data-testid="review-prompt"]').should('not.exist');
	});
});

describe('mainView pro tips', () => {
	it('shows pro tips when enabled', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} />);
		cy.get('[data-testid="pro-tip"]').should('exist');
	});

	it('hides pro tips when disabled', () => {
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, proTipsEnabled: false }} games={[makeGame('g1')]} />);
		cy.get('[data-testid="pro-tip"]').should('not.exist');
	});
});

describe('mainView loading and error states', () => {
	it('shows loading spinner when isLoading is true', () => {
		cy.mount(<MainView {...defaultProps} isLoading={true} />);
		cy.get('[role="status"]').should('exist');
	});

	it('shows error banner when hasError is true', () => {
		cy.mount(<MainView {...defaultProps} hasError={true} />);
		cy.get('[role="alert"]').should('exist');
		cy.contains(/failed to load/i).should('exist');
	});

	it('does not show loading or error when both are false', () => {
		cy.mount(<MainView {...defaultProps} />);
		cy.get('[role="status"]').should('not.exist');
		cy.get('[role="alert"]').should('not.exist');
	});
});

/* The real emptyGameState is stubbed out under this runner, so its copy is emptyGameState.cy.tsx's
   business. What belongs here is which of the two states mainView decided it was in: telling a user
   with four leagues on that they have none picked sends them into settings for nothing. */
describe('mainView empty states', () => {
	it('asks for leagues, and only that, when none are selected', () => {
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: [] }} />);
		cy.get('[data-testid="empty-no-leagues"]').should('exist');
		cy.get('[data-testid="empty-no-games"]').should('not.exist');
	});

	it('reports a quiet night, not a missing setup, when leagues are on and nothing is live', () => {
		cy.mount(<MainView {...defaultProps} />);
		cy.get('[data-testid="empty-no-games"]').should('exist');
		cy.get('[data-testid="empty-no-leagues"]').should('not.exist');
	});

	it('shows neither once a game arrives', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} />);
		cy.get('[data-testid="empty-no-games"]').should('not.exist');
		cy.get('[data-testid="empty-no-leagues"]').should('not.exist');
	});
});

// Anchored to local noon so a spec run near midnight cannot land a game on the wrong calendar day,
// which is the boundary groupByDate keys on.
const dayAt = (offsetDays: number) => {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);
	date.setHours(12, 0, 0, 0);
	return date.toISOString();
};

// Size is the score: the hottest live game takes the stage, anything at 70 or above is a tile, the
// rest are rows, and what isn't live sits under a hairline after them.
describe('mainView board', () => {
	it('puts the hottest live game on the stage, 70 and up in tiles, and the rest in rows', () => {
		cy.mount(
			<MainView
				{...defaultProps}
				games={[makeGame('cold'), makeGame('hot'), makeGame('warm'), makeGame('tepid')]}
				scores={[score('cold', 30), score('hot', 91), score('warm', 74), score('tepid', 70)]}
			/>,
		);
		cy.get('.as-stage').should('have.length', 1).and('have.attr', 'data-game', 'hot');
		cy.get('.as-tile').then($tiles => {
			expect([...$tiles].map(tile => tile.dataset.game)).to.deep.equal(['warm', 'tepid']);
		});
		cy.get('.as-row').should('have.length', 1).and('have.attr', 'data-game', 'cold');
		cy.get('.as-stage .as-stage-power strong').should('have.text', '91');
	});

	it('lets a lone tile take the whole width, since there is nothing to pair it with', () => {
		cy.mount(
			<MainView
				{...defaultProps}
				games={[makeGame('a'), makeGame('b'), makeGame('c'), makeGame('d')]}
				scores={[score('a', 95), score('b', 90), score('c', 85), score('d', 80)]}
			/>,
		);
		cy.get('.gm-tiles').should('have.class', 'is-odd');
		cy.get('.gm-tiles > :last-child').then($last => {
			const tiles = $last[0]!.parentElement!.getBoundingClientRect();
			expect($last[0]!.getBoundingClientRect().width).to.be.closeTo(tiles.width, 1);
		});
	});

	it('draws the header over the stage, and on the page when there is no stage', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} scores={[score('g1', 50)]} />);
		cy.get('.popup-header').should('have.class', 'is-on-stage');
		cy.mount(<MainView {...defaultProps} games={[makeGame('later', 'pre', { startTime: dayAt(0) })]} />);
		cy.get('.popup-header').should('not.have.class', 'is-on-stage');
	});

	it('breaks a PowerScore tie with favourites, then with the league order', () => {
		const nba = makeGame('tie-nba');
		const wnba = makeGame('tie-wnba', 'in', { league: 'wnba' });
		cy.mount(
			<MainView
				{...defaultProps}
				prefs={{ ...defaultPrefs, enabledLeagues: ['wnba', 'nba'] }}
				games={[nba, wnba]}
				scores={[score('tie-nba', 60), score('tie-wnba', 60)]}
			/>,
		);
		cy.get('.as-stage').should('have.attr', 'data-game', 'tie-wnba');
		cy.mount(
			<MainView
				{...defaultProps}
				prefs={{ ...defaultPrefs, enabledLeagues: ['wnba', 'nba'] }}
				favoriteTeamIds={new Set(['nba:tie-nba-h'])}
				games={[nba, wnba]}
				scores={[score('tie-nba', 60), score('tie-wnba', 60)]}
			/>,
		);
		cy.get('.as-stage').should('have.attr', 'data-game', 'tie-nba');
	});

	it('opens a game from the stage, a tile and a row, but not from the tab picker inside one', () => {
		const opened: string[] = [];
		cy.mount(
			<MainView
				{...defaultProps}
				games={[makeGame('s'), makeGame('t'), makeGame('r')]}
				scores={[score('s', 90), score('t', 80), score('r', 20)]}
				openTabs={[{ id: 7, index: 0, title: 'Stream', url: 'https://example.test' } as never]}
				onOpenGameDetail={id => opened.push(id)}
			/>,
		);
		gameEl('s').click('left', { scrollBehavior: 'center' });
		gameEl('t').click('left', { scrollBehavior: 'center' });
		gameEl('r').click('left', { scrollBehavior: 'center' });
		gameEl('r').find('.as-picker').click({ scrollBehavior: 'center' });
		cy.wrap(opened).should('deep.equal', ['s', 't', 'r']);
	});

	it('names the watched game and the tab it is on, and offers a tab to a game without one', () => {
		cy.mount(
			<MainView
				{...defaultProps}
				games={[makeGame('watched'), makeGame('loose')]}
				scores={[score('watched', 90), score('loose', 80)]}
				registry={[{ gameId: 'watched', tabId: 11 }]}
				openTabs={[
					{ id: 10, index: 0, title: 'Mail', url: 'https://mail.test' },
					{ id: 11, index: 1, title: 'Stream', url: 'https://stream.test', active: true },
				] as never}
			/>,
		);
		gameEl('watched').should('have.class', 'is-watched').find('.as-stage-label').should('contain.text', 'Watching, Tab 2');
		gameEl('loose').find('.as-picker').should('contain.text', 'No tab');
	});

	it('says the popup is about to switch when the stage game beats the watched one by the sensitivity gap', () => {
		const props = {
			...defaultProps,
			games: [makeGame('best'), makeGame('watched')],
			registry: [{ gameId: 'watched', tabId: 11 }, { gameId: 'best', tabId: 12 }],
			openTabs: [
				{ id: 11, index: 0, title: 'A', url: 'https://a.test', active: true },
				{ id: 12, index: 1, title: 'B', url: 'https://b.test' },
			] as never,
		};
		cy.mount(<MainView {...props} scores={[score('best', 90), score('watched', 70)]} />);
		gameEl('best').find('.as-stage-label').should('have.text', 'Switching to Tab 2');

		cy.mount(<MainView {...props} scores={[score('best', 75), score('watched', 70)]} />);
		gameEl('best').find('.as-stage-label').should('contain.text', 'Tab 2').and('not.contain.text', 'Switching');

		cy.mount(<MainView {...props} prefs={{ ...defaultPrefs, enabled: false }} scores={[score('best', 90), score('watched', 70)]} />);
		gameEl('best').find('.as-stage-label').should('not.contain.text', 'Switching');
	});

	it('lists upcoming and finished games after the live ones, finals last and without a PowerScore', () => {
		cy.mount(
			<MainView
				{...defaultProps}
				prefs={{ ...defaultPrefs, keepFinalGames: true }}
				games={[makeGame('done', 'post'), makeGame('later', 'pre', { startTime: dayAt(0) }), makeGame('now')]}
				scores={[score('now', 40)]}
			/>,
		);
		cy.get('[data-game]').then($games => {
			expect([...$games].map(game => game.dataset.game)).to.deep.equal(['now', 'later', 'done']);
		});
		gameEl('done').find('.as-row-power').should('have.text', '');
		gameEl('done').find('.as-clock').should('have.text', 'Final');
	});

	it('drops finished games when Keep finished games is off', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('done', 'post'), makeGame('now')]} scores={[score('now', 40)]} />);
		gameEl('done').should('not.exist');
	});

	it('does not render upcoming games when showUpcomingGames is false', () => {
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} games={[makeGame('upcoming-1', 'pre')]} />);
		gameEl('upcoming-1').should('not.exist');
	});

	it('sorts upcoming games by day first', () => {
		const todayGame = makeGame('today-wnba', 'pre', { league: 'wnba', startTime: dayAt(0) });
		const tomorrowGame = makeGame('tomorrow-nba', 'pre', { league: 'nba', startTime: dayAt(1) });
		cy.mount(<StatefulMainView games={[tomorrowGame, todayGame]} />);
		gameEl('today-wnba').should('exist');
		gameEl('tomorrow-nba').should('not.exist');
		cy.get('[data-testid="upcoming-day-next"]').click();
		gameEl('tomorrow-nba').should('exist');
		gameEl('today-wnba').should('not.exist');
	});

	it('shows how far the PowerScore has moved on a tile', () => {
		const now = Date.now();
		const snapshot = (total: number, ago: number) => ({ gameId: 't', timestamp: now - ago, total } as never);
		cy.mount(
			<MainView
				{...defaultProps}
				games={[makeGame('s'), makeGame('t')]}
				scores={[score('s', 95), score('t', 80)]}
				powerScoreHistory={{ t: [snapshot(74, 90_000), snapshot(76, 60_000), snapshot(80, 0)] }}
			/>,
		);
		gameEl('t').find('.as-trend').should('have.class', 'is-up').and('contain.text', '4');
	});
});

describe('mainView up next day pager', () => {
	// #103: truncation used to slice the flat list at 10 games, so a 12-game day lost its last two.
	it('shows every game on the selected day rather than the first ten of the slate', () => {
		const today = Array.from({ length: 12 }, (_, i) => makeGame(`today-${i}`, 'pre', { startTime: dayAt(0) }));
		cy.mount(<MainView {...defaultProps} games={[...today, makeGame('tomorrow-0', 'pre', { startTime: dayAt(1) })]} />);
		cy.get('[data-game^="today-"]').should('have.length', 12);
	});

	it('shows only the selected day, never games from the next one', () => {
		cy.mount(<MainView {...defaultProps} games={[
			makeGame('today-0', 'pre', { startTime: dayAt(0) }),
			makeGame('tomorrow-0', 'pre', { startTime: dayAt(1) }),
		]} />);
		gameEl('today-0').should('exist');
		gameEl('tomorrow-0').should('not.exist');
	});

	it('pages forward to the next day and back again', () => {
		cy.mount(<StatefulMainView games={[
			makeGame('today-0', 'pre', { startTime: dayAt(0) }),
			makeGame('tomorrow-0', 'pre', { startTime: dayAt(1) }),
		]} />);
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Today');
		cy.get('[data-testid="upcoming-day-previous"]').should('be.disabled');
		cy.get('[data-testid="upcoming-day-next"]').click();
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Tomorrow');
		cy.get('[data-testid="upcoming-day-next"]').should('be.disabled');
		gameEl('tomorrow-0').should('exist');
		gameEl('today-0').should('not.exist');
		cy.get('[data-testid="upcoming-day-previous"]').click();
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Today');
		gameEl('today-0').should('exist');
	});

	// The pager is the only thing naming the day, so a one-day slate still gets it.
	it('still heads a one-day slate', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('today-0', 'pre', { startTime: dayAt(0) })]} />);
		cy.get('[data-testid="upcoming-day-pager"]').should('exist');
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Today');
	});

	it('draws no pager when upcoming games are turned off', () => {
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} games={[makeGame('today-0', 'pre', { startTime: dayAt(0) })]} />);
		cy.get('[data-testid="upcoming-day-pager"]').should('not.exist');
	});

	// #104: the day page used to be component state inside the view, so it went out with the remount.
	it('holds the day page across a trip out of the list', () => {
		cy.mount(<NavigatingMainView games={[
			makeGame('today-0', 'pre', { startTime: dayAt(0) }),
			makeGame('tomorrow-0', 'pre', { startTime: dayAt(1) }),
		]} />);
		cy.get('[data-testid="upcoming-day-next"]').click();
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Tomorrow');

		cy.get('[data-testid="fake-open-detail"]').click();
		cy.get('[data-testid="upcoming-day-pager"]').should('not.exist');
		cy.get('[data-testid="fake-back"]').click();

		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Tomorrow');
		gameEl('tomorrow-0').should('exist');
	});

	// Scores arrive by push every few seconds, so a resort inside the open animation is ordinary. The
	// plan is fixed on the first list that has anything in it: a card that changes index would
	// otherwise get a new `animation-delay`, which moves a running animation rather than restarting it.
	it('holds the reveal stagger still when a score push resorts the list under it', () => {
		cy.mount(<ResortingMainView />);
		gameEl('slow').closest('.game-card-reveal').should('have.css', '--reveal-delay', '0ms');
		gameEl('fast').closest('.game-card-reveal').should('have.css', '--reveal-delay', '104ms');

		cy.get('[data-testid="fake-score-push"]').click();

		// The resort really happened: the stage changed hands.
		cy.get('.as-stage').should('have.attr', 'data-game', 'fast');
		gameEl('slow').closest('.game-card-reveal').should('have.css', '--reveal-delay', '0ms');
		gameEl('fast').closest('.game-card-reveal').should('have.css', '--reveal-delay', '104ms');
	});
});

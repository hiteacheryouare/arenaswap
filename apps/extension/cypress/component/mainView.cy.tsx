import { useRef, useState } from 'react';
import type { ComponentProps } from 'react';
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
	groupByLeague: true,
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
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
});

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

	it('waits behind the suggest banner', () => {
		cy.mount(<MainView {...defaultProps} showReviewPrompt={true} suggestionCount={2} />);
		cy.contains('.popup-notice', /look like games/i).should('exist');
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
		cy.contains(/couldn't load games/i).should('exist');
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

	it('leaves the quiet-night message to the error banner when the slate failed to load', () => {
		cy.mount(<MainView {...defaultProps} hasError={true} />);
		cy.get('.popup-error-banner').should('exist');
		cy.get('[data-testid="empty-no-games"]').should('not.exist');
	});

	it('shows neither once a game arrives', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} />);
		cy.get('[data-testid="empty-no-games"]').should('not.exist');
		cy.get('[data-testid="empty-no-leagues"]').should('not.exist');
	});
});

/* The heading a card sits under is the whole answer to "is this game one of mine?". Asserting only
   that the card exists cannot tell the two sections apart, which is the one thing this split is
   for. */
const sectionTitleOf = (gameId: string) => cy
	.get(`[data-testid="game-card-${gameId}"]`)
	.closest('.mt-2')
	.find('.popup-section-title');

describe('mainView header glow', () => {
	// The live game ArenaSwap would switch to lends its colours to the top of the list.
	it('glows in the colours of the live game with the best PowerScore', () => {
		const colored = (id: string, away: string, home: string) => ({
			...makeGame(id),
			awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 48, color: away },
			homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 50, color: home },
		});
		cy.mount(
			<MainView
				{...defaultProps}
				games={[colored('cold', '#111111', '#222222'), colored('hot', '#00471B', '#860038')]}
				scores={[score('cold', 30), score('hot', 91)]}
			/>,
		);
		cy.get('.popup-glow').should(([glow]: JQuery<HTMLElement>) => {
			expect(glow.style.getPropertyValue('--glow-away').toLowerCase()).to.equal('#00471b');
			expect(glow.style.getPropertyValue('--glow-home').toLowerCase()).to.equal('#860038');
			expect(getComputedStyle(glow).backgroundImage).to.contain('radial-gradient');
		});
		// Behind the header and the cards, not over them.
		cy.get('.popup-header').should(([header]: JQuery<HTMLElement>) => {
			const glow = document.querySelector('.popup-glow')!.getBoundingClientRect();
			const box = header.getBoundingClientRect();
			expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).to.not.equal(document.querySelector('.popup-glow'));
			expect(glow.top).to.be.closeTo(box.top, 1);
		});
	});

	it('glows nothing when nothing is live', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('later', 'pre', { startTime: dayAt(0) })]} />);
		cy.get('.popup-glow').should(([glow]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(glow).getPropertyValue('--glow-away')).to.equal('rgba(0, 0, 0, 0)');
			expect(getComputedStyle(glow).getPropertyValue('--glow-home')).to.equal('rgba(0, 0, 0, 0)');
		});
	});

	// The top game changes whenever a push reorders it, and the glow used to jump straight to the
	// new pair. Registered colours interpolate, so the change eases instead.
	it('eases from one pair of colours to the next', () => {
		const tinted = (away: string) => ({
			...makeGame('top'),
			awayTeam: { id: 'top-a', name: 'Away', abbreviation: 'AWY', score: 48, color: away },
			homeTeam: { id: 'top-h', name: 'Home', abbreviation: 'HOM', score: 50, color: '#860038' },
		});
		cy.mount(<SteppingMainView frames={[{ games: [tinted('#0000ff')] }, { games: [tinted('#ff0000')] }]} />);
		cy.get('.popup-glow').should(([glow]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(glow).getPropertyValue('--glow-away')).to.equal('rgb(0, 0, 255)');
		});
		cy.get('[data-testid="fake-next"]').click();
		cy.get('.popup-glow').should(([glow]: JQuery<HTMLElement>) => {
			const transition = glow.getAnimations().find(animation => (animation as CSSTransition).transitionProperty === '--glow-away');
			expect(transition, 'a running transition on --glow-away').to.not.equal(undefined);
			transition!.pause();
			transition!.currentTime = 350;
			const midway = getComputedStyle(glow).getPropertyValue('--glow-away');
			expect(midway).to.not.equal('rgb(0, 0, 255)');
			expect(midway).to.not.equal('rgb(255, 0, 0)');
		});
	});
});

describe('mainView game sections', () => {
	it('files a game with a tab assigned under Active Tabs and one without under Live Games', () => {
		cy.mount(
			<MainView
				{...defaultProps}
				games={[makeGame('assigned'), makeGame('loose')]}
				registry={[{ gameId: 'assigned', tabId: 1 }]}
			/>,
		);

		sectionTitleOf('assigned').should('have.text', 'Active Tabs');
		sectionTitleOf('loose').should('have.text', 'Live Games');
	});

	it('moves a game between the two sections when its tab assignment changes', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} />);
		sectionTitleOf('g1').should('have.text', 'Live Games');

		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} registry={[{ gameId: 'g1', tabId: 1 }]} />);
		sectionTitleOf('g1').should('have.text', 'Active Tabs');
	});

	it('drops the Active Tabs heading entirely when nothing is assigned', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} />);
		cy.contains('.popup-section-title', 'Active Tabs').should('not.exist');
	});

	it('does not render upcoming games section when showUpcomingGames is false', () => {
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} games={[makeGame('upcoming-1', 'pre')]} />);
		cy.get('[data-testid="game-card-upcoming-1"]').should('not.exist');
	});

	// Day-first sorting is what lets groupByDate build its groups in one pass, so it is still worth
	// pinning. It now shows up as page order rather than row order: the earlier day pages first even
	// though the NBA outranks the WNBA within a day.
	it('sorts upcoming games by day before league priority', () => {
		const todayGame = makeGame('today-wnba', 'pre', { league: 'wnba', startTime: '2026-05-27T23:00:00.000Z' });
		const tomorrowGame = makeGame('tomorrow-nba', 'pre', { league: 'nba', startTime: '2026-05-28T20:30:00.000Z' });
		cy.mount(<StatefulMainView games={[tomorrowGame, todayGame]} />);
		cy.get('[data-testid="game-card-today-wnba"]').should('exist');
		cy.get('[data-testid="game-card-tomorrow-nba"]').should('not.exist');
		cy.get('[data-testid="upcoming-day-next"]').click();
		cy.get('[data-testid="game-card-tomorrow-nba"]').should('exist');
		cy.get('[data-testid="game-card-today-wnba"]').should('not.exist');
	});

	it('orders live league sections by the default league order', () => {
		const nba = makeGame('live-nba');
		const wnba = makeGame('live-wnba', 'in', { league: 'wnba' });
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: ['nba', 'wnba'] }} games={[wnba, nba]} />);
		cy.get('[data-testid^="game-card-"]').then($cards => {
			expect($cards[0]).to.have.attr('data-testid', 'game-card-live-nba');
			expect($cards[1]).to.have.attr('data-testid', 'game-card-live-wnba');
		});
	});

	it('orders live league sections by the user custom league order', () => {
		const nba = makeGame('live-nba');
		const wnba = makeGame('live-wnba', 'in', { league: 'wnba' });
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, enabledLeagues: ['wnba', 'nba'] }} games={[nba, wnba]} />);
		cy.get('[data-testid^="game-card-"]').then($cards => {
			expect($cards[0]).to.have.attr('data-testid', 'game-card-live-wnba');
			expect($cards[1]).to.have.attr('data-testid', 'game-card-live-nba');
		});
	});

	it('leaves the league to the header when grouped, so cards carry no mark of their own', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('g1')]} />);
		cy.contains('.popup-section-label', 'NBA').should('exist');
		cy.get('.game-card-league').should('not.exist');
	});
});

const cardOrder = () => cy.get('[data-testid^="game-card-"]').then($cards => $cards.toArray().map(card => card.dataset.testid));

const tomorrowAt = (hour: number) => {
	const date = new Date();
	date.setHours(hour, 0, 0, 0);
	date.setDate(date.getDate() + 1);
	return date.toISOString();
};

describe('mainView mixed list', () => {
	const mixedPrefs = { ...defaultPrefs, groupByLeague: false, enabledLeagues: ['nba', 'wnba'] as UserPreferences['enabledLeagues'] };

	it('ranks live games across leagues by PowerScore alone, under no league headers', () => {
		cy.mount(
			<MainView
				{...defaultProps}
				prefs={mixedPrefs}
				games={[makeGame('nba-dull'), makeGame('wnba-thriller', 'in', { league: 'wnba' }), makeGame('nba-close')]}
				scores={[score('nba-dull', 20), score('wnba-thriller', 90), score('nba-close', 60)]}
			/>,
		);
		cardOrder().should('deep.equal', ['game-card-wnba-thriller', 'game-card-nba-close', 'game-card-nba-dull']);
		cy.get('.popup-section-label').should('not.exist');
	});

	it('pins a favorite above a better game from another league', () => {
		const favorite = { ...makeGame('wnba-fav', 'in', { league: 'wnba' }), homeTeam: { id: 'fav', name: 'Home', abbreviation: 'FAV', score: 50 } };
		cy.mount(
			<MainView
				{...defaultProps}
				prefs={mixedPrefs}
				games={[makeGame('nba-thriller'), favorite]}
				scores={[score('nba-thriller', 95), score('wnba-fav', 5)]}
				favoriteTeamIds={new Set(['wnba:fav'])}
			/>,
		);
		cardOrder().should('deep.equal', ['game-card-wnba-fav', 'game-card-nba-thriller']);
	});

	it('lists a day of upcoming games by start time, whatever the league', () => {
		cy.mount(
			<StatefulMainView
				prefs={mixedPrefs}
				games={[
					makeGame('nba-late', 'pre', { startTime: tomorrowAt(21) }),
					makeGame('wnba-early', 'pre', { league: 'wnba', startTime: tomorrowAt(13) }),
					makeGame('nba-middle', 'pre', { startTime: tomorrowAt(17) }),
				]}
			/>,
		);
		cardOrder().should('deep.equal', ['game-card-wnba-early', 'game-card-nba-middle', 'game-card-nba-late']);
	});

	it('names the league on every card instead', () => {
		cy.mount(<MainView {...defaultProps} prefs={mixedPrefs} games={[makeGame('live'), makeGame('later', 'pre', { league: 'wnba', startTime: dayAt(1) })]} />);
		cy.get('[data-testid="game-card-live"] .game-card-league').should('have.text', 'NBA');
		cy.get('[data-testid="game-card-later"] .game-card-league').should('have.text', 'WNBA');
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

describe('mainView up next day pager', () => {
	// The regression #103 describes: truncation used to slice the flat list at 10 games, so a
	// 12-game day lost its last two under a divider claiming to head the whole day.
	it('shows every game on the selected day rather than the first ten of the slate', () => {
		const today = Array.from({ length: 12 }, (_, i) => makeGame(`today-${i}`, 'pre', { startTime: dayAt(0) }));
		cy.mount(<MainView {...defaultProps} games={[...today, makeGame('tomorrow-0', 'pre', { startTime: dayAt(1) })]} />);
		cy.get('[data-testid^="game-card-today-"]').should('have.length', 12);
	});

	it('shows only the selected day, never games from the next one', () => {
		cy.mount(<MainView {...defaultProps} games={[
			makeGame('today-0', 'pre', { startTime: dayAt(0) }),
			makeGame('tomorrow-0', 'pre', { startTime: dayAt(1) }),
		]} />);
		cy.get('[data-testid="game-card-today-0"]').should('exist');
		cy.get('[data-testid="game-card-tomorrow-0"]').should('not.exist');
	});

	it('pages forward to the next day and back again', () => {
		cy.mount(<StatefulMainView games={[
			makeGame('today-0', 'pre', { startTime: dayAt(0) }),
			makeGame('tomorrow-0', 'pre', { startTime: dayAt(1) }),
		]} />);
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Today');
		cy.get('[data-testid="upcoming-day-next"]').click();
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Tomorrow');
		cy.get('[data-testid="game-card-tomorrow-0"]').should('exist');
		cy.get('[data-testid="game-card-today-0"]').should('not.exist');
		cy.get('[data-testid="upcoming-day-previous"]').click();
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Today');
		cy.get('[data-testid="game-card-today-0"]').should('exist');
	});

	// The pager replaced the date divider, so it is the only thing naming the day. Dropping it on a
	// single-day slate would leave that day unheaded.
	it('still heads a one-day slate', () => {
		cy.mount(<MainView {...defaultProps} games={[makeGame('today-0', 'pre', { startTime: dayAt(0) })]} />);
		cy.get('[data-testid="upcoming-day-pager"]').should('exist');
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Today');
	});

	it('draws no pager when upcoming games are turned off', () => {
		cy.mount(<MainView {...defaultProps} prefs={{ ...defaultPrefs, showUpcomingGames: false }} games={[makeGame('today-0', 'pre', { startTime: dayAt(0) })]} />);
		cy.get('[data-testid="upcoming-day-pager"]').should('not.exist');
	});

	// #104: the day page used to be component state inside the view, so it went out with the remount
	// and Up Next silently reset to the first day.
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
		cy.get('[data-testid="game-card-tomorrow-0"]').should('exist');
	});

	// Both live sections are re-sorted on PowerScore, and scores arrive by push every few seconds, so
	// a resort inside the open animation's five-second window is ordinary. The plan the stagger is built from
	// is fixed on the first list that has anything in it: a card that keeps its React identity but
	// changes index would otherwise get a new `animation-delay`, which moves a running animation's
	// current time rather than restarting it, and across the eight-card cap the mode itself flips and
	// a card grows a poster from nothing or loses one mid-frame.
	it('holds the reveal stagger still when a score push resorts the list under it', () => {
		cy.mount(<ResortingMainView />);
		cy.get('[data-testid="game-card-slow"]').closest('.game-card-reveal').should('have.css', '--reveal-delay', '0ms');
		cy.get('[data-testid="game-card-fast"]').closest('.game-card-reveal').should('have.css', '--reveal-delay', '104ms');

		cy.get('[data-testid="fake-score-push"]').click();

		// The resort really happened — without this the assertions below pass for the wrong reason.
		cy.get('.game-card-reveal [data-testid^="game-card-"]').first().should('have.attr', 'data-testid', 'game-card-fast');
		// And neither card's place in the cascade moved with it.
		cy.get('[data-testid="game-card-slow"]').closest('.game-card-reveal').should('have.css', '--reveal-delay', '0ms');
		cy.get('[data-testid="game-card-fast"]').closest('.game-card-reveal').should('have.css', '--reveal-delay', '104ms');
	});
});

// Each click hands the view the next frame's props, the way successive score pushes and tab
// assignments would. The stub cards are empty, so they are given a real card's height to travel.
const SteppingMainView = ({ frames }: { frames: Partial<ComponentProps<typeof MainView>>[] }) => {
	const [step, setStep] = useState(0);
	return (
		<>
			<style>{'[data-testid^="game-card-"] { height: 120px; }'}</style>
			<button type='button' data-testid='fake-next' onClick={() => setStep(current => current + 1)}>Next</button>
			<MainView {...defaultProps} {...frames[step]} />
		</>
	);
};

const glideOf = (gameId: string) => cy.get(`[data-testid="game-card-${gameId}"]`).closest('[data-glide-key]');
const topOf = (gameId: string) => glideOf(gameId).then($glide => $glide[0]!.getBoundingClientRect().top);
const scrubGlides = (ms: number) => cy.document().then(doc => doc.getAnimations().forEach(animation => {
	animation.pause();
	animation.currentTime = ms;
}));

const swapFrames = [
	{ games: [makeGame('slow'), makeGame('fast')], scores: [score('slow', 90), score('fast', 10)] },
	{ games: [makeGame('slow'), makeGame('fast')], scores: [score('slow', 10), score('fast', 90)] },
];

describe('mainView reorder glide', () => {
	it('glides two cards past each other when a score push swaps them', () => {
		cy.mount(<SteppingMainView frames={swapFrames} />);
		topOf('slow').then(slowTop => topOf('fast').then(fastTop => {
			cy.get('[data-testid="fake-next"]').click();
			cardOrder().should('deep.equal', ['game-card-fast', 'game-card-slow']);

			scrubGlides(0);
			topOf('fast').should('be.closeTo', fastTop, 0.5);
			topOf('slow').should('be.closeTo', slowTop, 0.5);

			scrubGlides(40);
			topOf('fast').should('be.within', slowTop + 10, fastTop - 10);

			cy.document().then(doc => doc.getAnimations().forEach(animation => animation.finish()));
			topOf('fast').should('be.closeTo', slowTop, 0.5);
			topOf('slow').should('be.closeTo', fastTop, 0.5);
		}));
	});

	it('picks a card up from where it is when the order changes again mid-glide', () => {
		cy.mount(<SteppingMainView frames={[...swapFrames, swapFrames[0]!]} />);
		cy.get('[data-testid="fake-next"]').click();
		cardOrder().should('deep.equal', ['game-card-fast', 'game-card-slow']);
		scrubGlides(120);

		topOf('fast').then(caughtTop => {
			cy.get('[data-testid="fake-next"]').click();
			cardOrder().should('deep.equal', ['game-card-slow', 'game-card-fast']);
			scrubGlides(0);
			topOf('fast').should('be.closeTo', caughtTop, 0.5);
		});
	});

	it('carries a card across from Live Games to Active Tabs', () => {
		const games = [makeGame('top'), makeGame('picked')];
		const scores = [score('top', 90), score('picked', 10)];
		cy.mount(<SteppingMainView frames={[{ games, scores }, { games, scores, registry: [{ gameId: 'picked', tabId: 1 }] }]} />);
		topOf('picked').then(pickedTop => {
			cy.get('[data-testid="fake-next"]').click();
			sectionTitleOf('picked').should('have.text', 'Active Tabs');

			scrubGlides(0);
			topOf('picked').should('be.closeTo', pickedTop, 0.5);
		});
	});

	it('lets a game that just started push the list down without gliding it', () => {
		cy.mount(<SteppingMainView frames={[
			{ games: [makeGame('a'), makeGame('b')], scores: [score('a', 60), score('b', 40)] },
			{ games: [makeGame('new'), makeGame('a'), makeGame('b')], scores: [score('new', 90), score('a', 60), score('b', 40)] },
		]} />);
		cy.get('[data-testid="fake-next"]').click();
		cardOrder().should('deep.equal', ['game-card-new', 'game-card-a', 'game-card-b']);
		cy.get('[data-glide-key]').each($glide => expect($glide[0]!.getAnimations()).to.have.length(0));
	});

	it('jumps straight to the new order under reduced motion', () => {
		cy.mount(<SteppingMainView frames={swapFrames} />);
		cy.window().then(win => {
			const realMatchMedia = win.matchMedia.bind(win);
			cy.stub(win, 'matchMedia').callsFake((query: string) => (
				query.includes('prefers-reduced-motion') ? { ...realMatchMedia(query), matches: true } : realMatchMedia(query)
			));
		});
		cy.get('[data-testid="fake-next"]').click();
		cardOrder().should('deep.equal', ['game-card-fast', 'game-card-slow']);
		cy.get('[data-glide-key]').each($glide => expect($glide[0]!.getAnimations()).to.have.length(0));
	});
});

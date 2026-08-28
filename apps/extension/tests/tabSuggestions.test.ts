import type { Game, LeagueId, SportType, TabRegistration, Team } from '@arenaswap/core/types';
import {
	applyTabSuggestions,
	assignTabToGame,
	dismissSuggestions,
	filterDismissedSuggestions,
	isSuggestableUrl,
	normalizeDismissedSuggestions,
	scoreTabGamePair,
	suggestTabAssignments,
	type SuggestionTab,
	type TabSuggestion,
} from '../utils/tabSuggestions';

const team = (id: string, name: string, abbreviation: string): Team => ({ id, name, abbreviation, score: 0 });

const makeGame = (
	id: string,
	league: LeagueId,
	sportType: SportType,
	home: Team,
	away: Team,
	overrides: Partial<Game> = {},
): Game => ({
	id,
	league,
	sportType,
	homeTeam: home,
	awayTeam: away,
	period: 1,
	clockSeconds: 600,
	status: 'in',
	...overrides,
});

const makeTab = (id: number, title: string, url: string): SuggestionTab => ({ id, title, url });

const celticsKnicks = makeGame(
	'401704999', 'nba', 'basketball',
	team('2', 'Boston Celtics', 'BOS'),
	team('18', 'New York Knicks', 'NYK'),
);
const celticsHeat = makeGame(
	'401705000', 'nba', 'basketball',
	team('2', 'Boston Celtics', 'BOS'),
	team('14', 'Miami Heat', 'MIA'),
	{ status: 'pre', startTime: '2026-08-28T23:00:00Z' },
);
const celticsKnicksLater = makeGame(
	'401705111', 'nba', 'basketball',
	team('2', 'Boston Celtics', 'BOS'),
	team('18', 'New York Knicks', 'NYK'),
	{ status: 'pre', startTime: '2026-08-29T23:00:00Z' },
);
const buckeyesWolverines = makeGame(
	'401600001', 'ncaaf', 'football',
	team('194', 'Ohio State Buckeyes', 'OSU'),
	team('130', 'Michigan Wolverines', 'MICH'),
);
const liverpoolArsenal = makeGame(
	'704789', 'epl', 'soccer',
	team('364', 'Liverpool FC', 'LIV'),
	team('359', 'Arsenal', 'ARS'),
);
const redSoxBlueJays = makeGame(
	'401580002', 'mlb', 'baseball',
	team('2', 'Boston Red Sox', 'BOS'),
	team('14', 'Toronto Blue Jays', 'TOR'),
);
const madridBarcelona = makeGame(
	'401590003', 'laliga', 'soccer',
	team('86', 'Real Madrid', 'RMA'),
	team('83', 'Barcelona', 'BAR'),
);

describe('scoreTabGamePair', () => {
	describe('matches that must not happen', () => {
		it('ignores a newspaper that merely shares a city', () => {
			const tab = makeTab(1, 'Boston Globe - Local News', 'https://bostonglobe.com/');
			expect(scoreTabGamePair(tab, celticsKnicks)).toBe(0);
			expect(scoreTabGamePair(tab, redSoxBlueJays)).toBe(0);
		});

		it('ignores a city name shared with a team', () => {
			const tab = makeTab(2, 'The New York Times', 'https://nytimes.com/');
			expect(scoreTabGamePair(tab, celticsKnicks)).toBe(0);
		});

		it('does not match an abbreviation inside a longer word', () => {
			const tab = makeTab(3, 'Best Jobs in Boston', 'https://example.com/jobs/boston');
			expect(scoreTabGamePair(tab, celticsKnicks)).toBe(0);
		});

		it('never surfaces a row on a single abbreviation', () => {
			const tab = makeTab(4, 'OSU Extension Service', 'https://extension.osu.edu/');
			expect(scoreTabGamePair(tab, buckeyesWolverines)).toBe(0);
		});

		it('ignores a club-form word standing alone', () => {
			const tab = makeTab(5, 'Real Sociedad transfer news', 'https://example.com/real-sociedad');
			expect(scoreTabGamePair(tab, madridBarcelona)).toBe(0);
		});
	});

	describe('matches that must happen', () => {
		it('scores both nicknames plus the league', () => {
			const tab = makeTab(10, 'Celtics vs Knicks Live Stream', 'https://streameast.io/nba/celtics-vs-knicks');
			expect(scoreTabGamePair(tab, celticsKnicks)).toBe(97);
		});

		it('handles multi-word nicknames on both sides', () => {
			const tab = makeTab(11, 'Red Sox @ Blue Jays', 'https://example.com/watch');
			expect(scoreTabGamePair(tab, redSoxBlueJays)).toBe(79);
		});

		it('anchors past a trailing club suffix and matches single-token clubs', () => {
			const tab = makeTab(12, 'Liverpool vs Arsenal live', 'https://example.com/watch');
			expect(scoreTabGamePair(tab, liverpoolArsenal)).toBe(82);
		});

		it('treats both tokens of a two-word club as load-bearing', () => {
			const tab = makeTab(13, 'Real Madrid vs Barcelona', 'https://example.com/watch');
			expect(scoreTabGamePair(tab, madridBarcelona)).toBe(85);
		});

		it('lets a multi-token location originate, which unlocks the other side', () => {
			const tab = makeTab(14, 'Ohio State vs Michigan | Watch', 'https://example.com/watch');
			expect(scoreTabGamePair(tab, buckeyesWolverines)).toBe(61);
		});

		it('recovers a scoreboard tab from two abbreviations', () => {
			const tab = makeTab(15, 'BOS 102 - NYK 98 - Final', 'https://example.com/scores');
			expect(scoreTabGamePair(tab, celticsKnicks)).toBe(55);
		});

		it('strips diacritics', () => {
			const atleti = makeGame(
				'401590004', 'laliga', 'soccer',
				team('1068', 'Atletico Madrid', 'ATM'),
				team('83', 'Barcelona', 'BAR'),
			);
			const tab = makeTab(16, 'Atlético Madrid vs Barcelona', 'https://example.com/watch');
			expect(scoreTabGamePair(tab, atleti)).toBe(85);
		});

		it('matches on URL tokens when the title is useless', () => {
			const tab = makeTab(17, 'Live Stream', 'https://x.tv/nba/boston-celtics-vs-new-york-knicks');
			expect(scoreTabGamePair(tab, celticsKnicks)).toBeGreaterThan(50);
		});

		it('decodes percent-encoded queries and survives malformed ones', () => {
			expect(scoreTabGamePair(makeTab(18, '', 'https://x.com/s?q=Boston%20Celtics%20Knicks'), celticsKnicks)).toBeGreaterThan(0);
			expect(() => scoreTabGamePair(makeTab(19, 'Celtics Knicks', 'https://x.com/%E0%A4%A'), celticsKnicks)).not.toThrow();
		});
	});

	describe('league corroboration', () => {
		it('adds points for the league but cannot surface a row alone', () => {
			expect(scoreTabGamePair(makeTab(20, 'NBA Scores and Standings', 'https://espn.com/nba/scoreboard'), celticsKnicks)).toBe(0);
			const bare = scoreTabGamePair(makeTab(21, 'Celtics live', 'https://example.com/watch'), celticsKnicks);
			const withLeague = scoreTabGamePair(makeTab(22, 'Celtics live', 'https://espn.com/nba/x'), celticsKnicks);
			expect(withLeague - bare).toBe(18);
		});

		it('takes the max of label and path rather than the sum', () => {
			expect(scoreTabGamePair(makeTab(23, 'NBA Celtics live', 'https://espn.com/nba/x'), celticsKnicks))
				.toBe(scoreTabGamePair(makeTab(24, 'Celtics live', 'https://espn.com/nba/x'), celticsKnicks));
		});

		it('does not fire on fragments of a dotted soccer path', () => {
			const tab = makeTab(25, 'eng 1 news', 'https://example.com/eng/1');
			expect(scoreTabGamePair(tab, liverpoolArsenal)).toBe(0);
		});
	});

	describe('the ESPN event id', () => {
		it('matches when the id sits behind a recognisable key', () => {
			const tab = makeTab(30, 'Knicks vs Celtics', 'https://www.espn.com/nba/game/_/gameId/401704999/knicks-celtics');
			expect(scoreTabGamePair(tab, celticsKnicks)).toBeGreaterThan(120);
		});

		it('ignores a bare number that happens to equal the id', () => {
			const tab = makeTab(31, '', 'https://example.com/watch?t=401704999');
			expect(scoreTabGamePair(tab, celticsKnicks)).toBe(0);
		});

		it('ignores a six-digit soccer id appearing in a product URL', () => {
			const tab = makeTab(32, 'Running Shoes', 'https://shop.example.com/product/704789');
			expect(scoreTabGamePair(tab, liverpoolArsenal)).toBe(0);
		});

		it('never engages for non-numeric demo ids', () => {
			const mock = makeGame('mock-1', 'nba', 'basketball', team('2', 'Boston Celtics', 'BOS'), team('18', 'New York Knicks', 'NYK'));
			const tab = makeTab(33, '', 'https://example.com/gameId/mock-1');
			expect(scoreTabGamePair(tab, mock)).toBe(0);
		});
	});
});

describe('suggestTabAssignments', () => {
	const base = { games: [celticsKnicks, celticsHeat, buckeyesWolverines], registry: [] as TabRegistration[] };

	it('prefers the live game when two games score identically', () => {
		const tab = makeTab(1, 'Celtics vs Knicks Live', 'https://example.com/watch');
		const [first, ...rest] = suggestTabAssignments({ ...base, games: [celticsKnicksLater, celticsKnicks], tabs: [tab] });
		expect(first.gameId).toBe(celticsKnicks.id);
		expect(rest).toHaveLength(0);
	});

	it('gives each tab exactly one row, its best game', () => {
		const tab = makeTab(1, 'Celtics vs Knicks Live', 'https://example.com/watch');
		const suggestions = suggestTabAssignments({ ...base, tabs: [tab] });
		expect(suggestions).toHaveLength(1);
		expect(suggestions[0].gameId).toBe(celticsKnicks.id);
	});

	it('leaves a weak row unchecked and checks a strong one', () => {
		const strong = makeTab(1, 'Celtics vs Knicks Live', 'https://espn.com/nba/x');
		const weak = makeTab(2, 'Ohio State Buckeyes roster', 'https://example.com/roster');
		const suggestions = suggestTabAssignments({ ...base, tabs: [strong, weak] });
		expect(suggestions.find(s => s.tabId === 1)?.preChecked).toBe(true);
		expect(suggestions.find(s => s.tabId === 2)?.preChecked).toBe(false);
	});

	it('excludes tabs and games that are already paired', () => {
		const tab = makeTab(1, 'Celtics vs Knicks Live', 'https://example.com/watch');
		const other = makeTab(2, 'Celtics vs Knicks Mirror', 'https://example.com/mirror');
		expect(suggestTabAssignments({ ...base, tabs: [tab], registry: [{ tabId: 1, gameId: 'unrelated' }] })).toHaveLength(0);
		expect(suggestTabAssignments({ ...base, tabs: [other], registry: [{ tabId: 9, gameId: celticsKnicks.id }] })
			.every(s => s.gameId !== celticsKnicks.id)).toBe(true);
	});

	it('excludes the extension\'s own pages and other non-web tabs', () => {
		const own = makeTab(1, 'ArenaSwap - Celtics vs Knicks', 'chrome-extension://abcdef/popup.html');
		const blank = makeTab(2, 'Celtics vs Knicks', 'about:blank');
		const settings = makeTab(3, 'Celtics vs Knicks', 'edge://settings');
		expect(suggestTabAssignments({ ...base, tabs: [own, blank, settings] })).toHaveLength(0);
	});

	it('excludes the standby stream tab', () => {
		const tab = makeTab(7, 'Celtics vs Knicks Live', 'https://example.com/watch');
		expect(suggestTabAssignments({ ...base, tabs: [tab], standbyStreamTabId: 7 })).toHaveLength(0);
	});

	it('never suggests a finished game', () => {
		const done = makeGame('401704998', 'nba', 'basketball', team('2', 'Boston Celtics', 'BOS'), team('18', 'New York Knicks', 'NYK'), { status: 'post' });
		const tab = makeTab(1, 'Celtics vs Knicks Live', 'https://example.com/watch');
		expect(suggestTabAssignments({ tabs: [tab], games: [done], registry: [] })).toHaveLength(0);
	});

	it('drops dismissed pairs', () => {
		const tab = makeTab(1, 'Celtics vs Knicks Live', 'https://example.com/watch');
		expect(suggestTabAssignments({ ...base, tabs: [tab], dismissed: [`1:${celticsKnicks.id}`] })).toHaveLength(0);
	});

	it('produces identical output regardless of input order', () => {
		const tabs = [
			makeTab(1, 'Celtics vs Knicks Live', 'https://example.com/watch'),
			makeTab(2, 'Ohio State vs Michigan', 'https://example.com/cfb'),
		];
		const forward = suggestTabAssignments({ ...base, tabs });
		const reversed = suggestTabAssignments({ ...base, tabs: tabs.toReversed(), games: base.games.toReversed() });
		expect(reversed).toEqual(forward);
	});
});

describe('registry writes', () => {
	it('keeps one tab per game and one game per tab', () => {
		const registry: TabRegistration[] = [{ tabId: 1, gameId: 'a' }, { tabId: 2, gameId: 'b' }];
		expect(assignTabToGame(registry, 2, 'a')).toEqual([{ tabId: 2, gameId: 'a' }]);
	});

	it('reproduces the assign dropdown\'s own filter chain', () => {
		const registry: TabRegistration[] = [{ tabId: 1, gameId: 'a' }, { tabId: 2, gameId: 'b' }];
		const dropdown = [...registry.filter(r => r.gameId !== 'a').filter(r => r.tabId !== 2), { tabId: 2, gameId: 'a' }];
		expect(assignTabToGame(registry, 2, 'a')).toEqual(dropdown);
	});

	it('drops a later accepted row that collides with an earlier one', () => {
		const accepted: TabSuggestion[] = [
			{ tabId: 1, gameId: 'a', score: 90, preChecked: true },
			{ tabId: 2, gameId: 'a', score: 70, preChecked: true },
			{ tabId: 1, gameId: 'b', score: 60, preChecked: false },
		];
		expect(applyTabSuggestions([], accepted)).toEqual([{ tabId: 1, gameId: 'a' }]);
	});
});

describe('dismissal', () => {
	const shown: TabSuggestion[] = [
		{ tabId: 1, gameId: 'a', score: 90, preChecked: true },
		{ tabId: 2, gameId: 'b', score: 40, preChecked: false },
	];

	it('records every shown pair, not just the checked ones', () => {
		const dismissed = dismissSuggestions([], shown);
		expect(dismissed).toEqual(['1:a', '2:b']);
		expect(filterDismissedSuggestions(shown, dismissed)).toHaveLength(0);
	});

	it('lets a genuinely new pair through', () => {
		const dismissed = dismissSuggestions([], shown);
		const fresh: TabSuggestion = { tabId: 3, gameId: 'c', score: 80, preChecked: true };
		expect(filterDismissedSuggestions([...shown, fresh], dismissed)).toEqual([fresh]);
	});

	it('re-raises when a dismissed tab navigates to a different game', () => {
		const dismissed = dismissSuggestions([], shown);
		const moved: TabSuggestion = { tabId: 1, gameId: 'c', score: 80, preChecked: true };
		expect(filterDismissedSuggestions([moved], dismissed)).toEqual([moved]);
	});

	it('normalizes whatever session storage hands back', () => {
		expect(normalizeDismissedSuggestions(undefined)).toEqual([]);
		expect(normalizeDismissedSuggestions('x')).toEqual([]);
		expect(normalizeDismissedSuggestions([1, 'a:b', 'a:b', ''])).toEqual(['a:b']);
	});
});

describe('isSuggestableUrl', () => {
	it('accepts ordinary web pages and rejects browser surfaces', () => {
		expect(isSuggestableUrl('https://espn.com/nba')).toBe(true);
		expect(isSuggestableUrl('')).toBe(false);
		for (const url of ['chrome://extensions', 'about:blank', 'file:///tmp/x', 'view-source:https://x.com', 'moz-extension://a/b.html']) {
			expect(isSuggestableUrl(url)).toBe(false);
		}
	});
});

describe('same-city collisions', () => {
	// Both reported from manual testing against real Xfinity Stream tabs, where the title is
	// useless and everything worth matching on lives in the URL.
	const ramsChargers = makeGame(
		'401700010', 'nfl', 'football',
		team('24', 'Los Angeles Chargers', 'LAC'),
		team('14', 'Los Angeles Rams', 'LAR'),
	);
	const dodgersBraves = makeGame(
		'401580011', 'mlb', 'baseball',
		team('15', 'Atlanta Braves', 'ATL'),
		team('19', 'Los Angeles Dodgers', 'LAD'),
	);
	const cubsWhiteSox = makeGame(
		'401580012', 'mlb', 'baseball',
		team('16', 'Chicago White Sox', 'CWS'),
		team('16', 'Chicago Cubs', 'CHC'),
	);

	const mlbTab = makeTab(40, 'MLB - Xfinity Stream',
		'https://www.xfinity.com/stream/live/Watch-MLB-Baseball---Los-Angeles-Dodgers-at-Atlanta-Braves/5628918118244997105/FS1HD');

	it('does not let one city stand in for two teams that share it', () => {
		expect(scoreTabGamePair(mlbTab, ramsChargers)).toBe(0);
	});

	it('still matches the game the tab is actually showing', () => {
		expect(scoreTabGamePair(mlbTab, dodgersBraves)).toBe(103);
	});

	it('ignores a bare city shared by two teams in the same league', () => {
		const tab = makeTab(41, 'Chicago', 'https://example.com/chicago');
		expect(scoreTabGamePair(tab, cubsWhiteSox)).toBe(0);
	});

	it('still matches an all-one-city game once the nicknames appear', () => {
		const tab = makeTab(42, 'Rams vs Chargers live', 'https://example.com/watch');
		expect(scoreTabGamePair(tab, ramsChargers)).toBeGreaterThan(50);
	});

	it('does not credit the other side when only one team is named', () => {
		const tab = makeTab(43, 'Los Angeles Rams', 'https://example.com/watch');
		// The Rams full name identifies them; the Chargers cannot ride the same 'los angeles'.
		expect(scoreTabGamePair(tab, ramsChargers)).toBe(30);
	});

	it('reads a matchup out of the URL when the title says nothing', () => {
		const tab = makeTab(44, 'All Channels - Xfinity Stream',
			'https://www.xfinity.com/stream/live/Watch-NFL-Football---Pittsburgh-Steelers-at-Buffalo-Bills/5032472274863868105/NFLHD');
		const billsSteelers = makeGame(
			'401700013', 'nfl', 'football',
			team('2', 'Buffalo Bills', 'BUF'),
			team('23', 'Pittsburgh Steelers', 'PIT'),
		);
		expect(scoreTabGamePair(tab, billsSteelers)).toBe(103);
		expect(scoreTabGamePair(tab, ramsChargers)).toBe(0);
	});
});

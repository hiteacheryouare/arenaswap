import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, TabRegistration, Team } from '@arenaswap/core/types';

export interface SuggestionTab {
	id: number;
	title: string;
	url: string;
}

export interface TabSuggestion {
	tabId: number;
	gameId: string;
	score: number;
	preChecked: boolean;
}

export interface SuggestTabAssignmentsParams {
	tabs: readonly SuggestionTab[];
	games: readonly Game[];
	registry: readonly TabRegistration[];
	dismissed?: readonly string[];
	standbyStreamTabId?: number | null;
}

export const tabSuggestionDismissalsKey = 'tabSuggestionDismissals';

export const tabSuggestionWeights = {
	teamName: 30,
	fullNameMultiplier: 1,
	anchorMultiplier: 0.9,
	partialMultiplier: 0.6,
	abbreviation: 15,
	bothTeams: 25,
	leagueLabel: 12,
	leaguePath: 18,
	exactId: 40,
	preCheckThreshold: 50,
	minAbbreviationLength: 3,
	minLeadingTokenLength: 4,
} as const;

// Club-form and place-qualifier words that identify nothing on their own. Unlike a streaming-domain
// or team-nickname list, this one tracks language rather than the outside world, so it does not grow
// when a league adds a team or a new site launches.
const genericTokens = new Set([
	'fc', 'cf', 'sc', 'ac', 'afc', 'club', 'deportivo', 'sport', 'sporting', 'athletic', 'atletico',
	'united', 'city', 'town', 'county', 'real', 'olympic', 'olympique', 'national', 'state',
	'college', 'university', 'the', 'of', 'and', 'new', 'north', 'south', 'east', 'west',
	'san', 'los', 'las',
]);

const blockedSchemes = [
	'chrome://', 'about:', 'edge://', 'brave://', 'vivaldi://', 'opera://', 'view-source:',
	'file://', 'devtools://', 'chrome-extension://', 'moz-extension://', 'extension://',
	'safari-web-extension://',
];

const maxDismissedSuggestions = 500;

const tokenize = (value: string): string[] =>
	value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

const decodeUrl = (url: string): string => {
	try {
		return decodeURIComponent(url);
	} catch {
		return url;
	}
};

// Title and URL become one padded token string separated by a sentinel the tokenizer can never
// emit. The padding gives every lookup a word boundary for free, so 'bos' cannot match inside
// 'jobs'; the sentinel stops a phrase from spanning the title/URL join.
export const buildTabHaystack = (tab: SuggestionTab): string =>
	` ${[...tokenize(tab.title), '|', ...tokenize(decodeUrl(tab.url))].join(' ')} `;

const containsPhrase = (haystack: string, phrase: readonly string[]): boolean =>
	phrase.length > 0 && haystack.includes(` ${phrase.join(' ')} `);

const containsSubPhrase = (haystack: string, tokens: readonly string[]): boolean => {
	const shortest = tokens.length === 1 ? 1 : 2;
	for (let length = tokens.length; length >= shortest; length--) {
		for (let start = 0; start + length <= tokens.length; start++) {
			if (containsPhrase(haystack, tokens.slice(start, start + length))) return true;
		}
	}
	return false;
};

interface NameMatch {
	multiplier: number;
	// A full or nickname-anchored match identifies a team on its own. A location fragment does not:
	// 'new york' and 'ohio state' are the same shape, so strength alone cannot tell the New York
	// Times from a Buckeyes game. scoreHaystack settles that by looking at both teams together.
	strong: boolean;
}

interface TeamNameMatch extends NameMatch {
	// The text the match was made on, so two teams cannot both claim the same mention.
	phrase: string;
}

interface NameCandidate {
	start: number;
	end: number;
	tokenCount: number;
	anchor: number;
}

// The index of the last non-generic token. Not simply the last token: that would make the anchor of
// 'Liverpool FC' the meaningless 'fc', and of 'Manchester United' the 'united' shared with a dozen
// other clubs.
const anchorIndex = (tokens: readonly string[]): number => {
	for (let index = tokens.length - 1; index >= 0; index--) {
		const token = tokens[index];
		if (token && !genericTokens.has(token)) return index;
	}
	return tokens.length - 1;
};

const classifyNameCandidate = ({ start, end, tokenCount, anchor }: NameCandidate): NameMatch => {
	if (start === 0 && end === tokenCount) {
		return { multiplier: tabSuggestionWeights.fullNameMultiplier, strong: true };
	}
	if (end === anchor + 1) {
		return { multiplier: tabSuggestionWeights.anchorMultiplier, strong: true };
	}
	if (end - start >= 2) {
		return { multiplier: tabSuggestionWeights.partialMultiplier, strong: false };
	}
	// A lone leading token is the city, not the team.
	return { multiplier: tabSuggestionWeights.partialMultiplier, strong: false };
};

const matchTeamName = (haystack: string, name: string): TeamNameMatch | null => {
	const tokens = tokenize(name);
	if (tokens.length === 0) return null;
	const anchor = anchorIndex(tokens);

	for (let length = tokens.length; length >= 1; length--) {
		for (let start = 0; start + length <= tokens.length; start++) {
			const phrase = tokens.slice(start, start + length);
			if (phrase.every(token => genericTokens.has(token))) continue;
			if (length === 1) {
				const token = phrase[0] ?? '';
				if (start !== anchor && start !== 0) continue;
				if (token.length < 3) continue;
				if (start !== anchor && token.length < tabSuggestionWeights.minLeadingTokenLength) continue;
			}
			if (!containsPhrase(haystack, phrase)) continue;
			return {
				...classifyNameCandidate({ start, end: start + length, tokenCount: tokens.length, anchor }),
				phrase: phrase.join(' '),
			};
		}
	}
	return null;
};

interface TeamSignal {
	score: number;
	strong: boolean;
	matched: boolean;
	abbreviationHit: boolean;
	phrase: string | null;
}

const scoreTeam = (haystack: string, team: Team): TeamSignal => {
	const name = matchTeamName(haystack, team.name);
	const abbreviation = tokenize(team.abbreviation);
	const abbreviationHit = abbreviation.length === 1
		&& (abbreviation[0] ?? '').length >= tabSuggestionWeights.minAbbreviationLength
		&& containsPhrase(haystack, abbreviation);

	return {
		score: (name ? tabSuggestionWeights.teamName * name.multiplier : 0)
			+ (abbreviationHit ? tabSuggestionWeights.abbreviation : 0),
		strong: name?.strong ?? false,
		matched: name !== null || abbreviationHit,
		abbreviationHit,
		phrase: name?.phrase ?? null,
	};
};

const phrasesShareText = (a: string, b: string): boolean =>
	` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `);

// Los Angeles Rams and Los Angeles Chargers both match the one 'los angeles' in a Dodgers URL, and
// two teams reading the same mention is a single coincidence billed twice. A weak match whose text
// the other team already claimed is dropped, so a shared city cannot be evidence for both sides.
const dropSharedMention = (subject: TeamSignal, other: TeamSignal): TeamSignal => {
	if (subject.strong || subject.phrase === null || other.phrase === null) return subject;
	if (!phrasesShareText(subject.phrase, other.phrase)) return subject;
	return {
		score: subject.abbreviationHit ? tabSuggestionWeights.abbreviation : 0,
		strong: false,
		matched: subject.abbreviationHit,
		abbreviationHit: subject.abbreviationHit,
		phrase: null,
	};
};

const scoreLeague = (haystack: string, game: Game): number => {
	const config = leagueConfigMap[game.league];
	if (!config) return 0;

	const [sport = '', leagueSegment = ''] = config.espnPath.split('/');
	// Dotted segments ('eng.1', 'usa.nwsl') tokenize into fragments too short to carry meaning, so
	// only the sport half of those paths participates.
	const leagueTokens = leagueSegment.includes('.')
		? []
		: tokenize(leagueSegment).filter(token => token.length >= 3);
	const pathHit = containsPhrase(haystack, leagueTokens) || containsPhrase(haystack, tokenize(sport));

	const labelTokens = tokenize(config.label).filter(token => token.length >= 3);
	const labelHit = containsSubPhrase(haystack, labelTokens);

	// Max rather than sum: for the NBA the label and the path segment are the same token, and one
	// coincidence should not be counted twice.
	return Math.max(
		pathHit ? tabSuggestionWeights.leaguePath : 0,
		labelHit ? tabSuggestionWeights.leagueLabel : 0,
	);
};

// The id must sit immediately after a recognisable key. A bare number has no provenance: soccer
// event ids are only six digits, which a bare-number rule would match against half the product URLs
// on the web.
const matchesEventId = (url: string, gameId: string): boolean => {
	if (!/^\d{5,}$/.test(gameId)) return false;
	const matches = url.toLowerCase().matchAll(/(?:gameid|eventid|matchid|competitionid)[/=:_-]+(\d{5,})/g);
	for (const match of matches) {
		if (match[1] === gameId) return true;
	}
	return false;
};

const scoreHaystack = (haystack: string, url: string, game: Game): number => {
	const idHit = matchesEventId(url, game.id);
	const rawHome = scoreTeam(haystack, game.homeTeam);
	const rawAway = scoreTeam(haystack, game.awayTeam);
	const home = dropSharedMention(rawHome, rawAway);
	const away = dropSharedMention(rawAway, rawHome);

	// One team identified outright is enough. So is a faint read on both of them at once — two
	// coincidences in one tab is not a coincidence. Anything less stays silent, which is what keeps
	// 'Boston Globe' and 'The New York Times' off the list.
	const originated = idHit || home.strong || away.strong || (home.matched && away.matched);
	if (!originated) return 0;

	const bothTeams = home.score > 0 && away.score > 0 ? tabSuggestionWeights.bothTeams : 0;
	return (idHit ? tabSuggestionWeights.exactId : 0)
		+ home.score
		+ away.score
		+ bothTeams
		+ scoreLeague(haystack, game);
};

export const scoreTabGamePair = (tab: SuggestionTab, game: Game): number =>
	scoreHaystack(buildTabHaystack(tab), tab.url, game);

export const isSuggestableUrl = (url: string): boolean => {
	if (!url) return false;
	const lowered = url.toLowerCase();
	return !blockedSchemes.some(scheme => lowered.startsWith(scheme));
};

const startTimeValue = (game: Game): number => {
	const parsed = game.startTime ? Date.parse(game.startTime) : Number.NaN;
	return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

// Live is a tiebreak rather than a bonus. A bonus would let a weak live match beat a strong
// scheduled one; the signal set is small enough that two games of the same tab often score
// identically, which is exactly where a tiebreak belongs.
const compareCandidates = (a: { score: number; game: Game }, b: { score: number; game: Game }): number =>
	b.score - a.score
	|| (a.game.status === 'in' ? 0 : 1) - (b.game.status === 'in' ? 0 : 1)
	|| startTimeValue(a.game) - startTimeValue(b.game)
	|| a.game.id.localeCompare(b.game.id);

export const suggestionPairKey = (tabId: number, gameId: string): string => `${tabId}:${gameId}`;

export const suggestTabAssignments = ({
	tabs,
	games,
	registry,
	dismissed = [],
	standbyStreamTabId = null,
}: SuggestTabAssignmentsParams): TabSuggestion[] => {
	const registeredTabIds = new Set(registry.map(entry => entry.tabId));
	const registeredGameIds = new Set(registry.map(entry => entry.gameId));
	const dismissedKeys = new Set(dismissed);

	const eligibleGames = games.filter(game =>
		(game.status === 'in' || game.status === 'pre') && !registeredGameIds.has(game.id));
	const eligibleTabs = tabs.filter(tab =>
		Number.isInteger(tab.id)
		&& isSuggestableUrl(tab.url)
		&& !registeredTabIds.has(tab.id)
		&& tab.id !== standbyStreamTabId);

	const suggestions: TabSuggestion[] = [];
	for (const tab of eligibleTabs) {
		const haystack = buildTabHaystack(tab);
		let best: { score: number; game: Game } | null = null;

		for (const game of eligibleGames) {
			const score = scoreHaystack(haystack, tab.url, game);
			if (score <= 0) continue;
			const candidate = { score, game };
			if (!best || compareCandidates(candidate, best) < 0) best = candidate;
		}

		if (!best) continue;
		if (dismissedKeys.has(suggestionPairKey(tab.id, best.game.id))) continue;
		suggestions.push({
			tabId: tab.id,
			gameId: best.game.id,
			score: best.score,
			preChecked: best.score >= tabSuggestionWeights.preCheckThreshold,
		});
	}

	return suggestions.toSorted((a, b) => b.score - a.score || a.tabId - b.tabId);
};

// The registry is a bijection: one tab per game and one game per tab. This is the rule the assign
// dropdown has always applied inline; both callers share it now so they cannot drift.
export const assignTabToGame = (
	registry: readonly TabRegistration[],
	tabId: number,
	gameId: string,
): TabRegistration[] => [
	...registry.filter(entry => entry.gameId !== gameId && entry.tabId !== tabId),
	{ tabId, gameId },
];

export const applyTabSuggestions = (
	registry: readonly TabRegistration[],
	accepted: readonly TabSuggestion[],
): TabRegistration[] => {
	const usedTabs = new Set<number>();
	const usedGames = new Set<string>();

	return accepted.reduce<TabRegistration[]>((next, suggestion) => {
		if (usedTabs.has(suggestion.tabId) || usedGames.has(suggestion.gameId)) return next;
		usedTabs.add(suggestion.tabId);
		usedGames.add(suggestion.gameId);
		return assignTabToGame(next, suggestion.tabId, suggestion.gameId);
	}, [...registry]);
};

export const normalizeDismissedSuggestions = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];
	return [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))];
};

// Every shown pair is recorded, not just the accepted ones: leaving the unchecked rows out would
// re-raise the banner the moment the popup reopened.
export const dismissSuggestions = (
	dismissed: readonly string[],
	shown: readonly TabSuggestion[],
): string[] => {
	const merged = [...dismissed, ...shown.map(entry => suggestionPairKey(entry.tabId, entry.gameId))];
	return [...new Set(merged)].slice(-maxDismissedSuggestions);
};

export const filterDismissedSuggestions = (
	suggestions: readonly TabSuggestion[],
	dismissed: readonly string[],
): TabSuggestion[] => {
	const dismissedKeys = new Set(dismissed);
	return suggestions.filter(entry => !dismissedKeys.has(suggestionPairKey(entry.tabId, entry.gameId)));
};

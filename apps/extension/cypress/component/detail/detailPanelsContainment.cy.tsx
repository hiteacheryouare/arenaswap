import BoxScorePlaceholder from '../../../entrypoints/popup/components/standingsTable';
import DetailStickyBar from '../../../entrypoints/popup/components/detailStickyBar';
import DueUpPanel from '../../../entrypoints/popup/components/dueUpPanel';
import GameInfoPanel from '../../../entrypoints/popup/components/gameInfoPanel';
import MatchupPanel from '../../../entrypoints/popup/components/matchupPanel';
import PowerScoreBreakdown from '../../../entrypoints/popup/components/powerScoreBreakdown';
import PregameStats from '../../../entrypoints/popup/components/pregameStats';
import type { Game, Team } from '@arenaswap/core/types';
import type { InjuryEntry, Matchup, StandingsGroup } from '@arenaswap/sideline';
import { makeGame } from '../../support/fixtures';
import { inEveryLocale } from '../../support/safetyNet/locales';
import { mountInPopup, popupSurface } from '../../support/safetyNet/mountInPopup';
import { worstBroadcasts, worstCaseGames, worstTeams, worstVenues } from '../../support/safetyNet/worstCase';

const StandingsTable = BoxScorePlaceholder;

// Longest short name a real athlete carries in the recordings is far shorter than these, so the
// player names are the worst a roster can plausibly hand us: a hyphenated double surname and a
// suffix, which is what the longest real ones look like.
const longPlayer = 'P. Crow-Armstrong-Fernandez Jr.';
const longDetail = 'Left Knee Patellar Tendon Soreness';

const withVenue = (game: Game, venue: Pick<Game, 'venueName' | 'venueLocation'>): Game => ({
	...game,
	...venue,
	broadcasts: worstBroadcasts,
	weather: { temperatureF: -12, conditionLabel: 'Thunderstorms in the Vicinity', conditionCode: 4 } as Game['weather'],
	attendance: 106_594,
	odds: { details: 'STONEHILL -12.5', overUnder: 231.5, provider: { name: 'DraftKings' } },
});

describe('game info panel containment', () => {
	for (const [name, venue] of Object.entries(worstVenues)) {
		inEveryLocale(`keeps the ${name} venue, every network and the line inside the panel`, locale => {
			const game = withVenue(worstCaseGames[0].game, venue);
			mountInPopup(<GameInfoPanel game={game} bettingPrefs={{ bettingEnabled: true }} weatherPrefs={{ temperatureUnit: 'F' }} gameDurationMins={207} tickets={{ url: 'https://tickets.test/x', minPrice: 1234567 }} />, locale);
			cy.get(popupSurface).assertContained();
		});
	}
});

const leaders = (side: string, value: string) => ([
	{ category: 'passingyards', fallbackLabel: 'PYDS', player: `${side} ${longPlayer}`, value },
	{ category: 'rushingyards', fallbackLabel: 'RYDS', player: `${side} ${longPlayer}`, value },
	{ category: 'homeruns', fallbackLabel: 'HR', player: `${side} ${longPlayer}`, value },
	{ category: 'unlistedcategory', fallbackLabel: 'LONGFALLBACK', player: longPlayer, value },
]);

const starter = { name: `${longPlayer} ${longPlayer}`, winLoss: '12-14', era: '10.57', status: 'confirmed' as const };

describe('pregame stats containment', () => {
	for (const sport of [{ league: 'nfl', sportType: 'football' }, { league: 'mlb', sportType: 'baseball' }, { league: 'nhl', sportType: 'hockey' }] as const) {
		inEveryLocale(`keeps ${sport.sportType} leaders and starters with long names inside the card`, locale => {
			const base = worstCaseGames[0].game;
			const game: Game = {
				...base,
				...sport,
				status: 'pre',
				awayTeam: { ...base.awayTeam, leaders: leaders('Away', '14/23, 141 YDS, 1 INT'), probableStarter: starter },
				homeTeam: { ...base.homeTeam, leaders: leaders('Home', '14/23, 141 YDS, 1 INT'), probableStarter: { name: longPlayer, line: '(7-7, 5.17)' } },
			};
			mountInPopup(<PregameStats game={game} />, locale);
			cy.get(popupSurface).assertContained();
		});
	}
});

const form = (opponent: string, isAway: boolean, index: number) => ({
	id: `${opponent}-${index}`,
	result: (['W', 'L', 'D', 'T', 'W'] as const)[index % 5]!,
	isAway,
	teamScore: '144',
	opponentScore: '106',
	opponentAbbreviation: opponent,
	date: `2026-10-0${index + 1}T20:00:00Z`,
});

const injury = (index: number, status: InjuryEntry['status']): InjuryEntry => ({
	id: `injury-${index}`,
	name: `${longPlayer} ${index}`,
	position: 'DL',
	status,
	detail: longDetail,
});

const crowdedMatchup: Matchup = {
	form: {
		away: ['STONEHILL', 'STONEHILL', 'LIU', 'BMG', 'CCSU'].map((opponent, index) => form(opponent, index % 2 === 0, index)),
		home: ['STONEHILL', 'STONEHILL', 'LIU', 'BMG', 'CCSU'].map((opponent, index) => form(opponent, index % 2 === 1, index)),
	},
	stats: [
		{ labelKey: 'detail.statPoints', away: '144.5', home: '106.5', awayRank: 32, homeRank: 100, better: 'away', awayShare: 0.57 },
		{ labelKey: 'detail.statYardsAllowed', away: '1,234.5', home: '1,234.5', better: null, awayShare: 0.5 },
		{ labelKey: 'detail.statGoals', away: '-3.2', home: '0.0', better: null, awayShare: null },
		{ labelKey: 'detail.statPointsAllowed', away: '0.0', home: '100.0', better: 'away', awayShare: 1 },
		{ labelKey: 'detail.statShots', away: '0', home: '0', better: null, awayShare: 0 },
	],
	injuries: {
		away: [injury(1, 'out'), injury(2, 'doubtful'), injury(3, 'questionable'), injury(4, 'dayToDay'), injury(5, 'out')],
		home: [injury(6, 'out')],
	},
	winChance: { away: 99, home: 1 },
};

describe('matchup panel containment', () => {
	for (const { label, game } of worstCaseGames) {
		inEveryLocale(`keeps the ${label} matchup inside the card`, locale => {
			const upcoming: Game = { ...game, status: 'pre', startTime: '2026-10-11T23:30:00Z' };
			mountInPopup(<MatchupPanel game={upcoming} matchup={crowdedMatchup} />, locale);
			cy.get(popupSurface).assertContained();
		});
	}

	it('keeps every injury inside the card once the list is expanded', () => {
		mountInPopup(<MatchupPanel game={worstCaseGames[0].game} matchup={crowdedMatchup} />);
		cy.contains('button', /\d/).click();
		cy.get(popupSurface).assertContained();
	});
});

const standingsGroup = (teams: readonly Omit<Team, 'score'>[]): StandingsGroup => ({
	header: 'Atlantic Coast Conference Championship Division',
	conference: 'American Football Conference',
	columns: [
		{ labelKey: 'standings.wins', description: 'Wins' },
		{ labelKey: 'standings.losses', description: 'Losses' },
		{ labelKey: 'standings.ties', description: 'Ties' },
		{ labelKey: 'standings.winPercent', description: 'Winning percentage' },
	],
	rows: teams.map((team, index) => ({ teamId: team.id, name: team.name, logo: undefined, values: ['144', '106', '10', '.714'], rank: String(index + 1) })),
});

describe('standings containment', () => {
	for (const { label, game } of worstCaseGames) {
		inEveryLocale(`keeps the ${label} rows inside the table`, locale => {
			const group = standingsGroup([game.awayTeam, game.homeTeam, worstTeams.longIsland, worstTeams.stonehill]);
			mountInPopup(<StandingsTable game={game} standings={[group]} />, locale);
			cy.get(popupSurface).assertContained({ scrollers: ['.table-responsive'] });
		});
	}
});

describe('due up containment', () => {
	inEveryLocale('keeps long hitters and their lines inside the panel', locale => {
		const game = makeGame('due-up', {
			league: 'mlb', sportType: 'baseball', topOfInning: false, inningEnded: false,
			dueUp: [1, 2, 3].map(index => ({ name: `${longPlayer} ${index}`, position: 'DH', summary: '2-for-4, 2B, HR, 5 RBI, BB, SB, K, GIDP' })),
		});
		mountInPopup(<DueUpPanel game={game} awayColor='#f75c03' homeColor='#3e9bd1' />, locale);
		cy.get(popupSurface).assertContained();
	});
});

describe('sticky bar containment', () => {
	for (const { label, game } of worstCaseGames) {
		inEveryLocale(`keeps the compact ${label} and a delay notice inside the bar`, locale => {
			const delayed = { ...game, delayed: true, delayDescription: 'Delayed' };
			mountInPopup(<DetailStickyBar game={delayed} status={{ text: delayed.delayDescription }} compact={true} monoLogos={{ home: null, away: null }} onBack={() => {}} />, locale);
			cy.get(popupSurface).assertContained({ bleeds: ['.game-detail-header'] });
		});
	}
});

describe('power score breakdown containment', () => {
	inEveryLocale('keeps every boost, the qualifier and the reason inside the card', locale => {
		mountInPopup(
			<PowerScoreBreakdown
				closeness={50} lateGame={30} momentum={20} leadChanges={15} comeback={15}
				winProbabilityVariance={-4}
				signalsSubtotal={130}
				breakPenalty={25} hasBreaks={true}
				favoriteBonus={15} favoriteTeams={['STONEHILL', 'STONEHILL']}
				currentBoost={20} scoringOpportunityBoost={10} postseasonBoost={15}
				postseasonLabel='Eastern Conference Semifinals Game 7 Presented by Sponsor'
				totalLabel='100 (capped from 187)'
				reason={'Long Island University Long Island University up 106 with 0:00 left in the 4th quarter, three lead changes in the last five minutes'}
				sportType='basketball'
			/>,
			locale,
		);
		cy.get(popupSurface).assertContained();
	});

	it('draws no bar wider than its track for a signal at zero, at its ceiling or past it', () => {
		mountInPopup(
			<PowerScoreBreakdown
				closeness={0} lateGame={500} momentum={-5} leadChanges={15} comeback={15}
				signalsSubtotal={0} breakPenalty={0} hasBreaks={false}
				favoriteBonus={0} currentBoost={0} scoringOpportunityBoost={0} postseasonBoost={0}
				totalLabel='0'
			/>,
		);
		cy.get('.powerscore-signal-progress').each($track => {
			const trackWidth = $track[0]!.getBoundingClientRect().width;
			const bar = $track.find('.progress-bar')[0]!;
			expect(bar.getBoundingClientRect().width, 'bar width').to.be.within(0, trackWidth + 0.5);
		});
	});
});

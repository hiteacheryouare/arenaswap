import GameCard from '../../../entrypoints/popup/components/gameCard';
import GameDetailView from '../../../entrypoints/popup/components/gameDetailView';
import type { Game } from '@arenaswap/core/types';
import en from '../../../locales/en.json';

const scheduled = new Date(Date.now() - (2 * 60 * 60 * 1000)).toISOString();

const baseball: Game = {
	id: 'stl-bos',
	league: 'mlb',
	sportType: 'baseball',
	status: 'post',
	period: 1,
	clockSeconds: 0,
	startTime: scheduled,
	venueName: 'Fenway Park',
	venueLocation: 'Boston, MA',
	homeTeam: { id: 'bos', name: 'Boston Red Sox', abbreviation: 'BOS', score: 0, color: '#0d2b56' },
	awayTeam: { id: 'stl', name: 'St. Louis Cardinals', abbreviation: 'STL', score: 0, color: '#c41e3a' },
};

const postponed: Game = { ...baseball, disruption: 'postponed', postponedReason: 'rain', makeupDate: '2025-04-06' };
const suspended: Game = { ...baseball, id: 'suspended', disruption: 'suspended', delayed: true, period: 7, homeTeam: { ...baseball.homeTeam, score: 3 }, awayTeam: { ...baseball.awayTeam, score: 2 } };
const forfeit: Game = {
	...baseball,
	id: 'forfeit',
	league: 'ncaaw',
	sportType: 'basketball',
	disruption: 'forfeit',
	forfeitWinnerId: 'stmn',
	homeTeam: { id: 'stmn', name: 'St. Thomas Tommies', abbreviation: 'STMN', score: 69, color: '#510c76' },
	awayTeam: { id: 'kc', name: 'Kansas City Roos', abbreviation: 'KC', score: 76, color: '#0055a4' },
};
const doubleheader: Game = { ...baseball, id: 'dh', homeTeam: { ...baseball.homeTeam, score: 5 }, awayTeam: { ...baseball.awayTeam, score: 4 }, doubleheaderGame: 1, isMakeup: true };

const cardProps = {
	excitementResult: undefined,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	gameBoosts: {},
	openTabs: [],
	registry: [],
	onRegistryChange: () => {},
	formatTabLabel: () => 'Tab',
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
	weatherPrefs: { temperatureUnit: 'F' as const },
};

const mountCard = (game: Game) => cy.mount(<GameCard {...cardProps} game={game} />);

describe('games that are over for today without an ordinary result', () => {
	it('a postponed game shows why and when it is made up, with no score', () => {
		mountCard(postponed);
		cy.get('.final-status-label').should('have.text', `${en.gameCard.postponed} · ${en.gameCard.postponedRain}`);
		cy.get('.game-score-value').should('not.exist');
		cy.contains('.game-period', /^Makeup Sun, Apr 6$/).should('be.visible');
	});

	it('a postponed game opens on the poster, not a 0-0 scoreline', () => {
		cy.mount(
			<GameDetailView
				game={postponed}
				excitementResult={undefined}
				scoreHistory={[]}
				powerScoreHistory={[]}
				proTipsEnabled={false}
				gameBoosts={{}}
				bettingPrefs={{ bettingEnabled: false }}
				weatherPrefs={{ temperatureUnit: 'F' }}
				decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false, holidayChristmasEnabled: false, holidayBuntingEnabled: false, holidayFireworksEnabled: false }}
				onSetGameBoost={() => {}}
				onBack={() => {}}
			/>,
		);
		cy.get('.gd-poster-status').should('have.text', 'Postponed · Rain · Makeup Sun, Apr 6');
		cy.get('.game-detail-score-value').should('not.exist');
	});

	it('a suspended game keeps its score and where it stopped, with no loser', () => {
		mountCard(suspended);
		cy.get('.final-status-label').should('have.text', en.gameCard.suspended);
		cy.get('.game-score-value.is-loser').should('not.exist');
		cy.contains('.game-period', 'Inn 7').should('be.visible');
	});

	it('a forfeit names the winner the scoreline would have got wrong', () => {
		mountCard(forfeit);
		cy.get('.final-status-label').should('have.text', en.gameCard.forfeit);
		cy.get('.game-score-value').each(score => expect(score).to.have.class('is-loser'));
		cy.get('.game-shootout-score').should('have.text', 'STMN wins by forfeit');
	});

	it('a doubleheader makeup says which game it is', () => {
		mountCard(doubleheader);
		cy.get('.game-postseason-label').should('have.text', 'Game 1 of 2 · Makeup');
	});
});

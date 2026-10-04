import type { FantasyRosterEntry } from '@arenaswap/core';
import FantasyPlayersPanel from '../../entrypoints/popup/components/fantasyPlayersPanel';
import { emptyBoxScore, type BoxScore, type BoxScoreAthlete, type BoxScoreCategory } from '../../entrypoints/popup/components/boxScoreParse';
import { eaglesCowboys } from '../support/fixtures';

const athlete = (id: string, stats: string[], position: string): BoxScoreAthlete => ({
	id, name: id, position, stats, starter: true, batOrder: 0, didNotPlay: false, didNotPlayReason: '',
});

const category = (name: string, keys: string[], athletes: BoxScoreAthlete[]): BoxScoreCategory => ({ name, keys, labels: keys, descriptions: keys, totals: [], athletes });

const box: BoxScore = {
	...emptyBoxScore,
	home: {
		teamId: '21',
		abbreviation: 'PHI',
		categories: [
			category('passing', ['completions/passingAttempts', 'passingYards', 'passingTouchdowns', 'interceptions'], [athlete('4040715', ['22/31', '278', '3', '1'], 'QB')]),
			category('rushing', ['rushingAttempts', 'rushingYards', 'rushingTouchdowns'], [athlete('4040715', ['9', '61', '1'], 'QB')]),
		],
	},
};

const roster: FantasyRosterEntry[] = [
	{ league: 'nfl', athleteId: '4040715', name: 'Jalen Hurts', teamId: '21', position: 'QB' },
	{ league: 'nfl', athleteId: 'dst:6', name: 'Dallas Cowboys', teamId: '6', position: 'DST' },
	{ league: 'nba', athleteId: '1', name: 'Somebody Else', teamId: '21', position: 'player' },
];

describe('your players on the game screen', () => {
	beforeEach(() => cy.viewport(320, 560));

	it('lists only the rostered players in this game, with their line from the box score', () => {
		cy.mount(<div className='popup-container'><FantasyPlayersPanel game={eaglesCowboys} roster={roster} boxScore={box} /></div>);
		cy.get('.gd-play-heading').should('have.text', 'Your Players');
		cy.get('.fantasy-player-row').should('have.length', 2);
		cy.get('.fantasy-player-row').first().within(() => {
			cy.get('.fantasy-player-name').should('have.text', 'Jalen HurtsQB');
			cy.get('.fantasy-player-line').eq(0).should('have.text', 'Passing: 22/31 C/ATT, 278 YDS, 3 TD, 1 INT');
			cy.get('.fantasy-player-line').eq(1).should('have.text', 'Rushing: 9 CAR, 61 YDS, 1 TD');
		});
		cy.get('.fantasy-player-row').eq(1).should('contain.text', 'Dallas Cowboys').and('contain.text', 'D/ST');
	});

	it('names the player before the box score has him', () => {
		cy.mount(<FantasyPlayersPanel game={eaglesCowboys} roster={roster} boxScore={emptyBoxScore} />);
		cy.get('.fantasy-player-row').first().find('.fantasy-player-line').should('not.exist');
		cy.get('.fantasy-player-row').first().should('contain.text', 'Jalen Hurts');
	});

	it('draws nothing for a game with none of your players', () => {
		cy.mount(<div id='holder'><FantasyPlayersPanel game={eaglesCowboys} roster={[roster[2]!]} boxScore={box} /></div>);
		cy.get('#holder').should('be.empty');
	});

	it('wraps a long line inside the popup rather than past it', () => {
		const long = { ...roster[0]!, name: 'Jalen Alexander Montgomery-Wolfeschlegelsteinhausen' };
		cy.mount(<div className='popup-root'><div className='popup-container'><FantasyPlayersPanel game={eaglesCowboys} roster={[long]} boxScore={box} /></div></div>);
		cy.get('.fantasy-player-row').should(([row]: JQuery<HTMLElement>) => {
			const shot = row.querySelector('.gd-pregame-disc')!.getBoundingClientRect();
			const name = row.querySelector('.fantasy-player-name')!.getBoundingClientRect();
			expect(shot.width, 'the face keeps its size').to.be.closeTo(20, 0.5);
			expect(Math.abs(shot.top - name.top), 'face sits on the name line').to.be.at.most(3);
		});
		cy.get('.popup-container').should(([el]: JQuery<HTMLElement>) => expect(el.scrollWidth).to.be.at.most(el.clientWidth));
	});
});

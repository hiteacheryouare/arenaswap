import PregameStats from '../../entrypoints/popup/components/pregameStats';
import type { Game } from '@arenaswap/core/types';

const leader = (player: string, value: string) => ({ category: 'points', fallbackLabel: 'PTS', player, value });

const game: Game = {
	id: 'g1',
	league: 'mens-college-basketball',
	sportType: 'basketball',
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	awayTeam: { id: 'a', name: 'UConn Huskies', abbreviation: 'UCONN', score: 0, color: '#0E1A3D', leaders: [leader('Alex Karaban', '17.1')] },
	homeTeam: { id: 'h', name: 'UNC Wilmington Seahawks', abbreviation: 'UNCW', score: 0, color: '#006666', leaders: [leader('Trey Bullock', '14.2')] },
};

describe('pre-game leaders row', () => {
	it('leaves room for a five-letter team and keeps both rows\' player cells aligned', () => {
		cy.mount(<div style={{ width: '320px' }}><PregameStats game={game} /></div>);
		cy.document().its('fonts.status').should('eq', 'loaded');
		cy.get('.gd-pregame-leader-row').should('have.length', 2).should(rows => {
			const lefts = Array.from(rows).map(row => {
				const team = row.querySelector('.gd-pregame-leader-team')!.getBoundingClientRect();
				const player = row.querySelector('.gd-pregame-leader-player')!.getBoundingClientRect();
				expect(team.right).to.be.at.most(player.left);
				return player.left;
			});
			expect(Math.abs(lefts[0]! - lefts[1]!)).to.be.lessThan(1);
		});
	});
});

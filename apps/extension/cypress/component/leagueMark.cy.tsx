// Layout-only, against the real stylesheets: the mark has to share a status row that was sized
// for one word and, on a postseason game, a round name beside it.
import type { ComponentType } from 'react';
import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import LeagueMark from '@arenaswap/ui/src/components/leagueMark';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import type { Game, LeagueId } from '@arenaswap/core/types';
import type { GameCardDisplayProps } from '@arenaswap/ui/src/components/gameCardTypes';

const popupWidth = 320;

const game = (status: Game['status'], league: LeagueId, postseasonLabel?: string): Game => ({
	id: `${status}-${league}`,
	status,
	league,
	sportType: 'basketball',
	period: 4,
	clockSeconds: 151,
	startTime: '2026-09-30T23:00:00.000Z',
	homeTeam: { id: 'h', name: 'South Carolina', abbreviation: 'SC', score: 58 },
	awayTeam: { id: 'a', name: 'UConn', abbreviation: 'CONN', score: 61 },
	postseasonLabel,
});

const cards: [string, ComponentType<GameCardDisplayProps>, Game['status']][] = [
	['live', LiveGameCard, 'in'],
	['pre-game', PreGameCard, 'pre'],
	['final', FinalGameCard, 'post'],
];

const mount = (Card: ComponentType<GameCardDisplayProps>, subject: Game, marked = true) => {
	cy.viewport(popupWidth, 400);
	cy.mount(
		<div style={{ width: `${popupWidth}px` }}>
			<Card
				game={subject}
				excitementResult={undefined}
				favoriteTeamIds={new Set()}
				onToggleFavoriteTeam={() => {}}
				onOpenGameDetail={() => {}}
				bettingPrefs={{ bettingEnabled: false }}
				leagueSlot={marked ? <LeagueMark league={subject.league} logos={{}} /> : undefined}
			/>
		</div>,
	);
	cy.document().its('fonts.ready');
};

const middle = (el: Element) => {
	const box = el.getBoundingClientRect();
	return box.top + box.height / 2;
};

describe('league mark on a card', () => {
	cards.forEach(([label, Card, status]) => {
		it(`opens the ${label} status row, level with whatever shares it`, () => {
			mount(Card, game(status, 'olysocw', 'Gold Medal Match'));
			cy.get('.game-card').should($card => {
				expect($card[0]!.getBoundingClientRect().width, 'card width').to.equal(popupWidth);
				const row = $card[0]!.querySelector('.game-card-status-row')!;
				const mark = row.querySelector('.game-card-league')!;
				const round = row.querySelector('.game-postseason-label')!;
				expect(row.firstElementChild!.contains(mark), 'the mark leads the row').to.equal(true);
				expect(mark.textContent).to.equal('OLY WSOC');
				expect(middle(round), 'one line, even with the longest short label and a round name').to.be.closeTo(middle(mark), 1);
				const statusLabel = row.querySelector('.live-status-label, .final-status-label');
				if (statusLabel) expect(middle(statusLabel)).to.be.closeTo(middle(mark), 1);
			});
		});
	});

	// Live and final cards already had a status row, so the mark rides on it for free.
	['live', 'final'].forEach(label => {
		it(`costs the ${label} card no height`, () => {
			const [, Card, status] = cards.find(([name]) => name === label)!;
			let unmarked = 0;
			mount(Card, game(status, 'nba'), false);
			cy.get('.game-card').then($card => { unmarked = $card[0]!.getBoundingClientRect().height; });
			mount(Card, game(status, 'nba'));
			cy.get('.game-card').should($card => {
				expect($card[0]!.getBoundingClientRect().height).to.be.closeTo(unmarked, 0.5);
			});
		});
	});

	it('gives a pre-game card with no round name a status row of its own', () => {
		mount(PreGameCard, game('pre', 'nba'));
		cy.get('.game-card-status-row .game-card-league').should('have.text', 'NBA');
		mount(PreGameCard, game('pre', 'nba'), false);
		cy.get('.game-card-status-row').should('not.exist');
	});
});

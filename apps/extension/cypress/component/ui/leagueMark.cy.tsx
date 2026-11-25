import type { ComponentType } from 'react';
import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import LeagueMark from '@arenaswap/ui/src/components/leagueMark';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import type { Game, LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
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

const mount = (Card: ComponentType<GameCardDisplayProps>, subject: Game, marked = true, logos: LeagueLogoMap = {}) => {
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
				leagueSlot={marked ? <LeagueMark league={subject.league} logos={logos} /> : undefined}
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

	it('shows the logo alone and keeps the short label for screen readers', () => {
		mount(LiveGameCard, game('in', 'nba'));
		cy.get('.game-card-league img').should('be.visible');
		cy.get('.game-card-league > span:not(.crest)').should('have.class', 'visually-hidden').and('have.text', 'NBA');
		cy.get('.game-card-league .crest').should('have.attr', 'title', 'NBA');
		cy.get('.live-status-label').should('be.visible').and('contain.text', 'LIVE');
	});

	it('keeps the short label beside a logo other leagues share', () => {
		mount(LiveGameCard, game('in', 'ncaaw'));
		cy.get('.game-card-league > span:not(.crest)').should('not.have.class', 'visually-hidden').and('have.text', 'NCAAW');
		mount(LiveGameCard, game('in', 'olybkw'));
		cy.get('.game-card-league > span:not(.crest)').should('not.have.class', 'visually-hidden').and('have.text', 'OLY WBB');
	});

	it('writes the short label out when the logo will not load', () => {
		mount(LiveGameCard, game('in', 'nba'), true, { nba: 'data:image/png;base64,AAAA' });
		cy.get('.game-card-league .crest').should('have.attr', 'data-crest-state', 'failed');
		cy.get('.game-card-league > span:not(.crest)').should('not.have.class', 'visually-hidden').and('be.visible');
	});

	it('writes the label in the ink of the side it sits on', () => {
		mount(LiveGameCard, { ...game('in', 'nba'), awayTeam: { ...game('in', 'nba').awayTeam, color: '#FDB71A' }, homeTeam: { ...game('in', 'nba').homeTeam, color: '#0C2340' } });
		cy.get('.live-status-label').then(([live]: JQuery<HTMLElement>) => {
			cy.get('.game-card-league').should('have.css', 'color', getComputedStyle(live).color);
		});
	});

	it('draws the light-ground logo on a white tile, whatever colour the card is', () => {
		const logos: LeagueLogoMap = { nba: 'https://a.espncdn.com/i/teamlogos/leagues/500-dark/nba.png' };
		const lightGround = 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png';
		const live = game('in', 'nba');
		const subjects: [ComponentType<GameCardDisplayProps>, Game][] = [
			[LiveGameCard, live],
			[LiveGameCard, { ...live, awayTeam: { ...live.awayTeam, color: '#FDB71A' }, homeTeam: { ...live.homeTeam, color: '#0C2340' } }],
			[FinalGameCard, game('post', 'nba')],
		];
		subjects.forEach(([Card, subject]) => {
			mount(Card, subject, true, logos);
			cy.get('.game-card-league img').should('have.attr', 'src', lightGround);
			cy.get('.game-card-league .crest').should('have.attr', 'data-crest-state', 'loaded').and('have.css', 'background-color', 'rgb(255, 255, 255)');
		});
	});
});

import GoalScorers from '../../../entrypoints/popup/components/goalScorers';
import type { Game, GoalEvent } from '@arenaswap/core/types';
import { makeGame } from '../../support/fixtures';
import { inEveryLocale } from '../../support/safetyNet/locales';
import { mountInPopup, popupSurface } from '../../support/safetyNet/mountInPopup';

// Everton 3-1 Coventry City, 2026-11-06. Soccer heroes put the home side on the left.
const everton: Game = makeGame('401879242', {
	league: 'epl',
	sportType: 'soccer',
	status: 'post',
	homeTeam: { id: '368', name: 'Everton', abbreviation: 'EVE', score: 3 },
	awayTeam: { id: '388', name: 'Coventry City', abbreviation: 'COV', score: 1 },
	goalEvents: [
		{ teamId: '388', minute: 51.5, player: 'Gboho' },
		{ teamId: '368', minute: 55.6, player: 'Barry' },
		{ teamId: '368', minute: 60.4, player: 'Barry' },
		{ teamId: '368', minute: 80.2, player: 'Dewsbury-Hall' },
	],
});

const hero = (game: Game) => (
	<div className='gd-poster gd-hero gd-hero-live' style={{ background: '#0606FA', '--matchup-ink-left': '#ffffff', '--matchup-ink-right': '#111827' } as React.CSSProperties}>
		<GoalScorers game={game} />
	</div>
);

describe('goal scorers', () => {
	it('lists each side\'s scorers under that side', () => {
		mountInPopup(hero(everton));
		cy.get('.gd-scorers-side.is-left li').then($items => {
			expect([...$items].map(item => item.textContent)).to.deep.equal(['Barry 56\', 61\'', 'Dewsbury-Hall 81\'']);
		});
		cy.get('.gd-scorers-side.is-right').should('have.text', 'Gboho 52\'');
		cy.get('.gd-scorers-side.is-left').should('have.attr', 'aria-label', 'Everton goals');
	});

	it('folds a long list into the last line', () => {
		const goals: GoalEvent[] = ['Mbappé', 'Vinícius', 'Bellingham', 'Rodrygo', 'Valverde'].map((player, index) => ({ teamId: '368', minute: 10 + index * 15, player }));
		mountInPopup(hero({ ...everton, goalEvents: goals }));
		cy.get('.gd-scorers-side.is-left li').should('have.length', 4).last().should('have.text', '+2 more');
	});

	it('draws nothing in a goalless game', () => {
		mountInPopup(hero({ ...everton, goalEvents: undefined }));
		cy.get('.gd-scorers').should('not.exist');
	});

	inEveryLocale('keeps the longest scorer lines inside the hero', locale => {
		const longest: GoalEvent[] = [
			{ teamId: '368', minute: 4, player: 'Alexander-Arnold-Fernández', ownGoal: true },
			{ teamId: '368', minute: 45, addedMinutes: 12, player: 'Dewsbury-Hall', penalty: true },
			{ teamId: '388', minute: 90, addedMinutes: 9, player: 'Thomas-Asante-Calvert-Lewin', penalty: true },
		];
		mountInPopup(hero({ ...everton, goalEvents: longest }), locale);
		cy.get(popupSurface).assertContained();
	});
});

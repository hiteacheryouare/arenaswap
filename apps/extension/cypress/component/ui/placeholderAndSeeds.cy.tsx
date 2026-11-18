import PreGameCard from '@arenaswap/ui/src/components/preGameCard';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { ReactNode } from 'react';
import type { Game } from '@arenaswap/core/types';

const startTime = '2026-11-21T00:00:00.000Z';

const bracketGame: Game = {
	id: 'tbd-1',
	status: 'pre',
	league: 'ncaab',
	sportType: 'basketball',
	period: 0,
	clockSeconds: 0,
	startTime,
	homeTeam: { id: '-1', name: 'TBD', abbreviation: 'TBD', score: 0 },
	awayTeam: { id: '-2', name: 'TBD', abbreviation: 'TBD', score: 0 },
};

const firstRound: Game = {
	id: 'seeded-1',
	status: 'in',
	league: 'ncaab',
	sportType: 'basketball',
	period: 2,
	clockSeconds: 300,
	collegeSeeded: true,
	homeTeam: { id: '150', name: 'Duke Blue Devils', abbreviation: 'DUKE', score: 61, rank: 1, color: '#00539B' },
	awayTeam: { id: '2561', name: 'Siena Saints', abbreviation: 'SIE', score: 55, rank: 16, color: '#006B54' },
};

const cardProps = {
	excitementResult: undefined,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
};

const frame = (children: ReactNode) => {
	cy.viewport(320, 400);
	cy.mount(<div style={{ width: '320px' }}>{children}</div>);
};

describe('a bracket game whose teams are not set yet', () => {
	it('names both sides TBD on blank crests, with no star to favorite them by', () => {
		const onToggleFavoriteTeam = cy.spy().as('favorite');
		frame(<PreGameCard {...cardProps} onToggleFavoriteTeam={onToggleFavoriteTeam} game={bracketGame} />);
		cy.get('.team-abbreviation').each(label => expect(label).to.have.text('TBD'));
		cy.get('.team-crest').each(crest => expect(crest.text().trim()).to.equal(''));
		cy.get('[data-team-star="true"]').each(star => expect(star).to.have.class('invisible'));
		cy.get('@favorite').should('not.have.been.called');
	});

	it('keeps both crests level, because the hidden star still holds its place', () => {
		frame(<PreGameCard {...cardProps} game={{ ...bracketGame, awayTeam: { id: '2561', name: 'Siena Saints', abbreviation: 'SIE', score: 0, color: '#006B54' } }} />);
		cy.get('.team-crest').then(crests => {
			const [first, second] = [...crests].map(crest => crest.getBoundingClientRect().top);
			expect(first).to.equal(second);
		});
	});
});

describe('a seeded tournament game', () => {
	it('shows the seed as a bare number', () => {
		frame(<LiveGameCard {...cardProps} game={firstRound} />);
		cy.contains('.team-rank', /^1$/).should('have.attr', 'title', 'No. 1 seed');
		cy.contains('.team-rank', /^16$/).should('have.attr', 'title', 'No. 16 seed');
	});

	it('keeps the # on an AP ranking outside the bracket', () => {
		frame(<LiveGameCard {...cardProps} game={{ ...firstRound, collegeSeeded: undefined }} />);
		cy.contains('.team-rank', /^#16$/).should('have.attr', 'title', 'Ranked #16');
	});
});

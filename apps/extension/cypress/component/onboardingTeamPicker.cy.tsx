import { useState } from 'react';
import type { EspnTeamEntry } from '@arenaswap/core';
import OnboardingTeamPicker from '../../entrypoints/popup/components/onboardingTeamPicker';

const teams: EspnTeamEntry[] = [
	{ leagueId: 'nba', id: '20', name: 'Philadelphia 76ers', abbreviation: 'PHI' },
	{ leagueId: 'nba', id: '4', name: 'Chicago Bulls', abbreviation: 'CHI' },
	{ leagueId: 'nfl', id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHL' },
];

const defaultProps = {
	teams,
	isLoading: false,
	hasError: false,
	selectedFavorites: new Set<string>(),
	onToggleFavorite: () => {},
	onBack: () => {},
	onRetry: () => {},
	onSkip: () => {},
	onDone: () => {},
};

// Favorites live in onboardingView, so this stands in for that owner.
const StatefulPicker = () => {
	const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());

	return (
		<OnboardingTeamPicker
			{...defaultProps}
			selectedFavorites={selectedFavorites}
			onToggleFavorite={key => setSelectedFavorites(previous => {
				const next = new Set(previous);
				if (next.has(key)) next.delete(key);
				else next.add(key);
				return next;
			})}
		/>
	);
};

describe('onboardingTeamPicker', () => {
	it('renders the teams grouped by league', () => {
		cy.mount(<OnboardingTeamPicker {...defaultProps} />);

		cy.contains('Pick your teams').should('exist');
		cy.contains('Step 3 of 3').should('exist');
		cy.get('.ob-progress i.is-done').should('have.length', 3);
		cy.get('.ob-sport h3').should('have.length', 2);
		cy.get('.ob-sport h3').first().should('have.text', 'NBA');
		cy.get('.ob-sport').first().find('.ob-team').should('have.length', 2);
		cy.contains('Philadelphia 76ers').should('exist');
		cy.contains('Philadelphia Eagles').should('exist');
	});

	it('reports the league-scoped key of the team that was starred', () => {
		cy.mount(<OnboardingTeamPicker {...defaultProps} onToggleFavorite={cy.spy().as('onToggleFavorite')} />);

		cy.get('[aria-label="Add Philadelphia 76ers to favorites"]').click();

		cy.get('@onToggleFavorite').should('have.been.calledOnceWith', 'nba:20');
	});

	it('marks the tile and counts it as a favorite round-trips', () => {
		cy.mount(<StatefulPicker />);

		cy.get('.ob-foot').should('contain.text', '0 teams');
		cy.get('[aria-label="Add Philadelphia 76ers to favorites"]').should('have.attr', 'aria-pressed', 'false').click();
		cy.get('[aria-label="Remove Philadelphia 76ers from favorites"]')
			.should('have.attr', 'aria-pressed', 'true')
			.and('have.class', 'is-on');
		cy.get('.ob-foot').should('contain.text', '1 team');

		cy.get('[aria-label="Remove Philadelphia 76ers from favorites"]').click();
		cy.get('[aria-label="Add Philadelphia 76ers to favorites"]')
			.should('have.attr', 'aria-pressed', 'false')
			.and('not.have.class', 'is-on');
		cy.get('.ob-foot').should('contain.text', '0 teams');
	});

	it('filters on the search box and says so when nothing matches', () => {
		cy.mount(<OnboardingTeamPicker {...defaultProps} />);

		cy.get('input[type=search]').type('eagles');
		cy.contains('Philadelphia Eagles').should('exist');
		cy.contains('Chicago Bulls').should('not.exist');
		cy.get('.ob-sport h3').should('have.length', 1).and('have.text', 'NFL');

		cy.get('input[type=search]').clear().type('nothing here');
		cy.contains('No teams match "nothing here"').should('exist');
	});

	it('shows a spinner while the teams are loading', () => {
		cy.mount(<OnboardingTeamPicker {...defaultProps} teams={[]} isLoading />);

		cy.get('.spinner-border').should('exist');
		cy.contains('Loading teams').should('exist');
	});

	it('offers a retry and a skip when the fetch failed', () => {
		cy.mount(
			<OnboardingTeamPicker
				{...defaultProps}
				teams={[]}
				hasError
				onRetry={cy.spy().as('onRetry')}
				onSkip={cy.spy().as('onSkip')}
			/>
		);

		cy.contains("Couldn't load teams.").should('exist');
		cy.contains('button', 'Retry').click();
		cy.get('@onRetry').should('have.been.calledOnce');

		cy.contains('button', 'Skip for now').click();
		cy.get('@onSkip').should('have.been.calledOnce');
	});

	it('finishes, skips and steps back from its own buttons', () => {
		cy.mount(
			<OnboardingTeamPicker
				{...defaultProps}
				onDone={cy.spy().as('onDone')}
				onSkip={cy.spy().as('onSkip')}
				onBack={cy.spy().as('onBack')}
			/>
		);

		cy.contains('button', 'Done').click();
		cy.get('@onDone').should('have.been.calledOnce');

		cy.get('.ob-stepline').contains('button', 'Skip').click();
		cy.get('@onSkip').should('have.been.calledOnce');

		cy.contains('button', 'Back').click();
		cy.get('@onBack').should('have.been.calledOnce');
	});
});

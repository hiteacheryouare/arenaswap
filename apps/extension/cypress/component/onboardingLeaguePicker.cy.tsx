import { useState } from 'react';
import type { LeagueId } from '@arenaswap/core/types';
import OnboardingLeaguePicker from '../../entrypoints/popup/components/onboardingLeaguePicker';
import { leaguesBySportType } from '../../entrypoints/popup/popupHelpers';

const defaultProps = {
	selectedLeagues: new Set<LeagueId>(['nba', 'nfl']),
	leagueLogos: {},
	onToggleLeague: () => {},
	onToggleSport: () => {},
	onBack: () => {},
	onNext: () => {},
};

// The picker holds no state of its own — onboardingView owns the selection — so this mirrors that
// ownership, which is what lets a click be followed through to the checkbox it should move.
const StatefulPicker = ({ initial }: { initial: LeagueId[] }) => {
	const [selectedLeagues, setSelectedLeagues] = useState<Set<LeagueId>>(() => new Set(initial));

	return (
		<OnboardingLeaguePicker
			{...defaultProps}
			selectedLeagues={selectedLeagues}
			onToggleLeague={leagueId => setSelectedLeagues(previous => {
				const next = new Set(previous);
				if (next.has(leagueId)) next.delete(leagueId);
				else next.add(leagueId);
				return next;
			})}
			onToggleSport={(sportType, selectAll) => setSelectedLeagues(previous => {
				const next = new Set(previous);
				for (const league of leaguesBySportType[sportType]) {
					if (selectAll) next.add(league.id);
					else next.delete(league.id);
				}
				return next;
			})}
		/>
	);
};

const tile = (leagueId: string) => cy.get(`label[for="onb-league-${leagueId}"]`);

describe('onboardingLeaguePicker', () => {
	it('renders every sport group with the pre-selected leagues checked', () => {
		cy.mount(<OnboardingLeaguePicker {...defaultProps} />);

		cy.contains('Which sports do you watch?').should('exist');
		cy.contains('Step 2 of 3').should('exist');
		cy.get('.ob-progress i.is-done').should('have.length', 2);
		cy.get('.ob-sport').should('have.length', 6);
		cy.get('#onb-league-nba').should('be.checked');
		cy.get('#onb-league-nfl').should('be.checked');
		cy.get('#onb-league-nhl').should('not.be.checked');
		tile('nba').should('have.class', 'is-on');
		tile('nhl').should('not.have.class', 'is-on');
	});

	it('names a tile without the sport its heading already gives, and keeps the full name for assistive tech', () => {
		cy.mount(<OnboardingLeaguePicker {...defaultProps} />);

		tile('olymih').find('.ob-tile-name').should('have.text', "Olympic Men's");
		cy.get('#onb-league-olymih').should('have.attr', 'aria-label', "Olympic Men's Ice Hockey");
		tile('ncaab').find('.ob-tile-name').should('have.text', 'NCAA');
		tile('wbbc').find('.ob-tile-name').should('have.text', 'World Baseball Classic');
	});

	it('reports the league that was clicked', () => {
		cy.mount(<OnboardingLeaguePicker {...defaultProps} onToggleLeague={cy.spy().as('onToggleLeague')} />);

		tile('nhl').click();

		cy.get('@onToggleLeague').should('have.been.calledOnceWith', 'nhl');
	});

	it('checks and unchecks a league as the selection round-trips', () => {
		cy.mount(<StatefulPicker initial={['nba']} />);

		tile('nhl').click();
		cy.get('#onb-league-nhl').should('be.checked');
		tile('nhl').should('have.class', 'is-on');
		cy.get('.ob-foot').should('contain.text', '2 leagues');

		tile('nhl').click();
		cy.get('#onb-league-nhl').should('not.be.checked');
		cy.get('#onb-league-nba').should('be.checked');
		cy.get('.ob-foot').should('contain.text', '1 league');
	});

	it('selects and clears a whole sport from its All checkbox', () => {
		cy.mount(<StatefulPicker initial={[]} />);

		cy.get('#sport-all-hockey').click();
		for (const league of leaguesBySportType.hockey) {
			cy.get(`#onb-league-${league.id}`).should('be.checked');
		}
		cy.get('#sport-all-hockey').should('be.checked');

		cy.get('#sport-all-hockey').click();
		for (const league of leaguesBySportType.hockey) {
			cy.get(`#onb-league-${league.id}`).should('not.be.checked');
		}
	});

	it('keeps Next disabled until something is selected', () => {
		cy.mount(<OnboardingLeaguePicker {...defaultProps} selectedLeagues={new Set<LeagueId>()} />);

		cy.contains('button', 'Next').should('be.disabled');
		cy.get('.ob-foot').should('contain.text', '0 leagues');
	});

	it('advances and goes back from its own buttons', () => {
		cy.mount(
			<OnboardingLeaguePicker
				{...defaultProps}
				onNext={cy.spy().as('onNext')}
				onBack={cy.spy().as('onBack')}
			/>
		);

		cy.contains('button', 'Next').click();
		cy.get('@onNext').should('have.been.calledOnce');

		cy.contains('button', 'Back').click();
		cy.get('@onBack').should('have.been.calledOnce');
	});
});

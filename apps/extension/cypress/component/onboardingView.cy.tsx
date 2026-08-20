import OnboardingView from '../../entrypoints/popup/components/onboardingView';

const teamsByLeague: Record<string, [string, string][]> = {
	nba: [['20', 'Philadelphia 76ers'], ['4', 'Chicago Bulls']],
	nfl: [['21', 'Philadelphia Eagles']],
	nhl: [['15', 'Philadelphia Flyers']],
	mlb: [['22', 'Philadelphia Phillies']],
};

// ESPN's /teams envelope, trimmed to the fields fetchTeamsForLeagues reads.
const teamsPayload = (entries: [string, string][]) => ({
	sports: [{
		leagues: [{
			teams: entries.map(([id, displayName]) => ({
				team: { id, displayName, abbreviation: displayName.slice(0, 3).toUpperCase() },
			})),
		}],
	}],
});

// This view calls the real fetchTeamsForLeagues, and a package entry point has no seam for the
// component-stub plugin in cypress.config.ts, so the stub goes on the window instead. Each league
// answers with its own teams, which is what keeps the favorite buttons individually addressable.
const stubTeamsFetch = () => {
	cy.window().then(win => {
		cy.stub(win, 'fetch').callsFake((input: unknown) => {
			const url = String(input);
			const leagueId = Object.keys(teamsByLeague).find(id => url.includes(`/${id}/`)) ?? 'nba';
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(teamsPayload(teamsByLeague[leagueId])),
			} as unknown as Response);
		}).as('teamsFetch');
	});
};

const defaultProps = {
	leagueLogos: {},
	onComplete: () => {},
	onStartWalkthrough: () => {},
};

const goToLeaguePicker = () => cy.contains('button', 'Got it').click();

const goToTeamPicker = () => {
	stubTeamsFetch();
	cy.contains('button', 'Next').click();
	// Proves the teams came from the stub rather than a live ESPN call.
	cy.get('@teamsFetch').should('have.been.called');
	cy.contains('Pick your teams').should('exist');
};

describe('onboardingView', () => {
	it('opens on the tab-control step', () => {
		cy.mount(<OnboardingView {...defaultProps} />);

		cy.contains('Welcome to ArenaSwap').should('exist');
		cy.contains('Step 1 of 3').should('exist');
		cy.contains('Which sports do you watch?').should('not.exist');
	});

	it('advances to the league picker with the default leagues pre-selected', () => {
		cy.mount(<OnboardingView {...defaultProps} />);

		goToLeaguePicker();

		cy.contains('Which sports do you watch?').should('exist');
		for (const leagueId of ['nba', 'nfl', 'nhl', 'mlb']) {
			cy.get(`#onb-league-${leagueId}`).should('be.checked');
		}
		cy.get('#onb-league-wnba').should('not.be.checked');
	});

	it('keeps a league toggle when stepping forward and back', () => {
		cy.mount(<OnboardingView {...defaultProps} />);

		goToLeaguePicker();
		cy.get('#onb-league-nba').click().should('not.be.checked');
		cy.get('#onb-league-wnba').click().should('be.checked');

		goToTeamPicker();
		cy.contains('button', 'Back').click();

		cy.get('#onb-league-nba').should('not.be.checked');
		cy.get('#onb-league-wnba').should('be.checked');
	});

	it('loads the teams for the selected leagues only', () => {
		cy.mount(<OnboardingView {...defaultProps} />);

		goToLeaguePicker();
		cy.get('#onb-league-mlb').click().should('not.be.checked');
		goToTeamPicker();

		cy.contains('Philadelphia 76ers').should('exist');
		cy.contains('Philadelphia Eagles').should('exist');
		cy.contains('Philadelphia Phillies').should('not.exist');
	});

	it('hands the picked leagues and favorites to onComplete', () => {
		cy.mount(<OnboardingView {...defaultProps} onComplete={cy.spy().as('onComplete')} />);

		goToLeaguePicker();
		cy.get('#onb-league-mlb').click().should('not.be.checked');
		goToTeamPicker();

		cy.get('[aria-label="Add Philadelphia 76ers to favorites"]').click();
		cy.contains('button', 'Done').click();

		cy.contains("You're all set!").should('exist');
		cy.contains('button', 'Jump right in').click();

		cy.get('@onComplete').should('have.been.calledOnceWith', ['nba', 'nfl', 'nhl'], ['nba:20']);
	});

	it('drops the favorites that were starred before Skip', () => {
		cy.mount(<OnboardingView {...defaultProps} onComplete={cy.spy().as('onComplete')} />);

		goToLeaguePicker();
		goToTeamPicker();

		cy.get('[aria-label="Add Philadelphia 76ers to favorites"]').click();
		cy.contains('button', 'Skip').click();

		cy.contains("You're all set!").should('exist');
		cy.contains('button', 'Jump right in').click();

		cy.get('@onComplete').should('have.been.calledOnceWith', ['nba', 'nfl', 'nhl', 'mlb'], []);
	});

	it('hands the same selection to the walkthrough', () => {
		cy.mount(<OnboardingView {...defaultProps} onStartWalkthrough={cy.spy().as('onStartWalkthrough')} />);

		goToLeaguePicker();
		goToTeamPicker();
		cy.contains('button', 'Done').click();
		cy.contains('button', 'Take the tour').click();

		cy.get('@onStartWalkthrough').should('have.been.calledOnceWith', ['nba', 'nfl', 'nhl', 'mlb'], []);
	});
});

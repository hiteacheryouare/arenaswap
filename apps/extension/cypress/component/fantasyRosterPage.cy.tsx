import { useState } from 'react';
import type { EspnTeamEntry, FantasyRosterEntry, PlayerSearchResult } from '@arenaswap/core';
import FantasyRosterPage, { searchDebounceMs, type fantasyRosterServices } from '../../entrypoints/popup/components/fantasyRosterPage';
import en from '../../locales/en.json';

const jokic: PlayerSearchResult = {
	league: 'nba',
	athleteId: '3112335',
	name: 'Nikola Jokic',
	teamName: 'Denver Nuggets',
	headshot: 'https://a.espncdn.com/i/headshots/nba/players/full/3112335.png',
};

const longName: PlayerSearchResult = {
	league: 'mlb',
	athleteId: '42',
	name: 'Christopher Alexander Montgomery-Wolfeschlegelsteinhausen',
	teamName: 'Los Angeles Angels of Anaheim',
};

const chiefs: EspnTeamEntry = { leagueId: 'nfl', id: '12', name: 'Kansas City Chiefs', abbreviation: 'KC' };

const resolved = (result: PlayerSearchResult): FantasyRosterEntry => ({
	league: result.league,
	athleteId: result.athleteId,
	name: result.name,
	teamId: '7',
	position: 'player',
});

// Only the services a test does not supply get a default stub, so an alias always names the one in use.
const services = (overrides: Partial<fantasyRosterServices> = {}): fantasyRosterServices => ({
	searchPlayers: overrides.searchPlayers ?? cy.stub().as('searchPlayers').resolves([jokic, longName]),
	resolveRosterEntry: overrides.resolveRosterEntry
		?? cy.stub().as('resolveRosterEntry').callsFake((result: PlayerSearchResult) => Promise.resolve(resolved(result))),
	fetchTeams: overrides.fetchTeams ?? cy.stub().as('fetchTeams').resolves([chiefs, { leagueId: 'nba', id: '7', name: 'Denver Nuggets', abbreviation: 'DEN' }]),
});

const lastSaved = (alias: `@${string}`) => cy.get<sinon.SinonSpy>(alias).should('have.been.called').then(spy => spy.lastCall.args[0] as FantasyRosterEntry[]);

interface harnessProps {
	initial?: FantasyRosterEntry[];
	stubs: fantasyRosterServices;
	onSaved?: (roster: FantasyRosterEntry[]) => void;
}

// The setup page holds the roster and saves it; this stands in for both.
const Harness = ({ initial = [], stubs, onSaved }: harnessProps) => {
	const [roster, setRoster] = useState(initial);
	return (
		<div className='popup-root'>
			<div className='popup-container d-flex flex-column'>
				<FantasyRosterPage
					roster={roster}
					services={stubs}
					onRosterChange={update => setRoster(current => {
						const next = update(current);
						onSaved?.(next);
						return next;
					})}
				/>
			</div>
		</div>
	);
};

const middle = (rect: DOMRect) => rect.top + rect.height / 2;

const search = (text: string) => cy.get('#fantasyPlayerSearch').clear().type(text, { delay: 0 });

const expectNoSideways = () => cy.get('.popup-container').should(([el]: JQuery<HTMLElement>) => {
	expect(el.scrollWidth, 'nothing pokes out sideways').to.be.at.most(el.clientWidth);
});

describe('fantasy roster page', () => {
	beforeEach(() => cy.viewport(320, 560));

	it('starts empty, with the count and the limit', () => {
		cy.mount(<Harness stubs={services()} />);
		cy.get('#fantasyRosterCount').should('have.text', '0 of 50');
		cy.contains(en.fantasy.rosterEmpty).should('exist');
	});

	it('waits for the typing to stop before it searches', () => {
		const stubs = services();
		cy.clock();
		cy.mount(<Harness stubs={stubs} />);
		search('jokic');
		cy.tick(searchDebounceMs - 50);
		cy.get('@searchPlayers').should('not.have.been.called');
		// One of the game list's own loading lines.
		const loadingLines = Object.entries(en.loading).filter(([key]) => /^m\d+$/.test(key)).map(([, line]) => line as string);
		cy.get('[role="status"]').invoke('text').should(text => expect(loadingLines).to.include(text.trim()));
		cy.tick(60);
		cy.get('@searchPlayers').should('have.been.calledOnce').its('firstCall.args.0').should('eq', 'jokic');
	});

	// The line sits in a live region, so it holds still while the name is typed out.
	it('keeps one loading line for the whole search', () => {
		cy.clock();
		cy.mount(<Harness stubs={services()} />);
		search('jo');
		cy.get('[role="status"]').invoke('text').then(first => {
			['k', 'i', 'c'].forEach(letter => {
				cy.get('#fantasyPlayerSearch').type(letter, { delay: 0 });
				cy.get('[role="status"]').should('have.text', first);
			});
		});
	});

	it('does not search on a single letter', () => {
		cy.mount(<Harness stubs={services()} />);
		search('j');
		cy.wait(searchDebounceMs + 50);
		cy.get('@searchPlayers').should('not.have.been.called');
		cy.get('#fantasyRosterCount').should('exist');
	});

	it('lists each result with a face, a team and a league', () => {
		cy.mount(<Harness stubs={services()} />);
		search('jokic');
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').within(() => {
			cy.contains('Denver Nuggets, NBA').should('exist');
			cy.get('img').should('have.attr', 'src', jokic.headshot);
			cy.get('.bi-plus-lg').should('exist');
		});
		// No headshot, so the disc carries initials.
		cy.contains('.fantasy-pick-row', longName.name).find('.crest-fallback').should('contain.text', 'CA');
	});

	it('shows the add as pending until the player is looked up, then files him under his league', () => {
		let finish: ((entry: FantasyRosterEntry) => void) | undefined;
		const stubs = services({
			resolveRosterEntry: cy.stub().as('resolveRosterEntry').returns(new Promise<FantasyRosterEntry>(resolve => { finish = resolve; })),
		});
		const saved = cy.spy().as('saved');
		cy.mount(<Harness stubs={stubs} onSaved={saved} />);
		search('jokic');
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').click();
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').should('be.disabled').and('have.attr', 'aria-busy', 'true');
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').find('.spinner-border').should('exist');
		cy.get('@saved').should('not.have.been.called').then(() => finish?.(resolved(jokic)));
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').find('.bi-check2').should('exist');
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').should('not.have.attr', 'aria-busy');
		cy.get('@saved').should('have.been.calledOnce');

		cy.get('#fantasyPlayerSearch').clear();
		cy.get('#fantasyRosterCount').should('have.text', '1 of 50');
		cy.contains('.popup-section-label', 'NBA').should('exist');
		cy.contains('.fantasy-roster-row', 'Nikola Jokic').should('contain.text', 'Denver Nuggets');
	});

	it('says so when a player could not be added, and lets you try again', () => {
		const stubs = services({ resolveRosterEntry: cy.stub().as('resolveRosterEntry').rejects(new Error('no team')) });
		cy.mount(<Harness stubs={stubs} />);
		search('jokic');
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').click();
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').should('contain.text', en.fantasy.addFailed).and('not.be.disabled');
	});

	it('takes a player back off from the results', () => {
		const saved = cy.spy().as('saved');
		cy.mount(<Harness stubs={services()} initial={[resolved(jokic)]} onSaved={saved} />);
		search('jokic');
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').should('have.attr', 'aria-label', 'Remove Nikola Jokic from your roster').click();
		cy.get('@saved').should('have.been.calledWith', []);
	});

	it('finds an NFL team\'s defense by the team\'s name', () => {
		const saved = cy.spy().as('saved');
		cy.mount(<Harness stubs={services({ searchPlayers: cy.stub().as('searchPlayers').resolves([]) })} onSaved={saved} />);
		search('chiefs');
		cy.contains('.popup-section-label', en.fantasy.defensesHeading).should('exist');
		cy.contains('.fantasy-pick-row', 'Kansas City Chiefs').should('contain.text', 'D/ST, NFL').click();
		lastSaved('@saved').should('deep.equal', [{ league: 'nfl', athleteId: 'dst:12', name: 'Kansas City Chiefs', position: 'DST', teamId: '12' }]);
		cy.get('#fantasyPlayerSearch').clear();
		cy.contains('.fantasy-roster-row', 'Kansas City Chiefs').should('contain.text', 'D/ST');
	});

	it('says when nobody matches', () => {
		cy.mount(<Harness stubs={services({ searchPlayers: cy.stub().as('searchPlayers').resolves([]) })} />);
		search('zzzz');
		cy.contains('Nobody matches "zzzz"').should('exist');
	});

	it('says when the search failed, and searches again on retry', () => {
		const searchPlayers = cy.stub().as('searchPlayers');
		searchPlayers.onFirstCall().rejects(new Error('HTTP 503'));
		searchPlayers.onSecondCall().resolves([jokic]);
		cy.mount(<Harness stubs={services({ searchPlayers })} />);
		search('jokic');
		cy.contains(en.fantasy.searchError).should('exist');
		cy.contains('button', en.teamPicker.retry).click();
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').should('exist');
		cy.get('@searchPlayers').should('have.been.calledTwice');
	});

	it('stops adding at fifty and says why', () => {
		const full = Array.from({ length: 50 }, (_, index) => ({ ...resolved(jokic), athleteId: `x${index}` }));
		cy.mount(<Harness stubs={services()} initial={full} />);
		cy.get('#fantasyRosterCount').should('have.text', '50 of 50');
		search('jokic');
		cy.contains(en.fantasy.rosterFull).should('exist');
		cy.contains('.fantasy-pick-row', 'Nikola Jokic').should('be.disabled');
	});

	it('drops a player from the roster list', () => {
		const saved = cy.spy().as('saved');
		cy.mount(<Harness stubs={services()} initial={[resolved(jokic), { ...resolved(longName), league: 'mlb', position: 'P' }]} onSaved={saved} />);
		cy.contains('.fantasy-roster-row', longName.name).should('contain.text', 'Pitcher');
		cy.get(`[aria-label="Remove ${longName.name} from your roster"]`).click();
		lastSaved('@saved').should('deep.equal', [resolved(jokic)]);
		cy.get('#fantasyRosterCount').should('have.text', '1 of 50');
	});

	it('keeps a long name to its row, with the face and the button centred on it', () => {
		cy.mount(<Harness stubs={services()} initial={[{ ...resolved(longName), position: 'P' }]} />);
		cy.get('.fantasy-roster-row').should(([row]: JQuery<HTMLElement>) => {
			const box = row.getBoundingClientRect();
			const shot = row.querySelector('.fantasy-player-shot')!.getBoundingClientRect();
			const remove = row.querySelector('.fantasy-roster-remove')!.getBoundingClientRect();
			const name = row.querySelector('.fw-semibold')!.getBoundingClientRect();
			expect(Math.abs(middle(shot) - middle(box)), 'face centred on the row').to.be.at.most(1);
			expect(Math.abs(middle(remove) - middle(box)), 'button centred on the row').to.be.at.most(1);
			expect(name.right, 'name stops before the button').to.be.at.most(remove.left);
			expect(remove.right, 'button inside the row').to.be.at.most(box.right + 0.5);
		});
		expectNoSideways();

		search('christopher');
		cy.contains('.fantasy-pick-row', longName.name).should(([row]: JQuery<HTMLElement>) => {
			const box = row.getBoundingClientRect();
			const icon = row.querySelector('.fantasy-pick-icon')!.getBoundingClientRect();
			expect(icon.right, 'add icon inside the row').to.be.at.most(box.right + 0.5);
			expect(Math.abs(icon.top + icon.height / 2 - (box.top + box.height / 2)), 'add icon centred').to.be.at.most(1);
		});
		expectNoSideways();
	});

	it('keeps the search box in view while a long roster scrolls', () => {
		const roster = Array.from({ length: 40 }, (_, index) => ({ ...resolved(jokic), athleteId: `p${index}`, name: `Player ${index}` }));
		cy.mount(<Harness stubs={services()} initial={roster} />);
		cy.get('.fantasy-roster-scroll').scrollTo('bottom');
		cy.get('.fantasy-roster-scroll').should(([el]: JQuery<HTMLElement>) => expect(el.scrollTop).to.be.greaterThan(0));
		cy.get('#fantasyPlayerSearch').should(([el]: JQuery<HTMLElement>) => {
			const box = el.getBoundingClientRect();
			expect(box.top).to.be.at.least(0);
			expect(box.bottom).to.be.at.most(560);
		});
	});
});

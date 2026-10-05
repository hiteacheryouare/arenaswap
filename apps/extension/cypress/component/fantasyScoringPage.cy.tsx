import { useState } from 'react';
import type { FantasySport } from 'powerscore';
import type { UserPreferences } from '@arenaswap/core/types';
import FantasyScoringPage from '../../entrypoints/popup/components/fantasyScoringPage';
import { withFantasyRule, withoutFantasySport } from '../../utils/scoringPrefs';

interface harnessProps {
	initial?: UserPreferences['fantasyScoring'];
	sport?: FantasySport;
	onSaved?: (scoring: UserPreferences['fantasyScoring']) => void;
}

// Settings applies the same two helpers app.tsx does, so what is saved here is what would be stored.
const Harness = ({ initial = {}, sport = 'football', onSaved }: harnessProps) => {
	const [scoring, setScoring] = useState(initial);
	const save = (next: UserPreferences['fantasyScoring']) => {
		setScoring(next);
		onSaved?.(next);
	};
	return (
		<div className='popup-root'>
			<div className='popup-container'>
				<FantasyScoringPage
					scoring={scoring}
					initialSport={sport}
					disabled={false}
					onRuleChange={(ruleSport, rule, points) => save(withFantasyRule(scoring, ruleSport, rule, points))}
					onResetSport={resetSport => save(withoutFantasySport(scoring, resetSport))}
				/>
			</div>
		</div>
	);
};

const lastSaved = () => cy.get<sinon.SinonSpy>('@saved').should('have.been.called').then(spy => spy.lastCall.args[0] as UserPreferences['fantasyScoring']);

describe('fantasy scoring rules page', () => {
	beforeEach(() => cy.viewport(320, 560));

	it('shows every rule the box score can fill at its default, with the default written under it', () => {
		cy.mount(<Harness />);
		cy.get('.fantasy-rule-row').should('have.length', 26);
		['twoPointConversions', 'safetiesAndBlocks'].forEach(rule => cy.get(`#fantasyRule-football-${rule}`).should('not.exist'));
		cy.get('#fantasyRule-football-passingYards').should('have.value', '0.04');
		cy.get('#fantasyRule-football-receptions').should('have.value', '1');
		cy.get('#fantasyRule-football-receptions-default').should('have.text', 'Default 1');
		cy.get('.fantasy-rule-heading').then($headings => {
			expect([...$headings].map(heading => heading.textContent)).to.deep.equal(['Offense', 'Kicking', 'Team defense']);
		});
	});

	it('stores a changed value and drops it again once it matches the default', () => {
		cy.mount(<Harness onSaved={cy.spy().as('saved')} />);
		cy.get('#fantasyRule-football-receptions').clear().type('0.5');
		lastSaved().should('deep.equal', { football: { receptions: 0.5 } });
		cy.get('#fantasyRule-football-receptions').clear().type('1');
		lastSaved().should('deep.equal', {});
	});

	it('holds a value to the rule\'s bounds', () => {
		cy.mount(<Harness onSaved={cy.spy().as('saved')} />);
		cy.get('#fantasyRule-football-passingTouchdowns').clear().type('25');
		lastSaved().should('deep.equal', { football: { passingTouchdowns: 10 } });
		cy.get('#fantasyRule-football-passingTouchdowns').should('have.value', '10');
		cy.get('#fantasyRule-football-fumblesLost').clear().type('-9');
		lastSaved().its('football.fumblesLost').should('eq', -6);
		cy.get('#fantasyRule-football-fumblesLost').should('have.value', '-6');
	});

	it('takes a negative number, and saves nothing while the field is empty', () => {
		cy.mount(<Harness onSaved={cy.spy().as('saved')} />);
		cy.get('#fantasyRule-football-interceptionsThrown').clear();
		cy.get('@saved').should('not.have.been.called');
		cy.get('#fantasyRule-football-interceptionsThrown').should('have.value', '').type('-3');
		lastSaved().should('deep.equal', { football: { interceptionsThrown: -3 } });
		cy.get('#fantasyRule-football-interceptionsThrown').blur().should('have.value', '-3');
	});

	it('resets one sport to its defaults, and only once there is something to reset', () => {
		cy.mount(<Harness initial={{ basketball: { steals: 2 }, hockey: { goals: 4 } }} sport='hockey' onSaved={cy.spy().as('saved')} />);
		cy.get('#fantasyRulesReset').should('not.be.disabled').and('contain.text', 'Reset Hockey to defaults').click();
		lastSaved().should('deep.equal', { basketball: { steals: 2 } });
		cy.get('#fantasyRule-hockey-goals').should('have.value', '3');
		cy.get('#fantasyRulesReset').should('be.disabled');
	});

	it('switches sport from the picker', () => {
		cy.mount(<Harness />);
		cy.get('#fantasySportSelect').click();
		cy.contains('.dropdown-menu.show .dropdown-item', 'Basketball').click();
		cy.get('.fantasy-rule-row').should('have.length', 6);
		cy.get('.fantasy-rule-heading').should('not.exist');
		cy.get('#fantasyRule-basketball-rebounds').should('have.value', '1.2');
	});

	it('lines every label up beside its input, inside the popup', () => {
		cy.mount(<Harness />);
		cy.get('.fantasy-rule-row').each(([row]: JQuery<HTMLElement>) => {
			const box = row.getBoundingClientRect();
			const label = row.querySelector('.fantasy-rule-label')!.getBoundingClientRect();
			const input = row.querySelector('input')!.getBoundingClientRect();
			expect(label.right, 'label stops before the input').to.be.at.most(input.left);
			expect(input.right, 'input sits inside the row').to.be.at.most(box.right + 0.5);
			expect(Math.abs(input.top + input.height / 2 - (box.top + box.height / 2)), 'input centred on its row').to.be.at.most(1);
		});
		cy.get('.fantasy-rule-input').then($inputs => {
			const lefts = new Set([...$inputs].map(input => Math.round(input.getBoundingClientRect().left)));
			expect(lefts.size, 'one column of inputs').to.eq(1);
		});
		cy.get('.popup-container').should(([el]: JQuery<HTMLElement>) => expect(el.scrollWidth).to.be.at.most(el.clientWidth));
	});
});

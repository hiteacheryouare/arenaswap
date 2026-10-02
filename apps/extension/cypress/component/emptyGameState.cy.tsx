import { useState } from 'react';
import en from '../../locales/en.json';
import EmptyGameState from '../../entrypoints/popup/components/emptyGameState';

const popupWidth = 320;
const noGamesTitles = Object.values(en.noGames).map(message => message.title);

// A settling SWR mutate re-renders the popup several times in a row, and the empty state has to
// survive that untouched. The parent owns `noGames`, so this mirrors that ownership. One button
// re-renders without changing anything, the other takes the empty state away and brings it back.
const StatefulEmptyState = () => {
	const [renders, setRenders] = useState(0);
	const [noGames, setNoGames] = useState(true);

	return (
		<div style={{ width: `${popupWidth}px` }}>
			<button data-cy='rerender' onClick={() => setRenders(count => count + 1)}>{renders}</button>
			<button data-cy='toggle' onClick={() => setNoGames(showing => !showing)}>toggle</button>
			<EmptyGameState
				noLeaguesSelected={false}
				noGames={noGames}
				onOpenSetup={() => {}}
				onRefresh={() => {}}
			/>
		</div>
	);
};

const title = () => cy.get('.popup-no-games-title');

describe('empty game state message', () => {
	beforeEach(() => {
		cy.viewport(popupWidth, 600);
		cy.mount(<StatefulEmptyState />);
	});

	it('shows one of the written messages', () => {
		title().invoke('text').should(text => {
			expect(noGamesTitles).to.include(text);
		});
	});

	// With seven messages to draw from, a re-rolling render body survives twelve unchanged draws
	// about once in 13 billion runs, so this fails on the bug every time in practice.
	it('keeps the same message across re-renders', () => {
		title().invoke('text').then(chosen => {
			for (let click = 0; click < 12; click += 1) cy.get('[data-cy=rerender]').click();
			title().should('have.text', chosen);
		});
	});

	// The other half of the contract. The roll is tied to the mount, so the message is free to
	// change once the empty state has been away and come back.
	it('rolls a new message when the empty state reappears', () => {
		const seen = new Set<string>();
		const collect = () => title().invoke('text').then(text => { seen.add(text); });

		collect();
		for (let visit = 0; visit < 20; visit += 1) {
			cy.get('[data-cy=toggle]').click();
			cy.get('.popup-no-games-title').should('not.exist');
			cy.get('[data-cy=toggle]').click();
			collect();
		}

		cy.then(() => {
			expect(seen.size).to.be.greaterThan(1);
		});
	});
});

// A refresh that comes back with the same empty slate changes nothing on screen, so the button has
// to show the request itself, or it reads as broken.
describe('empty game state refresh', () => {
	it('holds the button busy, at the same width, until the refresh settles', () => {
		let settle: () => void = () => {};
		const onRefresh = () => new Promise<void>(resolve => { settle = resolve; });
		cy.viewport(popupWidth, 600);
		cy.mount(<EmptyGameState noLeaguesSelected={false} noGames onOpenSetup={() => {}} onRefresh={onRefresh} />);
		cy.contains('button', en.empty.refresh).then($idle => {
			const idleWidth = $idle[0]!.getBoundingClientRect().width;
			cy.wrap($idle).click();
			cy.contains('button', en.empty.refresh)
				.should('be.disabled')
				.and('have.attr', 'aria-busy', 'true')
				.find('.spinner-border')
				.should('exist');
			cy.contains('button', en.empty.refresh).should($busy => {
				expect($busy[0]!.getBoundingClientRect().width).to.be.closeTo(idleWidth, 0.5);
			});
			cy.then(() => settle());
			cy.contains('button', en.empty.refresh).should('not.be.disabled').find('.spinner-border').should('not.exist');
		});
	});
});

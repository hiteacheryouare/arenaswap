import { useState } from 'react';
import en from '../../../locales/en.json';
import EmptyGameState from '../../../entrypoints/popup/components/emptyGameState';

const popupWidth = 320;
const noGamesTitles = Object.values(en.noGames).map(message => message.title);

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

	it('keeps the same message across re-renders', () => {
		title().invoke('text').then(chosen => {
			for (let click = 0; click < 12; click += 1) cy.get('[data-cy=rerender]').click();
			title().should('have.text', chosen);
		});
	});

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

describe('empty game state refresh', () => {
	it('holds the button busy, at the same width, until the refresh settles', () => {
		let settle: (() => void) | undefined;
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
			cy.then(() => settle!());
			cy.contains('button', en.empty.refresh).should('not.be.disabled').find('.spinner-border').should('not.exist');
		});
	});
});

const channels = (value: string) => /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value)!.slice(1).map(Number);

const luminance = (value: string) => {
	const [red, green, blue] = channels(value).map(channel => {
		const scaled = channel / 255;
		return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
	});
	return (0.2126 * red!) + (0.7152 * green!) + (0.0722 * blue!);
};

describe('empty game state in both themes', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('data-bs-theme');
	});

	for (const theme of ['dark', 'light']) {
		it(`sets the pick-your-leagues heading apart from the ${theme} page`, () => {
			if (theme === 'light') document.documentElement.setAttribute('data-bs-theme', 'light');
			cy.viewport(popupWidth, 600);
			cy.mount(<EmptyGameState noLeaguesSelected noGames={false} onOpenSetup={() => {}} onRefresh={() => {}} />);
			cy.get('.popup-empty-leagues-title').should($title => {
				const ink = luminance(getComputedStyle($title[0]!).color);
				const page = luminance(getComputedStyle(document.body).backgroundColor);
				const ratio = (Math.max(ink, page) + 0.05) / (Math.min(ink, page) + 0.05);
				expect(ratio).to.be.at.least(4.5);
			});
		});
	}
});

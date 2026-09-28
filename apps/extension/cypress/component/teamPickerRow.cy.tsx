import type { EspnTeamEntry } from '@arenaswap/core';
import TeamPickerRow from '../../entrypoints/popup/components/teamPickerRow';

// 4x4 solid PNGs as data URIs, so the test needs no network and the canvas can always read them back.
const greenCrest = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAD0lEQVR4nGNgaPZAIOI4AEWjDLFo9OSUAAAAAElFTkSuQmCC';
const navyCrest = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGPklndkgAEmOAsvBwAVtABz/BlSUAAAAABJRU5ErkJggg==';
const whiteCrest = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGP8//8/AwwwwVl4OQCWbgMF7ZjH1AAAAABJRU5ErkJggg==';

const team = (over: Partial<EspnTeamEntry> = {}): EspnTeamEntry => ({
	leagueId: 'nba', id: '2', name: 'Boston Celtics', abbreviation: 'BOS', ...over,
});

const mountRow = (over: Partial<EspnTeamEntry> = {}, isFavorite = false) => {
	cy.viewport(320, 560);
	cy.mount(
		<div className='popup-container st'>
			<div className='st-body'>
				<div className='st-card'>
					<TeamPickerRow team={team(over)} isFavorite={isFavorite} onToggle={() => {}} />
				</div>
			</div>
		</div>,
	);
};

describe('teamPickerRow', () => {
	it('draws the crest at row size', () => {
		mountRow({ logo: whiteCrest });
		cy.get('.team-pick-crest').should(([el]: JQuery<HTMLElement>) => {
			const box = el.getBoundingClientRect();
			expect(box.width).to.equal(28);
			expect(box.height).to.equal(28);
		});
	});

	it('leaves a crest bare where its own artwork reads on the card', () => {
		mountRow({ logo: whiteCrest });
		cy.get('.team-pick-crest .as-crest').should('have.class', 'is-bare')
			.and('have.css', 'background-image', 'none');
	});

	// Navy on the dark card is a silhouette, and a roster carries no white mark to swap to.
	it('plates a crest that disappears into the card, tinted from the crest itself', () => {
		mountRow({ logo: navyCrest });
		cy.get('.team-pick-crest .as-crest').should('not.have.class', 'is-bare').and(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).backgroundImage).to.contain('11, 31, 65');
		});
	});

	it('measures the crest against the card rather than the page', () => {
		mountRow({ logo: greenCrest });
		cy.get('.team-pick-crest .as-crest img').should('have.attr', 'crossorigin', 'anonymous');
		cy.get('.team-pick-crest').closest('.st-card').should('have.css', 'background-color', 'rgb(26, 29, 34)');
	});

	it('letters a neutral disc, in readable ink, when there is no crest at all', () => {
		mountRow({ logo: undefined });
		cy.get('.crest-fallback')
			.should('have.text', 'BOS')
			.and('have.css', 'background-color', 'rgb(90, 99, 112)')
			.and('have.css', 'color', 'rgb(255, 255, 255)');
	});

	it('asks for a roster of crests lazily', () => {
		mountRow({ logo: greenCrest });
		cy.get('.team-pick-crest img').should('have.attr', 'loading', 'lazy');
	});

	it('marks a followed team with a filled star in the accent ink', () => {
		mountRow({ logo: whiteCrest }, true);
		cy.get('[aria-label="Remove Boston Celtics from favorites"]')
			.should('have.class', 'is-on')
			.find('.bi-star-fill')
			.should('have.css', 'color', 'rgb(247, 92, 3)');
	});

	it('offers an outline star to a team not yet followed', () => {
		mountRow({ logo: whiteCrest });
		cy.get('[aria-label="Add Boston Celtics to favorites"]')
			.should('not.have.class', 'is-on')
			.find('.bi-star')
			.should('exist');
	});

	it('wraps a long name rather than pushing the star off the card', () => {
		mountRow({ name: 'Texas A&M-Corpus Christi Islanders Womens Basketball Program', logo: whiteCrest });
		cy.get('.team-pick-row').should(([row]: JQuery<HTMLElement>) => {
			expect(row.scrollWidth).to.be.at.most(row.clientWidth);
		});
		cy.get('.team-pick-star').should(([star]: JQuery<HTMLElement>) => {
			expect(star.getBoundingClientRect().right).to.be.at.most(320 - 12);
		});
	});
});

import type { EspnTeamEntry } from '@arenaswap/core';
import TeamPickerRow from '../../entrypoints/popup/components/teamPickerRow';

// A 4x4 solid #008348 PNG. A data URI so the test needs no network and cannot taint the canvas on
// its own — what it is proving is that a crest is readable back off the page at all.
const greenCrest = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAD0lEQVR4nGNgaPZAIOI4AEWjDLFo9OSUAAAAAElFTkSuQmCC';

const team = (over: Partial<EspnTeamEntry> = {}): EspnTeamEntry => ({
	leagueId: 'nba', id: '2', name: 'Boston Celtics', abbreviation: 'BOS', ...over,
});

describe('teamPickerRow', () => {
	it('tints the disc with a colour read out of the crest itself', () => {
		cy.mount(<TeamPickerRow team={team({ logo: greenCrest })} isFavorite={false} onToggle={() => {}} />);

		cy.get('.team-pick-crest').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).backgroundImage).to.contain('0, 131, 72');
		});
	});

	it('leaves the disc plain white when there is no crest to read', () => {
		cy.mount(<TeamPickerRow team={team({ logo: undefined })} isFavorite={false} onToggle={() => {}} />);

		cy.get('.team-pick-crest').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).backgroundImage).to.equal('none');
			expect(getComputedStyle(el).backgroundColor).to.equal('rgb(255, 255, 255)');
		});
	});

	// The disc under a crest that never loaded is white, so grey-on-white initials would be the one
	// unreadable state the disc was added to remove.
	it('sets the placeholder initials dark, against that white disc', () => {
		cy.mount(<TeamPickerRow team={team({ logo: undefined })} isFavorite={false} onToggle={() => {}} />);

		cy.get('.crest-fallback')
			.should('have.text', 'BOS')
			.and('have.css', 'color', 'rgb(17, 24, 39)')
			.and('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
	});

	it('asks the browser for a crest it is allowed to read back', () => {
		cy.mount(<TeamPickerRow team={team({ logo: greenCrest })} isFavorite={false} onToggle={() => {}} />);

		cy.get('.team-pick-crest img').should('have.attr', 'crossorigin', 'anonymous');
	});
});

import type { EspnTeamEntry } from '@arenaswap/sideline';
import TeamPickerRow from '../../../entrypoints/popup/components/teamPickerRow';

const greenCrest = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAD0lEQVR4nGNgaPZAIOI4AEWjDLFo9OSUAAAAAElFTkSuQmCC';

const team = (over: Partial<EspnTeamEntry> = {}): EspnTeamEntry => ({
	leagueId: 'nba', id: '2', name: 'Boston Celtics', abbreviation: 'BOS', ...over,
});

describe('teamPickerRow', () => {
	it('tints the disc with a colour read out of the crest itself', () => {
		cy.mount(<TeamPickerRow team={team({ logo: greenCrest })} isSelected={false} onToggle={() => {}} />);

		cy.get('.team-pick-crest').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).backgroundImage).to.contain('0, 131, 72');
		});
	});

	it('leaves the disc plain white when there is no crest to read', () => {
		cy.mount(<TeamPickerRow team={team({ logo: undefined })} isSelected={false} onToggle={() => {}} />);

		cy.get('.team-pick-crest').should(([el]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(el).backgroundImage).to.equal('none');
			expect(getComputedStyle(el).backgroundColor).to.equal('rgb(255, 255, 255)');
		});
	});

	it('sets the placeholder initials dark, against that white disc', () => {
		cy.mount(<TeamPickerRow team={team({ logo: undefined })} isSelected={false} onToggle={() => {}} />);

		cy.get('.crest-initials')
			.should('have.text', 'BOS')
			.and('have.css', 'color', 'rgb(17, 24, 39)');
		cy.get('.crest').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
	});

	it('toggles from anywhere on the row, the team name included', () => {
		const onToggle = cy.spy().as('toggle');
		cy.mount(<TeamPickerRow team={team()} isSelected={false} onToggle={onToggle} />);
		cy.contains('Boston Celtics').click();
		cy.get('@toggle').should('have.been.calledOnce');
		cy.get('button[aria-label="Add Boston Celtics to favorites"]').should('have.length', 1);
	});

	it('takes the gold once starred', () => {
		cy.mount(<TeamPickerRow team={team()} isSelected onToggle={() => {}} />);
		cy.get('.team-pick-star').should('have.class', 'bi-star-fill').and(([star]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(star).color).to.equal('rgb(241, 196, 15)');
		});
	});

	it('asks the browser for a crest it is allowed to read back', () => {
		cy.mount(<TeamPickerRow team={team({ logo: greenCrest })} isSelected={false} onToggle={() => {}} />);

		cy.get('.team-pick-crest img').should('have.attr', 'crossorigin', 'anonymous');
	});
});

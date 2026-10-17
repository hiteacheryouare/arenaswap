import DetailTabs, { type DetailTabId } from '../../entrypoints/popup/components/detailTabs';
import en from '../../locales/en.json';

const ids: DetailTabId[] = ['overview', 'matchup', 'box', 'standings'];

const mountStrip = (labels: string[]) => {
	cy.viewport(320, 240);
	cy.mount(
		<div className='popup-container game-detail-shell'>
			<DetailTabs tabs={ids.map((id, index) => ({ id, label: labels[index]! }))} tabId={id => `tab-${id}`} paneId={id => `pane-${id}`} />
			<div className='tab-content'>
				{ids.map((id, index) => <div key={id} id={`pane-${id}`} className={`tab-pane${index === 0 ? ' active show' : ''}`} role='tabpanel' />)}
			</div>
		</div>,
	);
};

const englishLabels = [en.detail.tabOverview, en.detail.tabMatchup, en.box.heading, en.detail.tabStandings];
// Longer than any locale ships today, so the strip has to fold whatever the translations do next.
const longLabels = ['Spielübersicht', 'Direktvergleich', 'Spielstatistiken', 'Tabellenstände'];

describe('the detail tab strip under Bootstrap nav overflow', () => {
	it('keeps every tab in the strip, at equal widths, when the labels fit', () => {
		mountStrip(englishLabels);
		cy.get('.gd-tabs [role="tab"]').should('have.length', 4).and('be.visible');
		cy.get('.nav-overflow-toggle').should('not.be.visible');
		cy.get('.gd-tabs [role="tab"]').then($tabs => {
			const widths = [...$tabs].map(tab => Math.round(tab.getBoundingClientRect().width));
			expect(Math.max(...widths) - Math.min(...widths)).to.be.at.most(1);
		});
	});

	it('folds the tabs a long translation pushes off the strip into a menu', () => {
		mountStrip(longLabels);
		cy.get('.nav-overflow-toggle').should('be.visible').and('have.attr', 'aria-label', en.detail.moreTabs);
		cy.get('.gd-tabs [role="tab"]:visible').its('length').should('be.lessThan', 4);
		cy.get('.gd-tabs').then(([strip]: JQuery<HTMLElement>) => {
			expect(strip.scrollWidth, 'nothing runs past the edge').to.be.at.most(strip.clientWidth + 0.5);
		});
	});

	it('opens a folded tab from the menu and marks the menu button as holding it', () => {
		mountStrip(longLabels);
		cy.get('.nav-overflow-toggle').click();
		cy.get('.nav-overflow-menu .menu-item').should('be.visible').and('not.have.attr', 'role');
		cy.get('.nav-overflow-menu .menu-item').last().click();
		cy.get('#tab-standings').should('have.class', 'active');
		cy.get('#pane-standings').should('have.class', 'active');
		cy.get('.nav-overflow-toggle').should('have.css', 'font-weight', '700').and('have.focus');
	});

	it('leaves folded tabs out of the arrow-key order', () => {
		mountStrip(longLabels);
		cy.get('.gd-tabs [role="tab"]:visible').last().focus().trigger('keydown', { key: 'ArrowRight' });
		cy.get('#tab-overview').should('have.class', 'active').and('have.focus');
	});
});

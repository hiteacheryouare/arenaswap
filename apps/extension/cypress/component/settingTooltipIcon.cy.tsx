import SettingTooltipIcon from '../../entrypoints/popup/components/settingTooltipIcon';

const explainer = 'Minimum seconds between automatic switches.';

describe('settingTooltipIcon', () => {
	// Bootstrap hangs the explainer on the button as its description, so naming the button with the
	// explainer too had screen readers read it twice.
	it('names the button after its setting, not its explainer', () => {
		cy.mount(<SettingTooltipIcon text={explainer} label='Switch cooldown' />);
		cy.get('.setting-tooltip-btn').should('have.attr', 'aria-label', 'About Switch cooldown');
	});

	it('is a 24px target that takes up only its glyph\'s room', () => {
		cy.mount(<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span id='before'>Label</span><SettingTooltipIcon text={explainer} label='x' /><span id='after'>end</span></span>);
		cy.get('.setting-tooltip-btn').should(([button]: JQuery<HTMLElement>) => {
			const box = button.getBoundingClientRect();
			expect(box.width).to.be.at.least(24);
			expect(box.height).to.be.at.least(24);
			const glyph = button.querySelector('i')!.getBoundingClientRect();
			const before = document.getElementById('before')!.getBoundingClientRect();
			expect(glyph.left - before.right).to.be.closeTo(4, 1);
		});
	});

	it('closes its tooltip on Escape', () => {
		cy.mount(<SettingTooltipIcon text={explainer} label='Switch cooldown' />);
		cy.get('.setting-tooltip-btn').focus();
		cy.get('.tooltip').should('contain.text', explainer);
		cy.get('.setting-tooltip-btn').type('{esc}');
		cy.get('.tooltip').should('not.exist');
	});
});

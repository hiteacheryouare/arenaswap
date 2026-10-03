import CooldownSlider from '../../entrypoints/popup/components/cooldownSlider';
import SwitchDelaySlider from '../../entrypoints/popup/components/switchDelaySlider';

// The digits-only face is fetched on first use, so it is asked for outright rather than awaited.
const figuresLoaded = () => cy.document().then(doc => doc.fonts.load('600 10px "Geist Figures"', '0123456789'));


describe('the seconds sliders', () => {
	// DM Sans has no tabular figures, so "15s" and "45s" used to differ by a few pixels and the
	// value label jittered as the thumb moved.
	it('holds the value label at one width while the digits change', () => {
		cy.mount(<CooldownSlider value={15} onChange={() => {}} />);
		figuresLoaded();
		cy.get('#cooldown-range').parent().find('.setting-value-label').should(([label]: JQuery<HTMLElement>) => {
			const widthOf = (text: string) => {
				label!.textContent = text;
				return label!.getBoundingClientRect().width;
			};
			expect(widthOf('45s')).to.be.closeTo(widthOf('15s'), 0.01);
			expect(widthOf('1m 30s')).to.be.closeTo(widthOf('3m 45s'), 0.01);
		});
	});

	it('tells a screen reader the time rather than the step number', () => {
		cy.mount(<CooldownSlider value={90} onChange={() => {}} />);
		cy.get('#cooldown-range').should('have.attr', 'aria-valuetext', '1m 30s');
		cy.mount(<SwitchDelaySlider value={0} onChange={() => {}} />);
		cy.get('#switch-delay-range').should('have.attr', 'aria-valuetext', 'Off');
	});

	it('draws both ends in the same faint style as the other sliders', () => {
		cy.mount(<SwitchDelaySlider value={30} onChange={() => {}} />);
		cy.get('#switch-delay-range').next().children().each(end => {
			cy.wrap(end).should('have.class', 'setting-explainer');
		});
	});
});

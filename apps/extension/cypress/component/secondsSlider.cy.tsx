import CooldownSlider from '../../entrypoints/popup/components/cooldownSlider';
import SwitchDelaySlider from '../../entrypoints/popup/components/switchDelaySlider';

// The digits-only face is fetched on first use, so it is asked for outright rather than awaited.
const figuresLoaded = () => cy.document().then(doc => doc.fonts.load('600 10px "Geist Figures"', '0123456789'));

const valueWidth = (selector: string) => cy.get(selector).parent().find('.setting-value-label')
	.then(([label]: JQuery<HTMLElement>) => label!.getBoundingClientRect().width);

describe('the seconds sliders', () => {
	// DM Sans has no tabular figures, so "15s" and "45s" used to differ by a few pixels and the
	// value label jittered as the thumb moved.
	it('holds the value label at one width while the digits change', () => {
		cy.mount(<CooldownSlider value={15} onChange={() => {}} />);
		figuresLoaded();
		valueWidth('#cooldown-range').then(narrow => {
			cy.mount(<CooldownSlider value={45} onChange={() => {}} />);
			figuresLoaded();
			valueWidth('#cooldown-range').should('be.closeTo', narrow, 0.01);
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

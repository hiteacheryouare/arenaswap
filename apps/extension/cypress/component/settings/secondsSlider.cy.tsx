import CooldownSlider from '../../../entrypoints/popup/components/cooldownSlider';
import SwitchDelaySlider from '../../../entrypoints/popup/components/switchDelaySlider';

// The digits-only face is fetched on first use, so it is asked for outright rather than awaited.
const figuresLoaded = () => cy.document().then(doc => doc.fonts.load('600 10px "Geist Figures"', '0123456789'));
// The label group holds the label and its tooltip icon, beside the value.
const labelGroupOf = (id: string) => cy.get(`label[for="${id}"]`).parent();


describe('the seconds sliders', () => {
	// DM Sans has no tabular figures, so "15s" and "45s" used to differ by a few pixels and the
	// value label jittered as the thumb moved.
	it('holds the value label at one width while the digits change', () => {
		cy.mount(<CooldownSlider value={15} onChange={() => {}} />);
		figuresLoaded();
		cy.get('#cooldown-range').closest('.form-range').parent().find('.setting-value-label').should(([label]: JQuery<HTMLElement>) => {
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
		cy.get('#switch-delay-range').closest('.form-range').next().children().each(end => {
			cy.wrap(end).should('have.class', 'setting-explainer');
		});
	});

	it('keeps a long label clear of its value at 320px', () => {
		cy.viewport(320, 560);
		const cases = [
			{ id: 'cooldown-range', mount: <CooldownSlider value={90} onChange={() => {}} /> },
			{ id: 'switch-delay-range', mount: <SwitchDelaySlider value={30} onChange={() => {}} /> },
		];
		cases.forEach(({ id, mount }) => {
			cy.mount(mount);
			cy.document().then(doc => doc.fonts.load('600 10px "DM Sans"', 'Abc'));
			labelGroupOf(id).should(([group]: JQuery<HTMLElement>) => {
				const label = group!.querySelector('label')!;
				const longLabel = 'Mindestwartezeit zwischen zwei Wechseln der Spiele';
				label.textContent = longLabel;
				expect(label.textContent, 'the German label is in place').to.equal(longLabel);
				const value = group!.parentElement!.querySelector('.setting-value-label')!;
				expect(group!.getBoundingClientRect().right, `${id} label group ends before its value`)
					.to.be.at.most(value.getBoundingClientRect().left);
			});
		});
	});
});

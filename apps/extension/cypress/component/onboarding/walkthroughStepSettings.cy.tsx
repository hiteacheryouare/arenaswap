import WalkthroughStepSettings from '../../../entrypoints/popup/components/walkthroughStepSettings';
import en from '../../../locales/en.json';

describe('walkthroughStepSettings practice sliders', () => {
	beforeEach(() => {
		cy.mount(<WalkthroughStepSettings onNext={() => {}} onBack={() => {}} />);
	});

	it('names the sensitivity slider after its caption and announces the level', () => {
		cy.get('input[type="range"]').eq(0).then(([input]: JQuery<HTMLElement>) => {
			const caption = document.getElementById(input!.getAttribute('aria-labelledby')!)!;
			expect(caption.textContent).to.equal(en.stepSettings.sensitivityLabel);
		});
		cy.get('input[type="range"]').eq(0)
			.should('have.attr', 'aria-valuetext', en.stepSettings.sensitivity4)
			.setInputValue(5)
			.should('have.attr', 'aria-valuetext', en.stepSettings.sensitivity5);
	});

	it('names the cooldown slider after its caption and announces the time', () => {
		cy.get('input[type="range"]').eq(1).then(([input]: JQuery<HTMLElement>) => {
			const caption = document.getElementById(input!.getAttribute('aria-labelledby')!)!;
			expect(caption.textContent).to.equal(en.stepSettings.cooldownLabel);
		});
		cy.get('input[type="range"]').eq(1).invoke('attr', 'aria-valuetext').then(before => {
			cy.get('input[type="range"]').eq(1).setInputValue(3)
				.invoke('attr', 'aria-valuetext').should('not.equal', before);
		});
	});
});

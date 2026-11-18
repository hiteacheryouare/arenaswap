import WalkthroughView from '../../../entrypoints/popup/components/walkthroughView';
import { shippedLocales, withLocale } from './locales';
import { popupSurface, popupViewport } from './mountInPopup';

const primaryButton = '.btn-solid.theme-primary:not(:disabled)';

const halfway = Math.ceil(shippedLocales.length / 2);

const localesIn = (half: 'first' | 'second') => (half === 'first' ? shippedLocales.slice(0, halfway) : shippedLocales.slice(halfway));

export default (half: 'first' | 'second') => {
	describe('walkthrough containment', () => {
		for (const locale of localesIn(half)) it(`keeps every walkthrough step inside the popup (${locale.folder})`, () => {
			const onComplete = cy.stub().as('onComplete');
			cy.viewport(popupViewport.width, popupViewport.height);
			cy.mount(withLocale(locale, <WalkthroughView onComplete={onComplete} leagues={['nba', 'nfl', 'nhl', 'mlb']} scoringMode='classic' />));
			const pressNextUnderBloom = () => cy.get(primaryButton).last().click({ force: true });
			const walk = (remaining: number): void => {
				cy.get(popupSurface).assertContained();
				if (remaining === 0) return;
				cy.get('body').then(() => {
					if (onComplete.called) return;
					pressNextUnderBloom();
					cy.wait(150);
					walk(remaining - 1);
				});
			};
			walk(40);
			cy.get('@onComplete').should('have.been.called');
		});
	});
};

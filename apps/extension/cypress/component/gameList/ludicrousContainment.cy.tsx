import LudicrousSpeedOverlay from '../../../entrypoints/popup/components/ludicrousSpeedOverlay';
import { buildScript } from '../../../entrypoints/popup/components/ludicrousScript';
import { inEveryLocale, withLocale, type shippedLocale } from '../../support/safetyNet/locales';
import { popupViewport } from '../../support/safetyNet/mountInPopup';

// The sign text is the one place the extension sets text on a single line by rule, so a longer
// translation has nowhere to wrap to. Animations are switched off so a slam or rattle caught
// mid-flight is not read as the text's resting place.
const stillStyle = '.ls-overlay, .ls-overlay * { animation: none !important; transition: none !important; }';

const stepThrough = (locale: shippedLocale) => {
	cy.viewport(popupViewport.width, popupViewport.height);
	cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
	cy.document().then(doc => {
		const style = doc.createElement('style');
		style.textContent = stillStyle;
		doc.head.append(style);
	});
	cy.mount(withLocale(locale, <LudicrousSpeedOverlay onClose={() => {}} />));
	cy.get('.ls-overlay').should('exist');

	const script = buildScript();
	script.forEach(beat => {
		if (beat.display?.text) {
			cy.get('.ls-text').should('have.text', beat.display.text);
			cy.get('.ls-overlay').assertContained();
		}
		cy.tick(beat.ms);
	});
};

describe('ludicrous speed containment', () => {
	// The script reads its lines when it is built, which the stub resolves per locale.
	inEveryLocale('keeps every line of the sequence and the skip hint inside the popup', locale => {
		stepThrough(locale);
	});
});

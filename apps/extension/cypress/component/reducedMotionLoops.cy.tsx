// Nothing to import: these are bare elements wearing the shipped classes. The export makes it a module.
export {};

const emulateReducedMotion = (on: boolean) => Cypress.automation('remote:debugger:protocol', {
	command: 'Emulation.setEmulatedMedia',
	params: { features: on ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] },
});

// Elements carrying the real classes, so this reads the shipped stylesheet rather than the components'
// timing, which these loops don't depend on.
const loops = [
	['the Ludicrous Speed label', 'fw-semibold setting-value-label ludicrous-speed'],
	['the flashing STOP', 'ls-text stop'],
	['the pressed emergency brake', 'ls-emergency-brake pressed'],
	['the shaking GO', 'ls-text go'],
	['the blinking ludicrous sign', 'ls-text speedsign ludicrous'],
	['the orbit ring', 'powerscore-orbit-ring animating'],
	['the active orbit dot', 'powerscore-orbit-dot active'],
	['the bloom sweeping in', 'ps-bloom-overlay ps-bloom-blooming'],
] as const;

describe('looping animations under reduced motion', () => {
	afterEach(() => {
		cy.wrap(emulateReducedMotion(false));
	});

	it('run when motion is welcome', () => {
		cy.mount(<div>{loops.map(([name, className]) => <span key={name} className={className} data-loop={name} />)}</div>);
		cy.get('[data-loop]').each(element => {
			expect(getComputedStyle(element[0]!).animationName, element.attr('data-loop')).not.to.equal('none');
		});
	});

	it('all hold still when reduced motion is asked for', () => {
		cy.wrap(emulateReducedMotion(true));
		cy.mount(<div>{loops.map(([name, className]) => <span key={name} className={className} data-loop={name} />)}</div>);
		cy.get('[data-loop]').each(element => {
			expect(getComputedStyle(element[0]!).animationName, element.attr('data-loop')).to.equal('none');
		});
	});
});

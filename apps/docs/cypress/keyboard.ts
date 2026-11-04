// A synthetic Escape never reaches a modal <dialog>'s own cancel, so the key goes through Chrome itself.
export const pressEscape = () => {
	for (const type of ['keyDown', 'keyUp']) {
		cy.then(() => Cypress.automation('remote:debugger:protocol', {
			command: 'Input.dispatchKeyEvent',
			params: { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
		}));
	}
};

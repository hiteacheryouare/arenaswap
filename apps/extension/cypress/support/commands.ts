/**
 * React installs a value tracker on every controlled input and skips onChange when it believes the
 * value is unchanged — which is exactly what jQuery's .val() looks like to it. Going through the
 * prototype's own setter clears that tracker, so the dispatched event reaches React.
 */
export const setNativeInputValue = (input: HTMLInputElement, value: string) => {
	const view = input.ownerDocument.defaultView;
	if (!view) throw new Error('setInputValue: the input is not attached to a document');

	Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')?.set?.call(input, value);
	input.dispatchEvent(new view.Event('input', { bubbles: true }));
};

Cypress.Commands.add('setInputValue', { prevSubject: 'element' }, (subject: JQuery<HTMLElement>, value: number | string) => {
	setNativeInputValue(subject[0] as HTMLInputElement, String(value));
	return cy.wrap(subject, { log: false });
});

declare global {
	namespace Cypress {
		interface Chainable {
			/**
			 * Sets a React-controlled input to `value` in one shot. Use over .type() on any input
			 * whose value round-trips through background state: typing re-renders per keystroke and
			 * the stale prop wipes the digits already entered.
			 */
			setInputValue: (value: number | string) => Chainable<JQuery<HTMLElement>>;
		}
	}
}

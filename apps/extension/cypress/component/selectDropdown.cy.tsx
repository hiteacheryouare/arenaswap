import SelectDropdown from '../../entrypoints/popup/components/selectDropdown';

const options = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
] as const;

// What a screen reader announces for an aria-labelledby list: the referenced texts, joined.
const accessibleName = (button: HTMLElement) => button.getAttribute('aria-labelledby')!.split(' ')
	.map(id => document.getElementById(id)!.textContent!.trim()).join(' ');

describe('selectDropdown', () => {
	// A bare aria-label replaced the button's content, so the standby picker said "Standby tab" and
	// never which tab.
	it('names a hidden-labelled control with its label and its current value', () => {
		cy.mount(<SelectDropdown value='dark' options={options} onChange={() => {}} ariaLabel='Theme' />);
		cy.get('.form-select').should(([button]: JQuery<HTMLElement>) => {
			expect(accessibleName(button)).to.equal('Theme Dark');
		});
	});

	it('names a visibly labelled control the same way', () => {
		cy.mount(<div><label id='themeLabel' htmlFor='theme'>Theme</label><SelectDropdown id='theme' labelId='themeLabel' value='light' options={options} onChange={() => {}} /></div>);
		cy.get('#theme').should(([button]: JQuery<HTMLElement>) => {
			expect(accessibleName(button)).to.equal('Theme Light');
		});
	});
});

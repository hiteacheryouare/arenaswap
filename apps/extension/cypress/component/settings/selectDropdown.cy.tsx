import SelectDropdown from '../../../entrypoints/popup/components/selectDropdown';

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
		cy.get('.form-control-caret').should(([button]: JQuery<HTMLElement>) => {
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

describe('selectDropdown overflow', () => {
	it('truncates a long value inside the button instead of under the caret', () => {
		const longOptions = [{ value: 'a', label: 'A very long option label that cannot possibly fit in the box' }];
		cy.mount(<div style={{ width: '9.5rem' }}><SelectDropdown value='a' options={longOptions} onChange={() => {}} ariaLabel='Long' /></div>);
		cy.get('.form-control-caret').should(([button]: JQuery<HTMLElement>) => {
			const value = button.querySelector('[id$="-value"]') as HTMLElement;
			expect(value.scrollWidth).to.be.greaterThan(value.clientWidth);
			expect(value.getBoundingClientRect().right).to.be.at.most(button.getBoundingClientRect().right);
		});
	});
});

describe('selectDropdown long list', () => {
	it('opens scrolled to the selected option', () => {
		const many = Array.from({ length: 30 }, (_, index) => ({ value: `o${index + 1}`, label: `Option ${index + 1}` }));
		cy.mount(<SelectDropdown value='o25' options={many} onChange={() => {}} ariaLabel='Many' />);
		cy.get('.form-control-caret').click();
		cy.get('.select-dropdown-menu.show').should(([menu]: JQuery<HTMLElement>) => {
			const box = menu.getBoundingClientRect();
			const item = menu.querySelector('.selected')!.getBoundingClientRect();
			expect(item.top).to.be.at.least(box.top);
			expect(item.bottom).to.be.at.most(box.bottom);
		});
	});
});

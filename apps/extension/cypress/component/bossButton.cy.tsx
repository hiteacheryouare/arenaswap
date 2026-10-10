import { useState } from 'react';
import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';
import BossDecoyInput from '../../entrypoints/popup/components/bossDecoyInput';
import de from '../../locales/de.json';
import { TranslationContext, translateFrom } from '@arenaswap/ui/src/components/i18nContext';

const mountHeader = (props: { interactive?: boolean; bossShortcut?: string; onBossButton?: () => void } = {}) => {
	cy.viewport(320, 560);
	cy.mount(
		<div className='popup-container'>
			<PopupHeader enabled interactive={props.interactive} onToggleEnabled={cy.stub()} onOpenSettings={cy.stub()} onStartTour={cy.stub()} onOpenGuide={cy.stub()} onBossButton={props.onBossButton} bossShortcut={props.bossShortcut} />
		</div>,
	);
};

describe('the boss button in the header', () => {
	it('is a labelled button that fires the handler once per click', () => {
		mountHeader({ onBossButton: cy.stub().as('boss') });
		cy.get('button[aria-label="Boss is coming"]').click();
		cy.get('@boss').should('have.been.calledOnce');
	});

	it('names the shortcut in its tooltip when the browser reports one', () => {
		mountHeader({ onBossButton: cy.stub(), bossShortcut: 'Alt+Shift+X' });
		cy.get('button[aria-label="Boss is coming"]').should('have.attr', 'title', 'Boss is coming (Alt+Shift+X)');
	});

	it('falls back to the plain name when nothing is bound', () => {
		mountHeader({ onBossButton: cy.stub() });
		cy.get('button[aria-label="Boss is coming"]').should('have.attr', 'title', 'Boss is coming');
	});

	it('is absent without a handler, the way the website renders this header', () => {
		mountHeader();
		cy.get('.bi-incognito').should('not.exist');
		cy.get('.bi-gear-fill').should('exist');
	});

	it('is inert on a header that is only being shown', () => {
		mountHeader({ onBossButton: cy.stub(), interactive: false });
		cy.get('.bi-incognito').parent().should('be.disabled').and('have.attr', 'tabindex', '-1');
	});

	it('is the same size as the other header icons and leaves the cog last', () => {
		mountHeader({ onBossButton: cy.stub() });
		cy.get('.popup-settings-button').then(($buttons: JQuery<HTMLElement>) => {
			expect($buttons).to.have.length(4);
			expect($buttons[0]!.querySelector('.bi-incognito')).to.not.equal(null);
			expect($buttons[3]!.querySelector('.bi-gear-fill')).to.not.equal(null);
			const sizes = [...$buttons].map(button => `${button.getBoundingClientRect().width}x${button.getBoundingClientRect().height}`);
			expect(new Set(sizes).size, sizes.join(' ')).to.equal(1);
		});
	});

	it('fits in the 320px popup next to the wordmark, even with a long German tooltip', () => {
		cy.viewport(320, 560);
		cy.mount(
			<TranslationContext.Provider value={translateFrom(key => {
				const [group, name] = key.split('.');
				return (de as unknown as Record<string, Record<string, string>>)[group!]?.[name!];
			})}>
				<div className='popup-container'>
					<PopupHeader enabled onToggleEnabled={cy.stub()} onOpenSettings={cy.stub()} onStartTour={cy.stub()} onOpenGuide={cy.stub()} onBossButton={cy.stub()} bossShortcut='Alt+Shift+X' />
				</div>
			</TranslationContext.Provider>,
		);
		cy.get('.popup-header').then(([header]: JQuery<HTMLElement>) => {
			expect(header!.scrollWidth).to.be.at.most(header!.clientWidth);
			const bar = header!.getBoundingClientRect();
			header!.querySelectorAll('button, input, svg').forEach(node => {
				const box = node.getBoundingClientRect();
				expect(box.right, node.tagName).to.be.at.most(bar.right + 0.5);
			});
		});
		cy.get('button[aria-label="Chef kommt"]').should('have.attr', 'title', 'Chef kommt (Alt+Shift+X)');
	});
});

const DecoyField = ({ initial = '', shortcut, onSave }: { initial?: string; shortcut?: string; onSave: (url: string) => void }) => {
	const [saved, setSaved] = useState(initial);
	return (
		<div className='popup-container p-3'>
			<BossDecoyInput value={saved} shortcut={shortcut} disabled={false} onChange={url => { setSaved(url); onSave(url); }} />
			<output data-testid='saved'>{saved}</output>
		</div>
	);
};

describe('the decoy page setting', () => {
	beforeEach(() => cy.viewport(320, 400));

	it('saves a tidy https address when the field is left', () => {
		const onSave = cy.stub().as('save');
		cy.mount(<DecoyField onSave={onSave} />);
		cy.get('#bossDecoyInput').type('docs.google.com/spreadsheets/d/abc/edit').blur();
		cy.get('@save').should('have.been.calledOnceWith', 'https://docs.google.com/spreadsheets/d/abc/edit');
		cy.get('#bossDecoyInput').should('have.value', 'https://docs.google.com/spreadsheets/d/abc/edit');
	});

	it('saves on Enter', () => {
		const onSave = cy.stub().as('save');
		cy.mount(<DecoyField onSave={onSave} />);
		cy.get('#bossDecoyInput').type('example.com/board{enter}');
		cy.get('@save').should('have.been.calledOnceWith', 'https://example.com/board');
	});

	it('does not save half an address while it is still being typed', () => {
		const onSave = cy.stub().as('save');
		cy.mount(<DecoyField onSave={onSave} />);
		cy.get('#bossDecoyInput').type('docs.goo');
		cy.get('@save').should('not.have.been.called');
	});

	it('says so and keeps the old address when what was typed is not a web address', () => {
		const onSave = cy.stub().as('save');
		cy.mount(<DecoyField initial='https://example.com/board' onSave={onSave} />);
		cy.get('#bossDecoyInput').clear().type('my budget sheet').blur();
		cy.get('#bossDecoyInput').should('have.class', 'is-invalid').and('have.attr', 'aria-invalid', 'true');
		cy.contains("That doesn't look like a web address.").should('be.visible');
		cy.get('@save').should('not.have.been.called');
		cy.get('[data-testid="saved"]').should('have.text', 'https://example.com/board');
	});

	it('takes the complaint back once the text changes', () => {
		cy.mount(<DecoyField onSave={cy.stub()} />);
		cy.get('#bossDecoyInput').type('nope nope').blur();
		cy.get('#bossDecoyInput').should('have.class', 'is-invalid');
		cy.get('#bossDecoyInput').type('x');
		cy.get('#bossDecoyInput').should('not.have.class', 'is-invalid');
	});

	it('clears the decoy when the field is emptied', () => {
		const onSave = cy.stub().as('save');
		cy.mount(<DecoyField initial='https://example.com/board' onSave={onSave} />);
		cy.get('#bossDecoyInput').clear().blur();
		cy.get('@save').should('have.been.calledOnceWith', '');
		cy.get('#bossDecoyInput').should('have.value', '');
	});

	it('shows the shortcut the browser registered, and nothing when there is none', () => {
		cy.mount(<DecoyField shortcut='Alt+Shift+X' onSave={cy.stub()} />);
		cy.contains('Shortcut: Alt+Shift+X').should('exist');
		cy.mount(<DecoyField onSave={cy.stub()} />);
		cy.contains('Shortcut:').should('not.exist');
	});

	it('is labelled for assistive tech', () => {
		cy.mount(<DecoyField onSave={cy.stub()} />);
		cy.get('label[for="bossDecoyInput"]').should('contain.text', 'Decoy page');
	});
});

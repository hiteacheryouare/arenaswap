import TabAssignSelect from '../../entrypoints/popup/components/tabAssignSelect';

const favicon = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#F75C03"/></svg>')}`;

const tabs = [
	{ id: 11, title: 'Celtics vs 76ers live', url: 'https://example.com/a', favIconUrl: favicon },
	{ id: 12, title: 'New Tab', url: 'chrome://newtab/' },
	{ id: 13, title: 'Settings', url: 'chrome://settings/', favIconUrl: '/no-such-favicon.png' },
] as any[];

const mountPicker = (registry: { tabId: number; gameId: string }[] = []) => cy.mount(
	<div className='game-card-tab-assign' style={{ width: 240 }}>
		<TabAssignSelect gameId='g1' openTabs={tabs} registry={registry as any} onChange={() => {}} formatTabLabel={tab => tab.title ?? ''} />
	</div>,
);

const menuItem = (label: string) => cy.contains('.menu-item', label);

describe('tabAssignSelect favicons', () => {
	it('shows each tab with the icon its browser tab shows, and a globe where there is none', () => {
		mountPicker();
		cy.get('.form-control-caret').click();

		menuItem('Celtics vs 76ers live').find('.tab-favicon.avatar img').should('have.attr', 'src', favicon);
		menuItem('New Tab').find('.tab-favicon .bi-globe2').should('be.visible');
		// The icon URL exists but will not load, which is what an internal page's chrome:// icon does.
		menuItem('Settings').find('.tab-favicon').should('have.attr', 'data-crest-state', 'failed');
		menuItem('Settings').find('.tab-favicon .bi-globe2').should('be.visible');
		menuItem('Settings').find('.tab-favicon img').should('not.be.visible');
	});

	it('leaves the placeholder without an icon', () => {
		mountPicker();
		cy.get('.form-control-caret').click();
		cy.get('.menu-item').first().find('.tab-favicon').should('not.exist');
	});

	it('puts the assigned tab\'s icon on the closed picker, beside its title', () => {
		mountPicker([{ tabId: 11, gameId: 'g1' }]);
		cy.get('.form-control-caret .tab-favicon img').should(([element]: JQuery<HTMLElement>) => {
			const icon = element as HTMLImageElement;
			const title = icon.closest('.form-control-caret')!.querySelector('[id$="-value"]')!.getBoundingClientRect();
			const box = icon.getBoundingClientRect();
			expect(icon.complete && icon.naturalWidth).to.be.greaterThan(0);
			expect(box.right).to.be.lessThan(title.left);
			expect(Math.abs((box.top + box.bottom) / 2 - (title.top + title.bottom) / 2)).to.be.lessThan(1.5);
		});
	});

	it('dims the icon of a tab another game already holds', () => {
		mountPicker([{ tabId: 11, gameId: 'g2' }]);
		cy.get('.form-control-caret').click();
		menuItem('Celtics vs 76ers live').find('.tab-favicon img').should('have.css', 'opacity', '0.5');
	});
});

const loadFaceOf = (selector: string) => cy.get(selector).first().then(([el]: JQuery<HTMLElement>) => el!.ownerDocument.fonts.load(getComputedStyle(el!).font, el!.textContent || 'Abc'));

const longTitle = 'Celtics vs 76ers live stream Game 7 Eastern Conference Finals replay';

describe('tabAssignSelect long titles', () => {
	it('ends a long title before the caret and keeps the full name on hover', () => {
		const longTabs = [{ id: 21, title: longTitle, url: 'https://example.com/long', favIconUrl: favicon }] as any[];
		cy.mount(
			<div className='game-card-tab-assign' style={{ width: '9.5rem' }}>
				<TabAssignSelect gameId='g1' openTabs={longTabs} registry={[{ tabId: 21, gameId: 'g1' }] as any} onChange={() => {}} formatTabLabel={tab => tab.title ?? ''} />
			</div>,
		);
		loadFaceOf('.form-control-caret');
		cy.get('.form-control-caret').should(([button]: JQuery<HTMLElement>) => {
			const value = button.querySelector('[id$="-value"]') as HTMLElement;
			const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
			const caretLeft = button.getBoundingClientRect().right - 0.75 * rem - 16;
			expect(value.scrollWidth).to.be.greaterThan(value.clientWidth);
			expect(value.getBoundingClientRect().right).to.be.at.most(caretLeft);
			expect(button.getAttribute('title')).to.equal(longTitle);
		});
	});
});

describe('tabAssignSelect open list', () => {
	it('is wider than the toggle and shows a long title whole inside a narrow popup', () => {
		cy.viewport(320, 500);
		const title = 'Celtics vs 76ers live stream';
		const tab = [{ id: 31, title, url: 'https://example.com/x' }] as any[];
		cy.mount(
			<div className='d-flex justify-content-end p-2'>
				<div className='game-card-tab-assign' style={{ width: '9.5rem' }}>
					<TabAssignSelect gameId='g1' openTabs={tab} registry={[]} onChange={() => {}} formatTabLabel={t => t.title ?? ''} />
				</div>
			</div>,
		);
		loadFaceOf('.form-control-caret');
		cy.get('.form-control-caret').click();
		cy.get('.select-dropdown-menu.show').should(([menu]: JQuery<HTMLElement>) => {
			const toggle = menu.parentElement!.querySelector('.form-control-caret')!.getBoundingClientRect();
			const rect = menu.getBoundingClientRect();
			expect(rect.width).to.be.greaterThan(toggle.width);
			const row = menu.closest('.d-flex.p-2')!;
			const rowInnerRight = row.getBoundingClientRect().right - parseFloat(getComputedStyle(row).paddingRight);
			expect(rect.right, 'menu stays inside its row').to.be.at.most(rowInnerRight);
			const label = menu.querySelectorAll('.menu-item')[1].querySelector('.text-truncate') as HTMLElement;
			expect(label.scrollWidth).to.equal(label.clientWidth);
		});
	});
});

describe('tabAssignSelect in-use hint', () => {
	it('keeps "in use" visible while a long title truncates', () => {
		const title = 'Celtics vs 76ers live stream Game 7 Eastern Conference Finals replay with extra words';
		const tab = [{ id: 41, title, url: 'https://example.com/y' }] as any[];
		cy.mount(
			<div className='game-card-tab-assign' style={{ width: '9.5rem' }}>
				<TabAssignSelect gameId='g1' openTabs={tab} registry={[{ tabId: 41, gameId: 'g2' }] as any} onChange={() => {}} formatTabLabel={t => t.title ?? ''} />
			</div>,
		);
		loadFaceOf('.form-control-caret');
		cy.get('.form-control-caret').click();
		cy.get('.select-dropdown-menu.show .menu-item').eq(1).should(([item]: JQuery<HTMLElement>) => {
			const label = item.querySelector('.text-truncate') as HTMLElement;
			const hint = item.querySelector('.fg-secondary') as HTMLElement;
			expect(label.scrollWidth).to.be.greaterThan(label.clientWidth);
			expect(hint.textContent!.trim()).to.not.equal('');
			expect(hint.scrollWidth).to.equal(hint.clientWidth);
			expect(hint.getBoundingClientRect().right).to.be.at.most(item.getBoundingClientRect().right);
		});
	});
});

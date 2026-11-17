import { PopupHeader } from '@arenaswap/ui/src/components/popupChrome';
import de from '../../../locales/de.json';
import en from '../../../locales/en.json';
import es from '../../../locales/es.json';
import fil from '../../../locales/fil.json';
import fr from '../../../locales/fr.json';
import itLocale from '../../../locales/it.json';
import ja from '../../../locales/ja.json';
import ko from '../../../locales/ko.json';
import ptBR from '../../../locales/pt_BR.json';
import ptPT from '../../../locales/pt_PT.json';
import zhCN from '../../../locales/zh_CN.json';
import zhTW from '../../../locales/zh_TW.json';

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

const mountHeader = (props: { interactive?: boolean; onOpenGuide?: () => void } = {}) => {
	const { interactive = true, onOpenGuide = cy.stub().as('onOpenGuide') } = props;
	cy.viewport(320, 560);
	cy.mount(
		<div className='popup-container'>
			<PopupHeader enabled interactive={interactive} onToggleEnabled={cy.stub()} onOpenSettings={cy.stub()} onStartTour={cy.stub()} onOpenGuide={onOpenGuide} />
		</div>,
	);
};

describe('the guide button', () => {
	it('opens the guide when clicked', () => {
		mountHeader();
		cy.get('.bi-calendar-week').parent().click();
		cy.get('@onOpenGuide').should('have.been.calledOnce');
	});

	it('is absent entirely when no handler is supplied', () => {
		cy.viewport(320, 560);
		cy.mount(
			<div className='popup-container'>
				<PopupHeader enabled onToggleEnabled={cy.stub()} onOpenSettings={cy.stub()} onStartTour={cy.stub()} />
			</div>,
		);
		cy.get('.bi-calendar-week').should('not.exist');
		cy.get('.bi-question-circle').should('exist');
		cy.get('.bi-gear-fill').should('exist');
	});

	it('sits before the help mark, which keeps the cog last in the row', () => {
		mountHeader();
		cy.get('.popup-settings-button').then(($buttons: JQuery<HTMLElement>) => {
			expect($buttons).to.have.length(3);
			expect($buttons[0]!.querySelector('.bi-calendar-week')).to.not.equal(null);
			expect($buttons[1]!.querySelector('.bi-question-circle')).to.not.equal(null);
			expect($buttons[2]!.querySelector('.bi-gear-fill')).to.not.equal(null);
		});
	});

	it('is inert on a header that is only being shown', () => {
		mountHeader({ interactive: false });
		cy.get('.bi-calendar-week').parent()
			.should('be.disabled')
			.and('have.attr', 'tabindex', '-1');
	});

	it('does not inherit the cog spin', () => {
		mountHeader();
		cy.get('.bi-calendar-week').parent().focus();
		cy.get('.bi-calendar-week').should(([icon]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(icon, '::before').transform).to.equal('none');
		});
	});

	it('fits the header inside 320px in every locale', () => {
		mountHeader();
		cy.get('.popup-container > div').first().then(([header]: JQuery<HTMLElement>) => {
			const label = header.querySelector('.bi-calendar-week')!.parentElement!;
			const logo = header.querySelector('.arenaswap-logo') as HTMLElement;
			for (const [name, locale] of Object.entries(locales)) {
				label.setAttribute('title', (locale.main as unknown as Record<string, string>).guideButton ?? '');
				const row = header.getBoundingClientRect();
				expect(row.width, `${name} keeps the header inside the popup`).to.be.at.most(320);
				expect(logo.getBoundingClientRect().width, `${name} leaves the wordmark room`).to.be.greaterThan(0);
			}
		});
	});

	it('does not overlap the enable switch', () => {
		mountHeader();
		cy.get('.bi-calendar-week').parent().then(([guide]: JQuery<HTMLElement>) => {
			cy.get('.switch').then(([toggle]: JQuery<HTMLElement>) => {
				expect(guide.getBoundingClientRect().right).to.be.lessThan(toggle.getBoundingClientRect().left);
			});
		});
	});
});

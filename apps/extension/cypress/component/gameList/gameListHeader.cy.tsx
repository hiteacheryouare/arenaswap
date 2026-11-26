import GameListHeader from '../../../entrypoints/popup/components/gameListHeader';
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

const fakeWorker = () => {
	const listeners: ((message: unknown) => void)[] = [];
	(window as unknown as Record<string, unknown>).browser = {
		runtime: {
			onMessage: {
				addListener: (listener: (message: unknown) => void) => { listeners.push(listener); },
				removeListener: (listener: (message: unknown) => void) => {
					const index = listeners.indexOf(listener);
					if (index >= 0) listeners.splice(index, 1);
				},
			},
		},
	};
	return (load: 'scores' | 'guide', settled: number, total: number) => {
		cy.wrap(listeners).should('have.length', 1).then(() => {
			listeners.forEach(listener => listener({ type: 'LOAD_PROGRESS', load, settled, total }));
		});
	};
};

const barWidth = () => cy.get('.popup-loading-progress').invoke('attr', 'aria-valuenow');

describe('gameListHeader loading', () => {
	it('fills a bar as leagues land and saves the last stretch for the list', () => {
		const report = fakeWorker();
		cy.mount(
			<div style={{ width: '320px', padding: '0 12px' }}>
				<GameListHeader load='scores' isLoading hasError={false} loadingMessage='Bribing the refs…' onRefresh={() => {}} />
			</div>,
		);

		cy.get('.spinner-border').should('have.attr', 'aria-hidden', 'true');
		cy.contains('Bribing the refs…').should('exist');
		barWidth().should('equal', '0');

		report('scores', 1, 4);
		barWidth().should('equal', '23');
		cy.get('.popup-loading-percent').should('have.text', '23%');

		report('scores', 4, 4);
		barWidth().should('equal', '90');
		cy.get('.popup-loading-percent').should('have.text', '90%');
	});

	it('ignores the other load and never slides back', () => {
		const report = fakeWorker();
		cy.mount(<GameListHeader load='guide' isLoading hasError={false} loadingMessage='Bribing the refs…' onRefresh={() => {}} />);

		report('guide', 2, 3);
		barWidth().should('equal', '60');

		report('scores', 3, 3);
		report('guide', 1, 3);
		barWidth().should('equal', '60');
	});
});

describe('gameListHeader error banner', () => {
	it('keeps every locale\'s message to two lines beside a one-line Retry', () => {
		cy.viewport(320, 560);
		cy.mount(
			<div style={{ width: '320px', padding: '0 12px' }}>
				<GameListHeader load='scores' isLoading={false} hasError loadingMessage='' onRefresh={() => {}} />
			</div>,
		);

		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.popup-error-banner').should(([banner]: JQuery<HTMLElement>) => {
				const message = banner.querySelector<HTMLElement>('.flex-grow-1')!;
				const retry = banner.querySelector<HTMLElement>('button')!;
				message.textContent = locale.gameListHeader.loadFailed;
				retry.textContent = locale.gameListHeader.retry;
				const lineHeight = Number.parseFloat(getComputedStyle(message).lineHeight);
				expect(message.getBoundingClientRect().height, `message fits two lines in ${name}`).to.be.at.most(lineHeight * 2 + 1);
				expect(retry.getBoundingClientRect().height, `Retry stays one line in ${name}`).to.be.at.most(lineHeight + 8);
			});
		});
	});
});

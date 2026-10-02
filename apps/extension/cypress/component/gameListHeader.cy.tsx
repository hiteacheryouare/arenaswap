import GameListHeader from '../../entrypoints/popup/components/gameListHeader';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fil from '../../locales/fil.json';
import fr from '../../locales/fr.json';
// Not `it` — that would shadow Mocha's global it() and break every test in this file.
import itLocale from '../../locales/it.json';
import ja from '../../locales/ja.json';
import ko from '../../locales/ko.json';
import ptBR from '../../locales/pt_BR.json';
import ptPT from '../../locales/pt_PT.json';
import zhCN from '../../locales/zh_CN.json';
import zhTW from '../../locales/zh_TW.json';

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

describe('gameListHeader error banner', () => {
	it('keeps every locale\'s message to two lines beside a one-line Retry', () => {
		cy.viewport(320, 560);
		cy.mount(
			<div style={{ width: '320px', padding: '0 12px' }}>
				<GameListHeader isLoading={false} hasError loadingMessage='' onRefresh={() => {}} />
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
